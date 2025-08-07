# Code Style & Conventions

## JavaScript/React Conventions
- **ES6+ Syntax**: Uses modern JavaScript features
- **React Functional Components**: All components use function syntax with hooks
- **State Management**: React Context pattern for global state (Player, Socket)
- **Naming**: 
  - Components: PascalCase (e.g., `ManagerPassword.jsx`)
  - Files: kebab-case for utilities, PascalCase for components
  - Socket events: `namespace:action` format (e.g., `player:join`, `game:successRoom`)

## File Structure
- **Pages**: `/src/pages/` - Next.js routing
- **Components**: `/src/components/` - Reusable UI components 
- **Context**: `/src/context/` - React Context providers
- **Socket Logic**: `/socket/` - Server-side game logic organized by roles
- **Assets**: `/src/assets/` - Images and static resources

## Socket Architecture
- **Role-based handlers**: Separate files for Manager and Player logic
- **Event naming**: Consistent `namespace:action` pattern
- **Error handling**: Centralized error emission via `game:errorMessage`
- **State management**: Single `gameState` object with deep cloning

## Styling
- **Tailwind CSS**: Primary styling framework
- **Custom colors**: Primary color scheme defined
- **Responsive**: Mobile-first responsive design
- **Typography**: Montserrat font family

## Configuration
- **Config file**: `config.mjs` for environment-specific settings
- **WebSocket URLs**: Configurable via `WEBSOCKET_PUBLIC_URL`
- **Game logic**: Quiz questions and settings in `QUIZZ_CONFIG`