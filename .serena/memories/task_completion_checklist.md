# Task Completion Checklist

When completing any task on this project:

## Code Quality Checks
1. **Lint the code**: `npm run lint`
2. **Format code**: Use Prettier formatting (`.prettierrc.json` config)
3. **Test manually**: 
   - Start both frontend and socket server: `npm run all-dev`
   - Test manager flow at `/manager`
   - Test player flow at `/`
   - Test quick join URLs if applicable

## Functionality Testing
1. **Socket Connection**: Verify WebSocket connection works
2. **Game Flow**: Test full game lifecycle (create room → join → play → results)
3. **Error Handling**: Test error scenarios and toast notifications
4. **Real-time Updates**: Verify all real-time features work across sessions

## No Formal Test Suite
- Currently no Jest/testing framework configured
- All testing is manual via browser
- Use browser dev tools for debugging React/socket issues
- Monitor socket server console logs for backend debugging

## Deployment Considerations
- Ensure `config.mjs` has correct WebSocket URL for production
- Test both localhost and production socket connections
- Verify CORS settings for socket server