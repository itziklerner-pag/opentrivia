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
  console.log('✅ PUSHER API: Pusher initialized successfully with cluster:', process.env.PUSHER_CLUSTER)
} catch (error) {
  console.error('❌ PUSHER API: Error initializing Pusher:', error)
}

// Simple persistent storage using Node.js global for development
// In production, use Redis or a proper database
if (!global.gameRooms) {
  global.gameRooms = new Map()
}
if (!global.playerConnections) {
  global.playerConnections = new Map()
}

const gameRooms = global.gameRooms
const playerConnections = global.playerConnections

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  if (!pusher) {
    console.error('❌ PUSHER API: Pusher not initialized')
    console.error('❌ PUSHER API: Environment check - APP_ID:', !!process.env.PUSHER_APP_ID)
    console.error('❌ PUSHER API: Environment check - KEY:', !!process.env.PUSHER_KEY)
    console.error('❌ PUSHER API: Environment check - SECRET:', !!process.env.PUSHER_SECRET)
    console.error('❌ PUSHER API: Environment check - CLUSTER:', !!process.env.PUSHER_CLUSTER)
    return res.status(500).json({ error: 'Pusher service unavailable' })
  }

  console.log('📨 PUSHER API: Received request:', req.body)
  const { event, data } = req.body

  if (!event) {
    return res.status(400).json({ error: 'Event is required' })
  }

  try {
    await handleGameEvent(event, data, res)
  } catch (error) {
    console.error('❌ PUSHER API: Handler error:', error.message, error.stack)
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
      
    case 'manager:showLeaderboard':
      await handleShowLeaderboard(data, res)
      break
      
    case 'manager:abortQuiz':
      await handleAbortQuiz(data, res)
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
  
  console.log('✨ PUSHER API: Creating room with ID:', roomId)
  gameRooms.set(roomId, room)
  console.log('✨ PUSHER API: Room stored, total rooms now:', gameRooms.size)
  
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
  console.log('🔍 PUSHER API: handleCheckRoom called with roomId:', roomId)
  console.log('🔍 PUSHER API: Available rooms:', Array.from(gameRooms.keys()))
  console.log('🔍 PUSHER API: Total rooms:', gameRooms.size)
  const room = gameRooms.get(roomId)
  
  if (!room) {
    console.log('❌ PUSHER API: Room not found:', roomId)
    // Send error message compatible with frontend expectations
    await pusher.trigger('global', 'game:errorMessage', 'Room not found')
    return res.json({ success: false, error: 'Room not found' })
  }
  
  console.log('✅ PUSHER API: Room found, sending game:successRoom event for roomId:', roomId)
  // Send game:successRoom to both global and room-specific channels to ensure delivery
  let globalResult, roomResult
  try {
    console.log('🚀 PUSHER API: Triggering game:successRoom on global channel...')
    globalResult = await pusher.trigger('global', 'game:successRoom', roomId)
    console.log('✅ PUSHER API: Global trigger result:', globalResult)
    
    console.log(`🚀 PUSHER API: Triggering game:successRoom on room-${roomId} channel...`)
    roomResult = await pusher.trigger(`room-${roomId}`, 'game:successRoom', roomId)
    console.log('✅ PUSHER API: Room trigger result:', roomResult)
  } catch (error) {
    console.error('❌ PUSHER API: Error triggering events:', error.message, error.body)
    return res.json({ success: false, error: 'Failed to send Pusher events', details: error.message })
  }
  
  res.json({ success: true, roomId, room, debug: { globalResult, roomResult } })
}

