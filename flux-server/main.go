package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024 * 1024, // 1MB
	WriteBufferSize: 1024 * 1024, // 1MB
}

type Client struct {
	conn        *websocket.Conn
	roomCode    string
	send        chan []byte
	connectedAt time.Time
	isRelay     bool
}

type Message struct {
	Type     string          `json:"type"`
	RoomCode string          `json:"roomCode"`
	Data     json.RawMessage `json:"data"`
}

type Room struct {
	clients   []*Client
	createdAt time.Time
	mu        sync.Mutex
}

type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func newHub() *Hub {
	h := &Hub{rooms: make(map[string]*Room)}
	go func() {
		for range time.Tick(5 * time.Minute) {
			h.cleanup()
		}
	}()
	return h
}

func (h *Hub) cleanup() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for code, room := range h.rooms {
		room.mu.Lock()
		age := time.Since(room.createdAt)
		empty := len(room.clients) == 0
		room.mu.Unlock()
		if empty || age > 10*time.Minute {
			delete(h.rooms, code)
			log.Printf("Cleaned up room: %s", code)
		}
	}
}

func (h *Hub) getOrCreateRoom(code string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, exists := h.rooms[code]; exists {
		return room
	}
	room := &Room{createdAt: time.Now()}
	h.rooms[code] = room
	return room
}

func (h *Hub) getRoom(code string) *Room {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.rooms[code]
}

func (h *Hub) removeRoom(code string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.rooms, code)
}

func (r *Room) addClient(client *Client) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.clients) >= 2 {
		return false
	}
	r.clients = append(r.clients, client)
	return true
}

func (r *Room) removeClient(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i, c := range r.clients {
		if c == client {
			r.clients = append(r.clients[:i], r.clients[i+1:]...)
			break
		}
	}
}

func (r *Room) broadcast(sender *Client, message []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, client := range r.clients {
		if client != sender {
			select {
			case client.send <- message:
			default:
				log.Println("Send buffer full — dropping")
			}
		}
	}
}

func (r *Room) count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.clients)
}

var hub = newHub()

func handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	conn.SetReadLimit(2 * 1024 * 1024) // 2MB max message
	conn.SetReadDeadline(time.Now().Add(120 * time.Second))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(120 * time.Second))
		return nil
	})

	client := &Client{
		conn:        conn,
		send:        make(chan []byte, 1024),
		connectedAt: time.Now(),
	}

	defer func() {
		if client.roomCode != "" {
			room := hub.getRoom(client.roomCode)
			if room != nil {
				room.removeClient(client)
				leaveMsg, _ := json.Marshal(map[string]string{
					"type":     "peer-left",
					"roomCode": client.roomCode,
				})
				room.broadcast(client, leaveMsg)
				if room.count() == 0 {
					hub.removeRoom(client.roomCode)
					log.Printf("Room removed: %s", client.roomCode)
				}
			}
		}
		close(client.send)
		conn.Close()
		log.Println("Client disconnected")
	}()

	// Write pump
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case msg, ok := <-client.send:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if !ok {
					conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-ticker.C:
				conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	log.Println("New client connected")

	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			break
		}
		conn.SetReadDeadline(time.Now().Add(120 * time.Second))

		var msg Message
		if err := json.Unmarshal(rawMsg, &msg); err != nil {
			log.Println("Invalid message:", err)
			continue
		}

		switch msg.Type {

		case "join":
			room := hub.getOrCreateRoom(msg.RoomCode)
			if !room.addClient(client) {
				errMsg, _ := json.Marshal(map[string]string{"type": "room-full"})
				client.send <- errMsg
				return
			}
			client.roomCode = msg.RoomCode
			log.Printf("Client joined room: %s (peers: %d)", msg.RoomCode, room.count())
			joinedMsg, _ := json.Marshal(map[string]string{
				"type":     "peer-joined",
				"roomCode": msg.RoomCode,
			})
			room.broadcast(client, joinedMsg)
			okMsg, _ := json.Marshal(map[string]interface{}{
				"type":  "joined",
				"peers": room.count(),
			})
			client.send <- okMsg

		case "offer", "answer", "ice-candidate":
			if client.roomCode != "" {
				room := hub.getOrCreateRoom(client.roomCode)
				room.broadcast(client, rawMsg)
				log.Printf("Forwarded %s in room %s", msg.Type, client.roomCode)
			}

		case "ready":
			if client.roomCode != "" {
				room := hub.getOrCreateRoom(client.roomCode)
				readyMsg, _ := json.Marshal(map[string]string{"type": "peer-ready"})
				room.broadcast(client, readyMsg)
			}

		// ── WebSocket relay mode ─────────────────────────────────────────────
		case "relay-request":
			if client.roomCode != "" {
				room := hub.getOrCreateRoom(client.roomCode)

				// Lock once for the entire operation
				room.mu.Lock()
				client.isRelay = true
				peerCount := len(room.clients)
				room.mu.Unlock()

				log.Printf("Relay requested in room %s (peers: %d)", client.roomCode, peerCount)

				relayMsg, _ := json.Marshal(map[string]interface{}{
					"type":  "relay-start",
					"peers": peerCount,
				})
				room.broadcast(client, relayMsg)

				confirmMsg, _ := json.Marshal(map[string]interface{}{
					"type":  "relay-ready",
					"peers": peerCount,
				})
				client.send <- confirmMsg
			}

		case "relay-data":
			// Raw data relay between peers — forward as-is
			if client.roomCode != "" && client.isRelay {
				room := hub.getRoom(client.roomCode)
				if room != nil {
					room.broadcast(client, rawMsg)
				}
			}

		case "ping":
			pongMsg, _ := json.Marshal(map[string]string{"type": "pong"})
			client.send <- pongMsg

		case "discover":
			hub.mu.RLock()
			available := make([]map[string]interface{}, 0)
			for code, room := range hub.rooms {
				room.mu.Lock()
				waiting := len(room.clients) == 1
				age := time.Since(room.createdAt).Seconds()
				room.mu.Unlock()
				if waiting && age < 300 {
					available = append(available, map[string]interface{}{
						"code": code,
						"age":  int(age),
					})
				}
			}
			hub.mu.RUnlock()
			discoverMsg, _ := json.Marshal(map[string]interface{}{
				"type":  "available-rooms",
				"rooms": available,
			})
			client.send <- discoverMsg
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleConnection)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		hub.mu.RLock()
		rooms := len(hub.rooms)
		hub.mu.RUnlock()
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "ok",
			"rooms":  rooms,
		})
	})
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Flux signaling server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("Server error:", err)
	}
}