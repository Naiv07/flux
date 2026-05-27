# Flux ⚡

**No cloud. Just connection.**

A cross-platform P2P file sharing PWA built with React, WebRTC, and Go.

## Live App
🚀 [flux-wheat-tau.vercel.app](https://flux-wheat-tau.vercel.app)

## Features
- 📁 Send files of any size, any type
- 🔒 End-to-end encrypted via WebRTC DTLS
- 🌐 Works across different networks
- 📶 WebSocket relay fallback for restricted networks
- 📱 Installable PWA on Android
- 🔍 Discover nearby devices on same network
- ⚡ No account, no cloud, no tracking

## How It Works
1. Sender taps "Send Files" → gets a 6-character room code
2. Receiver enters the code → devices connect via WebRTC
3. If direct connection fails → automatically falls back to server relay
4. Files transfer directly between devices

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Inline styles + Framer Motion
- **3D Background**: Three.js + React Three Fiber
- **P2P**: WebRTC DataChannel
- **Signaling**: Go + WebSocket (gorilla/websocket)
- **Deployment**: Vercel (frontend) + Render (signaling server)

## Local Development

### Frontend
```
cd flux-web
npm install
npm run dev
```

### Signaling Server
```
cd flux-server
go run main.go
```

## Architecture
```
Sender → WebSocket Signaling → Receiver
         (offer/answer/ICE)

If WebRTC fails:
Sender → Go Relay Server → Receiver
         (binary WebSocket)
```

## Built By
Naiv07 — BCA Graduate, Presidency College Bengaluru