async function handlePlayerJoin({ username, room: roomId }, res) {
  console.log('🎮 PUSHER API: handlePlayerJoin called with username:', username, 'roomId:', roomId)
  
  // Validate inputs
  if (!username || !roomId) {
    console.log('❌ PUSHER API: Invalid input - username:', username, 'roomId:', roomId)
    return res.json({ success: false, error: 'Username and room ID are required' })
  }
  
  const room = gameRooms.get(roomId)
  
  if (!room) {
    console.log('❌ PUSHER API: Room not found for join:', roomId)
    await pusher.trigger('global', 'game:errorMessage', 'Room not found')
    return res.json({ success: false, error: 'Room not found' })
  }
  
  // Check if username already exists
  if (room.players.find(p => p.username === username)) {
    console.log('❌ PUSHER API: Username already exists:', username)
    await pusher.trigger('global', 'game:errorMessage', 'Username already exists')
    return res.json({ success: false, error: 'Username already exists' })
  }
  
  const playerId = generatePlayerId()
  const player = {
    id: playerId,
    username,
    room: roomId,
    points: 0
  }
  
  room.players.push(player)
  gameRooms.set(roomId, room)
  
  console.log('✅ PUSHER API: Player joined successfully, sending game:successJoin event')
  console.log('🔍 PUSHER API: Room after player join - Total players:', room.players.length)
  console.log('🔍 PUSHER API: Room stored successfully, available rooms:', Array.from(gameRooms.keys()))
  
  // Send success response first
  res.json({ success: true, playerId, player, room })
  
  // Try to send Pusher events, but don't fail if they don't work
  try {
    console.log('🚀 PUSHER API: Sending player join events...')
    
    // Notify the joining player - Send game:successJoin to global channel
    console.log('📡 PUSHER API: Sending game:successJoin to global channel')
    const globalResult = await pusher.trigger('global', 'game:successJoin', { success: true })
    console.log('✅ PUSHER API: Global event result:', globalResult)
    
    // Notify all players in the room
    console.log('📡 PUSHER API: Sending player:joined to room channel:', `room-${roomId}`)
    const roomResult = await pusher.trigger(`room-${roomId}`, 'player:joined', {
      player,
      room: {
        id: roomId,
        players: room.players,
        totalPlayers: room.players.length
      }
    })
    console.log('✅ PUSHER API: Room event result:', roomResult)
    
    // Notify manager - this is the critical event for UI update
    const managerChannel = `room-${roomId}-manager`
    console.log('📡 PUSHER API: Sending manager:newPlayer to manager channel:', managerChannel)
    
    // Validate channel name (Pusher has restrictions on channel names)
    if (managerChannel.length > 200) {
      throw new Error('Channel name too long')
    }
    
    const managerEventData = {
      id: player.id,
      username: player.username,
      room: roomId,
      points: player.points || 0
    }
    
    console.log('📡 PUSHER API: Manager event data:', managerEventData)
    const managerResult = await pusher.trigger(managerChannel, 'manager:newPlayer', managerEventData)
    console.log('✅ PUSHER API: Manager event result:', managerResult)
    
    console.log('✅ PUSHER API: All events sent successfully')
  } catch (error) {
    console.error('⚠️ PUSHER API: Failed to send events but player join was successful:', error.message)
    console.error('⚠️ PUSHER API: Error status:', error.status || error.statusCode || 'unknown')
    
    if (error.body) {
      console.error('⚠️ PUSHER API: Error body:', error.body)
    }
    
    if (error.response) {
      console.error('⚠️ PUSHER API: Error response:', error.response.data || error.response)
    }
    
    console.error('⚠️ PUSHER API: Full error stack:', error.stack)
    console.error('⚠️ PUSHER API: Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
  }
}

async function handleStartGame({ roomId }, res) {
  console.log('🎮 PUSHER API: handleStartGame called with roomId:', roomId)
  console.log('🔍 PUSHER API: Available rooms at start:', Array.from(gameRooms.keys()))
  console.log('🔍 PUSHER API: Total rooms:', gameRooms.size)
  
  const room = gameRooms.get(roomId)
  
  if (!room) {
    console.log('❌ PUSHER API: Room not found for start game:', roomId)
    return res.json({ success: false, error: 'Room not found' })
  }
  
  console.log('✅ PUSHER API: Room found for game start:', roomId, 'Players:', room.players.length)
  
  // Update room state
  room.started = true
  room.currentQuestion = 0
  room.roundStartTime = Date.now()
  gameRooms.set(roomId, room)
  
  // Send game status update to manager - transition to first question
  const gameStatus = {
    name: 'SHOW_QUESTION',
    data: {
      inviteCode: roomId,
      question: room.questions[0].question,
      image: room.questions[0].image,
      cooldown: 3 // Show question for 3 seconds before moving to answers
    },
    question: 1
  }
  
  console.log('📡 PUSHER API: Sending game:status to manager:', gameStatus)
  await pusher.trigger(`room-${roomId}-manager`, 'game:status', gameStatus)
  
  // Start the game for all players
  await pusher.trigger(`room-${roomId}`, 'game:started', {
    room,
    question: room.questions[0]
  })
  
  // Auto-advance to answer selection after a brief delay to show question
  setTimeout(async () => {
    const selectAnswerStatus = {
      name: 'SELECT_ANSWER',
      data: {
        inviteCode: roomId,
        question: room.questions[0].question,
        answers: room.questions[0].answers,
        image: room.questions[0].image,
        time: room.questions[0].time
      },
      question: 1
    }
    
    console.log('📡 PUSHER API: Transitioning to SELECT_ANSWER:', selectAnswerStatus)
    await pusher.trigger(`room-${roomId}-manager`, 'game:status', selectAnswerStatus)
    await pusher.trigger(`room-${roomId}`, 'question:started', {
      room: gameRooms.get(roomId),
      question: room.questions[0]
    })
  }, 3000) // 3 second delay to show question
  
  // Auto-advance to results after question time
  setTimeout(async () => {
    const resultsStatus = {
      name: 'SHOW_RESPONSES',
      data: {
        inviteCode: roomId,
        question: room.questions[0].question,
        answers: room.questions[0].answers,
        image: room.questions[0].image,
        time: room.questions[0].time,
        responses: calculateResponses(gameRooms.get(roomId).playersAnswer, room.questions[0].answers.length),
        correct: room.questions[0].solution
      },
      question: 1
    }
    
    console.log('📡 PUSHER API: Transitioning to SHOW_RESPONSES:', resultsStatus)
    await pusher.trigger(`room-${roomId}-manager`, 'game:status', resultsStatus)
    await pusher.trigger(`room-${roomId}`, 'question:results', {
      room: gameRooms.get(roomId)
    })
  }, (3000 + room.questions[0].time * 1000)) // Question display + answer time
  
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
  console.log('🎮 PUSHER API: handleNextQuestion called with roomId:', roomId)
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
      player.points = (player.points || 0) + Math.floor(1000 + timeBonus)
    }
  })
  
  room.currentQuestion++
  room.playersAnswer = []
  room.roundStartTime = Date.now()
  
  gameRooms.set(roomId, room)
  
  if (room.currentQuestion >= room.questions.length) {
    // Game finished - show final results
    const sortedPlayers = room.players.sort((a, b) => (b.points || 0) - (a.points || 0))
    const finalStatus = {
      name: 'FINISH',
      data: {
        inviteCode: roomId,
        subject: room.subject || 'Quiz Results',
        top: sortedPlayers.slice(0, 3), // Top 3 for podium
        leaderboard: sortedPlayers
      },
      question: room.currentQuestion
    }
    
    console.log('🏆 PUSHER API: Game finished, sending final results:', finalStatus)
    await pusher.trigger(`room-${roomId}-manager`, 'game:status', finalStatus)
    await pusher.trigger(`room-${roomId}`, 'game:finished', {
      room,
      leaderboard: room.players.sort((a, b) => (b.points || 0) - (a.points || 0))
    })
  } else {
    // Next question - show question first
    const nextQuestion = room.questions[room.currentQuestion]
    
    setTimeout(async () => {
      const questionStatus = {
        name: 'SHOW_QUESTION',
        data: {
          inviteCode: roomId,
          question: nextQuestion.question,
          image: nextQuestion.image,
          cooldown: 3
        },
        question: room.currentQuestion + 1
      }
      
      console.log('📡 PUSHER API: Showing next question:', questionStatus)
      await pusher.trigger(`room-${roomId}-manager`, 'game:status', questionStatus)
      await pusher.trigger(`room-${roomId}`, 'question:started', {
        room,
        question: nextQuestion
      })
      
      // Auto-advance to answer selection
      setTimeout(async () => {
        const selectAnswerStatus = {
          name: 'SELECT_ANSWER',
          data: {
            inviteCode: roomId,
            question: nextQuestion.question,
            answers: nextQuestion.answers,
            image: nextQuestion.image,
            time: nextQuestion.time
          },
          question: room.currentQuestion + 1
        }
        
        console.log('📡 PUSHER API: Transitioning to SELECT_ANSWER:', selectAnswerStatus)
        await pusher.trigger(`room-${roomId}-manager`, 'game:status', selectAnswerStatus)
      }, 3000)
      
      // Auto-advance to results after question time
      setTimeout(async () => {
        const resultsStatus = {
          name: 'SHOW_RESPONSES',
          data: {
            inviteCode: roomId,
            question: nextQuestion.question,
            answers: nextQuestion.answers,
            image: nextQuestion.image,
            time: nextQuestion.time,
            responses: calculateResponses(gameRooms.get(roomId).playersAnswer, nextQuestion.answers.length),
            correct: nextQuestion.solution
          },
          question: room.currentQuestion + 1
        }
        
        console.log('📡 PUSHER API: Transitioning to SHOW_RESPONSES:', resultsStatus)
        await pusher.trigger(`room-${roomId}-manager`, 'game:status', resultsStatus)
        await pusher.trigger(`room-${roomId}`, 'question:results', {
          room: gameRooms.get(roomId)
        })
      }, (3000 + nextQuestion.time * 1000))
      
    }, question.cooldown * 1000)
  }
  
  res.json({ success: true, room })
}

