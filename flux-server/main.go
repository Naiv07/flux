package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Upgrader converts HTTP connection to WebSocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now
	},
}

// Client represents a connected peer
type Client struct {
	conn     *websocket.Conn
	roomCode string
	send     chan []byte
}

// Message structure between peers
type Message struct {
	Type     string          `json:"type"`
	RoomCode string          `json:"roomCode"`
	Data     json.RawMessage `json:"data"`
}

// Room holds two peers maximum
type Room struct {
	clients []*Client
	mu      sync.Mutex
}

// Hub manages all active rooms
type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		rooms: make(map[string]*Room),
	}
}

// Get or create a room by code
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

// Remove room when empty
func (h *Hub) removeRoom(code string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.rooms, code)
}

// Add client to room — max 2 peers
func (r *Room) addClient(client *Client) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if len(r.clients) >= 2 {
		return false // Room full
	}

	r.clients = append(r.clients, client)
	return true
}

// Remove client from room
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

// Broadcast message to the other peer in the room
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

// Handle each WebSocket connection
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

			// Notify other peer
			leaveMsg, _ := json.Marshal(Message{
				Type:     "peer-left",
				RoomCode: client.roomCode,
			})
			room.broadcast(client, leaveMsg)

			// Clean up empty room
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

	// Write pump — sends messages to this client
	go func() {
		for msg := range client.send {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				break
			}
		}
	}()

	log.Println("New client connected")

	// Read pump — receives messages from this client
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
			// Client joining a room with a code
			client.roomCode = msg.RoomCode
			room := hub.getOrCreateRoom(msg.RoomCode)

			if !room.addClient(client) {
				// Room full
				errMsg, _ := json.Marshal(Message{Type: "room-full"})
				client.send <- errMsg
				return
			}

			log.Printf("Client joined room: %s", msg.RoomCode)

			// Notify other peer someone joined
			joinedMsg, _ := json.Marshal(Message{
				Type:     "peer-joined",
				RoomCode: msg.RoomCode,
			})
			room.broadcast(client, joinedMsg)

		case "offer", "answer", "ice-candidate":
			// WebRTC signaling — forward to the other peer
			if client.roomCode != "" {
				room := hub.getOrCreateRoom(client.roomCode)
				room.broadcast(client, rawMsg)
				log.Printf("Forwarded %s in room %s", msg.Type, client.roomCode)
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleConnection)

	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Flux signaling server running"))
	})

	log.Println("Flux signaling server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("Server error:", err)
	}
}