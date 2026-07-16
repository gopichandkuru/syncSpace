# 🚀 SyncSpace - Collaborative Workspace for Developers

<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/React-18.x-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-20.x-green?logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/MongoDB-Latest-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-4.x-black?logo=socket.io" alt="Socket" />
  
  <p><h3>Real-Time Collaborative Code Editor, Whiteboard, Video Calling & File Sharing Platform</h3></p>
  <p><strong>Live Demo:</strong> <a href="https://syncspace-frontend-05u3.onrender.com/">SyncSpace on Render</a></p>
</div>

---

## 📖 Project Overview
**SyncSpace** is an advanced MERN stack application built as a comprehensive Software-as-a-Service (SaaS) collaboration platform. Inspired by tools like VS Code Live Share, Replit, and Excalidraw, it empowers distributed engineering teams to brainstorm, write code, share files, and communicate—all in real-time within a single unified workspace.

This project is part of the **Axlero Solutions Advanced MERN Stack Engineering Program** and is strictly maintained under a professional software company workflow.

## ✨ Key Features
- **Real-Time Collaboration**: Cursor synchronization and real-time document editing powered by **Yjs** CRDTs and Socket.IO.
- **Advanced Code Editor**: Integrated **Monaco Editor** (VS Code engine) supporting syntax highlighting, auto-completion, and formatting.
- **Code Execution Engine (Run Button)**: Execute Python, Java, C++, Go, Rust, and JavaScript directly in the browser via the **Piston API** with synced console output.
- **Live HTML/CSS Preview**: Split-pane live preview for web development (`srcDoc` iframe) that instantly syncs across all participants.
- **Infinite Whiteboard**: Real-time collaborative canvas for system design and brainstorming.
- **Video & Audio Calling**: Integrated WebRTC-based peer-to-peer communication.
- **File & PDF Sharing**: Cloudinary integration for robust document and image sharing.
- **Chat & Notifications**: Persistent room chat and presence indicators.
- **Action Replay**: Time-travel debugging and session playback for whiteboard and editor events.

## 🏗️ Architecture
The platform is built using a modern, scalable architecture:
- **Frontend**: React (Vite), TailwindCSS, Zustand (State Management), Yjs (CRDTs).
- **Backend**: Node.js, Express.js, Socket.IO (WebSockets).
- **Database**: MongoDB (Mongoose ORM).
- **Storage**: Cloudinary (for avatars and file uploads).
- **Execution**: Piston API (Stateless Code Execution).

## 🚀 Tech Stack
| Category | Technology |
|---|---|
| **Frontend** | React, Tailwind CSS, Monaco Editor, Zustand, React-Hot-Toast |
| **Backend** | Node.js, Express, Socket.IO, JWT, Bcrypt |
| **Database** | MongoDB, Cloudinary |
| **Real-time** | WebSockets (Socket.IO), WebRTC, Yjs (CRDTs) |
| **DevOps** | Render (PaaS), GitHub Actions |

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Cloudinary Account

### 1. Clone the repository
```bash
git clone https://github.com/gopichandkuru/syncSpace.git
cd syncSpace
```

### 2. Backend Setup
```bash
cd server
npm install
```
Create a `.env` file in the `server` directory:
```env
PORT=5005
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=30d
CLIENT_URL=http://localhost:5173

# Cloudinary Setup
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client
npm install
```
Create a `.env` file in the `client` directory:
```env
VITE_API_URL=http://localhost:5005/api
VITE_SOCKET_URL=http://localhost:5005
```
Start the frontend development server:
```bash
npm run dev
```

## 📂 Folder Structure
```text
syncSpace/
├── client/                 # React Frontend (Vite)
│   ├── public/             # Static Assets
│   └── src/
│       ├── components/     # Reusable UI Components
│       ├── context/        # React Context (Socket, etc.)
│       ├── features/       # Feature Modules (Editor, Whiteboard, Video, etc.)
│       ├── hooks/          # Custom React Hooks
│       ├── services/       # Axios API integration
│       └── store/          # Zustand State Stores
├── server/                 # Node.js Backend
│   └── src/
│       ├── config/         # DB & Cloudinary Configuration
│       ├── controllers/    # Express Route Controllers
│       ├── events/         # Socket.IO Event Constants
│       ├── middlewares/    # Auth, Error Handling, File Uploads
│       ├── models/         # Mongoose Schemas
│       ├── routes/         # Express API Routes
│       └── socket/         # WebSocket Room Management
└── render.yaml             # Render Blueprint for Deployment
```

## 🚢 Deployment
Both the frontend and backend are deployed automatically via Render using the `render.yaml` configuration.
- Push to the `main` branch to trigger a production build.
- Environment variables are securely managed in the Render Dashboard.

## 🤝 Contributors
This project is actively maintained by:
- **@gopichandkuru** (Team Lead & Architect)
- **@yashvi-gangani** (Frontend Engineer)
- **@kunalkt5656** (Backend Engineer)
- **@malathi1945** (Database & Auth)
- **@bhagyasree31** (Real-time & WebRTC)

## 🗺️ Roadmap
- [x] JWT Authentication & Workspaces
- [x] Monaco Editor & Yjs Sync
- [x] Infinite Whiteboard
- [x] File Sharing (PDF/Images)
- [x] Code Execution Engine (Multi-language)
- [x] Live HTML/CSS Preview
- [ ] WebRTC Video & Audio (Ongoing)
- [ ] Session Replay Polish

---
<div align="center">
  <i>Built with ❤️ for the Axlero Solutions Advanced Engineering Program.</i>
</div>
