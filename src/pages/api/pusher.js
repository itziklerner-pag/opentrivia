import Pusher from 'pusher'
import { GAME_STATE_INIT } from '../../../config.mjs'

let pusher
try {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
  })
} catch (error) {
  console.error('Error initializing Pusher:', error)
}

// In-memory game state storage (use Redis in production)
const gameRooms = new Map()
const playerConnections = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  if (!pusher) {
    console.error('Pusher not initialized')
    return res.status(500).json({ error: 'Pusher service unavailable' })
  }

  console.log('Received request:', req.body)
  const { event, data } = req.body

  if (!event) {
    return res.status(400).json({ error: 'Event is required' })
  }

  try {
    await handleGameEvent(event, data, res)
  } catch (error) {
    console.error('Pusher API error:', error.message, error.stack)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
}

async function handleGameEvent(event, data, res) {
  switch (event) {
    case 'manager:createRoom':
      await handleCreateRoom(data, res)
      break
    
    case 'player:checkRoom':
      await handleCheckRoom(data, res)
      break
      
    case 'player:join':
      await handlePlayerJoin(data, res)
      break
      
    case 'manager:startGame':
      await handleStartGame(data, res)
      break
      
    case 'player:answer':
      await handlePlayerAnswer(data, res)
      break
      
    case 'manager:nextQuestion':
      await handleNextQuestion(data, res)
      break
      
    default:
      res.status(400).json({ error: 'Unknown event type' })
  }
}

async function handleCreateRoom(password, res) {
  const roomId = generateRoomId()
  const room = {
    ...GAME_STATE_INIT,
    room: roomId,
    password,
    players: [],
    manager: null
  }
  
  gameRooms.set(roomId, room)
  
  // Trigger room created event
  await pusher.trigger(`room-${roomId}`, 'room:created', {
    roomId,
    room
  })
  
  // Send invite code to manager (compatible with original Socket.IO interface)
  console.log('Sending manager:inviteCode to channel:', `room-${roomId}-manager`, 'with roomId:', roomId)
  await pusher.trigger(`room-${roomId}-manager`, 'manager:inviteCode', roomId)
  
  // Also send to global manager channel to ensure delivery
  await pusher.trigger('manager-global', 'manager:inviteCode', roomId)
  
  res.json({ success: true, roomId, room })
}

async function handleCheckRoom(roomId, res) {
  const room = gameRooms.get(roomId)
  
  if (!room) {
    await pusher.trigger('global', 'room:error', {
      message: 'Room not found'
    })
    return res.json({ success: false, error: 'Room not found' })
  }
  
  await pusher.trigger('global', 'room:found', {
    roomId,
    room
  })
  
  res.json({ success: true, roomId, room })
}

async function handlePlayerJoin({ username, room: roomId }, res) {
  const room = gameRooms.get(roomId)
  
  if (!room) {
    return res.json({ success: false, error: 'Room not found' })
  }
  
  const playerId = generatePlayerId()
  const player = {
    id: playerId,
    username,
    score: 0
  }
  
  room.players.push(player)
  gameRooms.set(roomId, room)
  
  // Notify all players in the room
  await pusher.trigger(`room-${roomId}`, 'player:joined', {
    player,
    room
  })
  
  // Notify manager
  await pusher.trigger(`room-${roomId}-manager`, 'manager:newPlayer', player)
  
  res.json({ success: true, playerId, player, room })
}

async function handleStartGame({ roomId }, res) {
  const room = gameRooms.get(roomId)
  
  if (!room) {
    return res.json({ success: false, error: 'Room not found' })
  }
  
  room.started = true
  room.currentQuestion = 0
  room.roundStartTime = Date.now()
  
  gameRooms.set(roomId, room)
  
  // Start the game for all players
  await pusher.trigger(`room-${roomId}`, 'game:started', {
    room,
    question: room.questions[0]
  })
  
  // Auto-advance after question time
  setTimeout(async () => {
    await pusher.trigger(`room-${roomId}`, 'question:results', {
      room: gameRooms.get(roomId)
    })
  }, room.questions[0].time * 1000)
  
  res.json({ success: true, room })
}

async function handlePlayerAnswer({ roomId, playerId, answerIndex }, res) {
  const room = gameRooms.get(roomId)
  
  if (!room) {
    return res.json({ success: false, error: 'Room not found' })
  }
  
  const existingAnswerIndex = room.playersAnswer.findIndex(
    answer => answer.playerId === playerId
  )
  
  const answerData = {
    playerId,
    answerIndex,
    time: Date.now() - room.roundStartTime
  }
  
  if (existingAnswerIndex !== -1) {
    room.playersAnswer[existingAnswerIndex] = answerData
  } else {
    room.playersAnswer.push(answerData)
  }
  
  gameRooms.set(roomId, room)
  
  // Notify all players of the answer
  await pusher.trigger(`room-${roomId}`, 'player:answered', {
    playerId,
    answerCount: room.playersAnswer.length,
    totalPlayers: room.players.length
  })
  
  res.json({ success: true })
}

async function handleNextQuestion({ roomId }, res) {
  const room = gameRooms.get(roomId)
  
  if (!room) {
    return res.json({ success: false, error: 'Room not found' })
  }
  
  // Calculate scores for current question
  const question = room.questions[room.currentQuestion]
  room.playersAnswer.forEach(answer => {
    const player = room.players.find(p => p.id === answer.playerId)
    if (player && answer.answerIndex === question.solution) {
      const timeBonus = Math.max(0, (question.time * 1000 - answer.time) / 100)
      player.score += Math.floor(1000 + timeBonus)
    }
  })
  
  room.currentQuestion++
  room.playersAnswer = []
  room.roundStartTime = Date.now()
  
  gameRooms.set(roomId, room)
  
  if (room.currentQuestion >= room.questions.length) {
    // Game finished
    await pusher.trigger(`room-${roomId}`, 'game:finished', {
      room,
      leaderboard: room.players.sort((a, b) => b.score - a.score)
    })
  } else {
    // Next question
    setTimeout(async () => {
      await pusher.trigger(`room-${roomId}`, 'question:started', {
        room,
        question: room.questions[room.currentQuestion]
      })
      
      // Auto-advance after question time
      setTimeout(async () => {
        await pusher.trigger(`room-${roomId}`, 'question:results', {
          room: gameRooms.get(roomId)
        })
      }, room.questions[room.currentQuestion].time * 1000)
      
    }, question.cooldown * 1000)
  }
  
  res.json({ success: true, room })
}

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase()
}

function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9)
}