function calculateResponses(playersAnswer, totalAnswers) {
  const responses = {}
  
  // Initialize all answer options to 0
  for (let i = 0; i < totalAnswers; i++) {
    responses[i] = 0
  }
  
  // Count actual responses
  playersAnswer.forEach(answer => {
    if (answer.answerIndex >= 0 && answer.answerIndex < totalAnswers) {
      responses[answer.answerIndex] = (responses[answer.answerIndex] || 0) + 1
    }
  })
  
  return responses
}

function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase()
}

async function handleShowLeaderboard({ roomId }, res) {
  console.log('🏆 PUSHER API: handleShowLeaderboard called with roomId:', roomId)
  const room = gameRooms.get(roomId)
  
  if (!room) {
    return res.json({ success: false, error: 'Room not found' })
  }
  
  const leaderboardStatus = {
    name: 'SHOW_LEADERBOARD',
    data: {
      inviteCode: roomId,
      leaderboard: room.players.sort((a, b) => (b.points || 0) - (a.points || 0)),
      currentQuestion: room.currentQuestion
    },
    question: room.currentQuestion + 1
  }
  
  console.log('📡 PUSHER API: Showing leaderboard:', leaderboardStatus)
  await pusher.trigger(`room-${roomId}-manager`, 'game:status', leaderboardStatus)
  await pusher.trigger(`room-${roomId}`, 'leaderboard:show', {
    room,
    leaderboard: room.players.sort((a, b) => (b.points || 0) - (a.points || 0))
  })
  
  res.json({ success: true, room })
}

async function handleAbortQuiz({ roomId }, res) {
  console.log('⚠️ PUSHER API: handleAbortQuiz called with roomId:', roomId)
  const room = gameRooms.get(roomId)
  
  if (!room) {
    return res.json({ success: false, error: 'Room not found' })
  }
  
  // Skip to results immediately
  const currentQ = room.questions[room.currentQuestion]
  const resultsStatus = {
    name: 'SHOW_RESPONSES',
    data: {
      inviteCode: roomId,
      question: currentQ.question,
      answers: currentQ.answers,
      image: currentQ.image,
      time: currentQ.time,
      responses: calculateResponses(room.playersAnswer, currentQ.answers.length),
      correct: currentQ.solution
    },
    question: room.currentQuestion + 1
  }
  
  console.log('📡 PUSHER API: Aborting quiz, showing results:', resultsStatus)
  await pusher.trigger(`room-${roomId}-manager`, 'game:status', resultsStatus)
  await pusher.trigger(`room-${roomId}`, 'question:results', {
    room
  })
  
  res.json({ success: true, room })
}

function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9)
}