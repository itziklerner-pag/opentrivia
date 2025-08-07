# Pusher Setup for OpenTrivia

## 1. Create Pusher Account

1. Go to [https://pusher.com/](https://pusher.com/)
2. Sign up for a free account
3. Create a new app

## 2. Get Pusher Credentials

From your Pusher dashboard, copy:
- App ID
- Key  
- Secret
- Cluster

## 3. Update Environment Variables

Update `.env.local` with your real Pusher credentials:

```env
# Pusher Configuration
PUSHER_APP_ID=your_actual_app_id
PUSHER_KEY=your_actual_pusher_key
PUSHER_SECRET=your_actual_pusher_secret  
PUSHER_CLUSTER=your_actual_cluster

# Next.js - These will be exposed to the browser
NEXT_PUBLIC_PUSHER_KEY=your_actual_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_actual_cluster
```

## 4. Deploy to Vercel

```bash
# Deploy with environment variables
vercel --prod

# Or add env vars in Vercel dashboard:
# https://vercel.com/your-username/opentrivia/settings/environment-variables
```

## 5. Test the Integration

1. Visit your deployed app
2. Create a game room as manager
3. Join as a player from another browser/device
4. Test real-time communication

## Key Changes Made

### Pusher Context (`src/context/pusher.jsx`)
- Replaces Socket.IO client with Pusher
- Maintains same API (`socket.emit`, `socket.on`)
- Handles channel subscriptions automatically

### API Route (`pages/api/pusher.js`)
- Server-side Pusher logic
- Game state management
- Event broadcasting to channels

### Game Events Mapping

| Original Event | Pusher Channel | Pusher Event |
|---|---|---|
| `manager:createRoom` | `room-{roomId}` | `room:created` |
| `player:join` | `room-{roomId}` | `player:joined` |
| `game:start` | `room-{roomId}` | `game:started` |
| `player:answer` | `room-{roomId}` | `player:answered` |

## Benefits of Pusher

✅ **No Server Required** - Fully serverless  
✅ **Auto-Scaling** - Handles any number of connections  
✅ **Built-in Analytics** - Connection and message metrics  
✅ **Global CDN** - Low latency worldwide  
✅ **Free Tier** - 100 connections, 200k messages/day  

## Pusher Free Tier Limits

- 100 concurrent connections
- 200,000 messages per day
- Unlimited channels

Perfect for testing and small-scale deployments!