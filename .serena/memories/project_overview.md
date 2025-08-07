# Project Overview: Rahoot (OpenTrivia)

## Purpose
Rahoot is an open-source clone of Kahoot!, allowing users to host trivia game sessions on their own servers for smaller events. It provides real-time multiplayer quiz functionality with manager/player roles.

## Tech Stack
- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Socket.io server with custom game logic
- **Real-time Communication**: WebSocket (Socket.io)
- **Package Management**: npm (with bun.lock present)
- **Styling**: Tailwind CSS with Montserrat font
- **State Management**: React Context (Player & Socket contexts)

## Architecture
- **Entry Points**: 
  - `/src/pages/index.js` - Home page with room joining
  - `/src/pages/manager.jsx` - Manager interface for creating rooms
  - `/src/pages/game.jsx` - Game interface for players
- **Socket Server**: `./socket/index.js` with role-based handlers
- **Real-time Features**: Room creation, player joining, game flow, scoring

## Key Features
- Room creation with PIN codes
- Real-time player joining and management  
- Multi-question quizzes with scoring
- Manager controls (start game, kick players, show leaderboard)
- Quick join URLs (main focus of current work)