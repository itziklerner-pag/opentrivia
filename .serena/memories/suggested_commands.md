# Essential Development Commands

## Running the Application
```bash
# Development mode (both frontend and socket server)
npm run all-dev

# Production mode  
npm run all

# Frontend only
npm run dev

# Socket server only
npm run socket
```

## Code Quality
```bash
# Lint code
npm run lint

# Format code (uses Prettier)
npx prettier --write .
```

## Testing & Debugging
```bash
# No test framework currently configured
# Manual testing via browser and socket connections

# View socket server logs
npm run socket

# Access test page
open test-quick-join.html
```

## Build & Deploy
```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Key URLs
- Manager interface: http://localhost:3000/manager
- Player interface: http://localhost:3000/
- Socket server: http://localhost:5505/ (configurable in config.mjs)
- Quick join test: http://localhost:3000/?pin=XXXXX&name=USERNAME