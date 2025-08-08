# 🎯 Trivia Game Testing Guide

## 🚀 Quick Start Testing

### Prerequisites
1. **Install dependencies**: `npm install`
2. **Install Playwright**: `npm run test:install` 
3. **Set up environment**: Copy `.env.local.example` to `.env.local` and add your Pusher credentials

### Run the Complete Test Suite
```bash
# Start the dev server and run all E2E tests
npm run test:e2e

# Run tests with UI (visual test runner)
npm run test:e2e:ui

# Debug tests step by step
npm run test:e2e:debug
```

## 🔧 Manual Testing Steps

### 1. Start Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`

### 2. Test Manager Flow
1. Go to `http://localhost:3000/manager`
2. Enter password: `PASSWORD`
3. Click "Create Room"
4. Note the 6-digit PIN that appears

### 3. Test Player Manual Join
1. Open new tab/window: `http://localhost:3000`
2. Enter the PIN from step 2
3. Click "Submit"
4. **CRITICAL**: Should now show username input (this was the main bug!)
5. Enter username: `TestPlayer1`
6. Click "Submit" 
7. Should redirect to `/game`

### 4. Test Player Quick Join
1. Open new tab: `http://localhost:3000/?pin=YOURPIN&name=TestPlayer2`
2. Should automatically join and redirect to `/game`

### 5. Verify Manager Dashboard
1. Go back to manager tab
2. Should see both TestPlayer1 and TestPlayer2 listed
3. Click "Start Game"
4. All player tabs should show the first question

## 🐛 What Was Fixed

### The Critical Bug
**Issue**: After entering a PIN and clicking submit, the app would not proceed to ask for username.

**Root Cause**: Event name mismatches between frontend and backend:
- Frontend expected: `game:successRoom` and `game:successJoin`
- Backend sent: `room:found` and `player:joined`

**Solution**: 
1. Fixed event names in `/src/pages/api/pusher.js`
2. Enhanced channel subscription in `/src/context/pusher.jsx`
3. Added comprehensive logging for debugging

### Files Modified
- `/src/pages/api/pusher.js` - Fixed event names and added validation
- `/src/context/pusher.jsx` - Enhanced Pusher client with better channel handling
- `/package.json` - Added Playwright testing scripts
- `/playwright.config.js` - E2E testing configuration
- `/tests/e2e/trivia-game-flow.spec.js` - Comprehensive test suite

## 🧪 Test Coverage

The Playwright tests validate:
- ✅ Manager can create rooms
- ✅ Manual player join (PIN → Username → Game)
- ✅ Quick join URLs work
- ✅ Multiple players can join simultaneously
- ✅ All players appear on manager dashboard
- ✅ Games can start successfully
- ✅ Players can answer questions
- ✅ Error handling (invalid PINs, duplicate usernames)

## 🔍 Debugging Tips

### Check Browser Console
Look for these log messages:
- `🎯 PUSHER: Event received:` - Events being received
- `✅ PUSHER API: Room found` - Successful PIN validation
- `✅ PUSHER API: Player joined` - Successful username validation

### Common Issues
1. **Pusher credentials missing**: Check `.env.local` file
2. **Events not received**: Check browser network tab for `/api/pusher` calls
3. **PIN not working**: Verify manager created room successfully
4. **Username stuck**: Check for duplicate usernames

### Test Data
- Default password: `PASSWORD` (from config.mjs)
- Test usernames: `TestPlayer1`, `TestPlayer2`, etc.
- PINs are 6-character alphanumeric codes

## 🚀 Production Considerations

### Environment Variables Required
```
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key  
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster
```

### Security Notes
- Game state stored in memory (use Redis in production)
- PIN codes are random but predictable (consider crypto.randomBytes)
- No authentication beyond PIN codes
- CORS is open (restrict in production)

## 📋 Testing Checklist

- [ ] Manager can create rooms
- [ ] PIN codes are generated and displayed
- [ ] Manual join: PIN validation works
- [ ] Manual join: Username input appears after PIN
- [ ] Manual join: Username validation works
- [ ] Quick join URLs work with pin and name parameters
- [ ] Multiple players can join the same room
- [ ] Manager sees all joined players
- [ ] Game can start with multiple players
- [ ] Players see questions when game starts
- [ ] Players can submit answers
- [ ] Game progresses through questions
- [ ] Error messages show for invalid inputs
- [ ] Duplicate usernames are rejected
- [ ] Invalid PINs are rejected