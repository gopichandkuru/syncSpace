# SyncSpace

SyncSpace is a production-grade, enterprise-level collaborative SaaS platform featuring a real-time collaborative Whiteboard (similar to Excalidraw) and a collaborative Code Editor (similar to VS Code Live Share) in a single integrated experience.

Built on the **MERN Stack** (MongoDB, Express, React 19, Node.js) with **Socket.io** and **Yjs CRDT** for robust real-time synchronisation and conflict resolution.

---

## Technical Stack & Infrastructure

- **Frontend**: React 19, Vite, Tailwind CSS, Zustand, React Hook Form, TanStack Query, React-Konva, Monaco Editor, Framer Motion, Socket.io-client, Yjs
- **Backend**: Node.js, Express.js, MongoDB + Mongoose, Socket.io, JWT Authentication with refresh tokens, bcrypt, Nodemailer SMTP, Helmet, Morgan, Compression, CORS, Express-Rate-Limit
- **Real-Time Synchronisation**:
  - Collaborative drawing and shapes via Socket.io relay.
  - Collaborative code editing using Yjs CRDT document model synced via custom Socket.io relay channels.
- **Replay System**: Session updates and whiteboard history events are stored as delta logs in MongoDB and can be replayed back on a timeline scrubber on the client.

---

## Directory Structure

```
SyncSpaceProject/
├── client/                  # Vite + React 19 frontend
│   ├── src/
│   │   ├── components/      # Global reusable components (TopBar, Sidebar, Modals)
│   │   ├── context/         # Socket context providers
│   │   ├── features/        # Feature blocks (Live Chat, Canvas components)
│   │   ├── layouts/         # Page structures (Main, Auth layouts)
│   │   ├── pages/           # Route views (Dashboard, Whiteboard, Code Editor, Replay)
│   │   ├── services/        # Axios API handlers
│   │   ├── store/           # Zustand state managers (Auth, Room, Whiteboard, Editor, UI)
│   │   └── App.jsx          # Route paths
├── server/                  # Express + Node.js backend API and socket relay server
│   ├── src/
│   │   ├── config/          # JWT, Nodemailer, Cloudinary configs
│   │   ├── controllers/     # Route controller endpoints
│   │   ├── database/        # Mongoose connector
│   │   ├── events/          # Socket event constants
│   │   ├── middlewares/     # Auth checks, upload handlers, global error handling
│   │   ├── models/          # 8 MongoDB Collections schemas
│   │   ├── routes/          # REST route configurations
│   │   ├── services/        # Core business services
│   │   └── socket/          # Socket.io event loop relay bootstrap
└── README.md
```

---

## Getting Started

### 1. Prerequisite Setup

Make sure you have:
- Node.js installed (v18+)
- MongoDB connection URI (Atlas or local instance)
- SMTP Server details (like Gmail App Password) for password reset and email verification features
- Cloudinary account details for saving whiteboard snapshots and user avatars

### 2. Environment Configuration

#### Backend Configuration (`server/.env`)

Copy the template from `server/.env.example` and set the following:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/syncspace
JWT_ACCESS_SECRET=your_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="SyncSpace <noreply@syncspace.io>"
```

#### Client Configuration (`client/.env`)

Copy the template from `client/.env.example` and set:

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Installation & Running Locally

Run the following commands in separate terminals to start the servers:

#### Backend Server
```bash
cd server
npm install
npm run dev
```

#### Frontend Client
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Verification & Deployment Ready

- **To build frontend client**: `npm run build` inside `client/`
- **To test APIs/Server startup**: `node src/server.js` inside `server/`
