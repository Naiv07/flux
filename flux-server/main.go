package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	conn     *websocket.Conn
	roomCode string
	send     chan []byte
}

type Message struct {
	Type     string          `json:"type"`
	RoomCode string          `json:"roomCode"`
	Data     json.RawMessage `json:"data"`
}

type Room struct {
	clients []*Client
	mu      sync.Mutex
}

type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		rooms: make(map[string]*Room),
	}
}

func (h *Hub) getOrCreateRoom(code string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, exists := h.rooms[code]; exists {
		return room
	}

	room := &Room{}
	h.rooms[code] = room
	return room
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
			client.send <- message
		}
	}
}

var hub = newHub()

func handleConnection(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
	}

	defer func() {
		if client.roomCode != "" {
			room := hub.getOrCreateRoom(client.roomCode)
			room.removeClient(client)

			leaveMsg, _ := json.Marshal(Message{
				Type:     "peer-left",
				RoomCode: client.roomCode,
			})
			room.broadcast(client, leaveMsg)

			room.mu.Lock()
			empty := len(room.clients) == 0
			room.mu.Unlock()
			if empty {
				hub.removeRoom(client.roomCode)
				log.Println("Room removed:", client.roomCode)
			}
		}
		conn.Close()
		log.Println("Client disconnected")
	}()

	// Write pump
	go func() {
		for msg := range client.send {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				break
			}
		}
	}()

	log.Println("New client connected")

	// Read pump
	for {
		_, rawMsg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg Message
		if err := json.Unmarshal(rawMsg, &msg); err != nil {
			log.Println("Invalid message:", err)
			continue
		}

		switch msg.Type {

		case "join":
			client.roomCode = msg.RoomCode
			room := hub.getOrCreateRoom(msg.RoomCode)

			if !room.addClient(client) {
				errMsg, _ := json.Marshal(Message{Type: "room-full"})
				client.send <- errMsg
				return
			}

			log.Printf("Client joined room: %s", msg.RoomCode)

			joinedMsg, _ := json.Marshal(Message{
				Type:     "peer-joined",
				RoomCode: msg.RoomCode,
			})
			room.broadcast(client, joinedMsg)

		case "offer", "answer", "ice-candidate":
			if client.roomCode != "" {
				room := hub.getOrCreateRoom(client.roomCode)
				room.broadcast(client, rawMsg)
				log.Printf("Forwarded %s in room %s", msg.Type, client.roomCode)
			}

		case "ping":
			// Keep connection alive — ignore
			log.Println("Ping received")

		case "discover":
			// Return list of rooms waiting for a second peer
			log.Println("Discovery request received")

			hub.mu.RLock()
			availableRooms := make([]string, 0)
			for code, room := range hub.rooms {
				room.mu.Lock()
				waiting := len(room.clients) == 1
				room.mu.Unlock()
				if waiting {
					availableRooms = append(availableRooms, code)
				}
			}
			hub.mu.RUnlock()

			discoverMsg, _ := json.Marshal(map[string]interface{}{
				"type":  "available-rooms",
				"rooms": availableRooms,
			})
			client.send <- discoverMsg
			log.Printf("Sent %d available rooms", len(availableRooms))
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleConnection)

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Flux signaling server running"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Println("Flux signaling server starting on :" + port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("Server error:", err)
	}
}