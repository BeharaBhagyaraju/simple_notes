# Simple Notes 📝

A production-ready mobile note-taking application built with React Native (Expo) and Node.js.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo) |
| **Backend** | Node.js + Express |
| **Database** | MongoDB Atlas |
| **Deployment** | Expo (mobile) + Render (API) |

## Project Structure

```
simple_notes/
├── frontend/          # Expo React Native app
│   ├── src/
│   │   ├── screens/       # Screen components
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Utility functions
│   │   └── navigation/    # Navigation config
│   └── App.js
│
├── backend/           # Express API server
│   ├── src/
│   │   ├── config/        # Database & env config
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── models/        # Mongoose schemas
│   │   ├── middlewares/   # Auth, error handling
│   │   └── utils/         # Shared helpers
│   └── server.js
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js v18+
- npm v9+
- Expo Go app (on your mobile device)
- MongoDB Atlas account

### Backend Setup

```bash
cd backend
cp .env.example .env
# Update .env with your MongoDB Atlas URI
npm install
npm run dev
```

The server will start at `http://localhost:5000`.  
Health check: `GET http://localhost:5000/api/health`

### Frontend Setup

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go to run on your mobile device.

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | API info |
| GET | `/api/health` | Health check + DB status |

## Phases

- [x] Phase 1: Project Setup
- [ ] Phase 2: Authentication System
- [ ] Phase 3: User Notes System
- [ ] Phase 4: Filters & Search
- [ ] Phase 5: Admin Panel
- [ ] Phase 6: Extra Features
- [ ] Phase 7: UI Improvement & Deployment
