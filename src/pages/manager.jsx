import Button from "@/components/Button"
import GameWrapper from "@/components/game/GameWrapper"
import ManagerPassword from "@/components/ManagerPassword"
import { GAME_STATES, GAME_STATE_COMPONENTS_MANAGER } from "@/constants"
import { usePlayerContext } from "@/context/player"
import { usePusherContext } from "@/context/pusher"
import { useRouter } from "next/router"
import { createElement, useEffect, useState } from "react"

export default function Manager() {
  const { socket } = usePusherContext()

  const [nextText, setNextText] = useState("Start")
  const [state, setState] = useState({
    ...GAME_STATES,
    created: false,
    status: {
      ...GAME_STATES.status,
      name: "SHOW_ROOM",
    },
    question: {
      ...GAME_STATES.question,
      total: 7, // Set total questions from config
    },
  })
  
  // Update button text based on current state
  useEffect(() => {
    switch (state.status.name) {
      case "SHOW_ROOM":
        setNextText("Start Game")
        break
      case "SHOW_QUESTION":
        setNextText("Skip Question")
        break
      case "SELECT_ANSWER":
        setNextText("Show Results")
        break
      case "SHOW_RESPONSES":
        setNextText("Show Leaderboard")
        break
      case "SHOW_LEADERBOARD":
        setNextText("Next Question")
        break
      case "FINISH":
        setNextText("Game Complete")
        break
      default:
        setNextText("Continue")
    }
  }, [state.status.name])

  useEffect(() => {
    console.log('Manager: Setting up event handlers')
    
    // Pre-subscribe to a global manager channel to ensure we receive events
    socket.join("manager-global")
    
    socket.on("game:status", (status) => {
      console.log('Manager: Received game:status', status)
      console.log('Manager: Previous state was:', state.status.name)
      console.log('Manager: Transitioning to:', status.name)
      setState(prevState => ({
        ...prevState,
        status: status,
        question: {
          ...prevState.question,
          current: status.question,
          total: prevState.question.total, // Preserve total questions
        },
      }))
    })

    socket.on("manager:inviteCode", (inviteCode) => {
      console.log('Manager: Received manager:inviteCode', inviteCode)
      // Subscribe to the room-specific manager channel immediately
      socket.join(`room-${inviteCode}-manager`)
      console.log('Manager: Subscribed to channel:', `room-${inviteCode}-manager`)
      
      setState(prevState => ({
        ...prevState,
        created: true,
        status: {
          ...prevState.status,
          data: {
            ...prevState.status.data,
            inviteCode: inviteCode,
          },
        },
      }))
    })

    return () => {
      socket.off("game:status")
      socket.off("manager:inviteCode")
      socket.leave("manager-global")
      // Leave room-specific channel if we have an invite code
      if (state.status.data.inviteCode) {
        socket.leave(`room-${state.status.data.inviteCode}-manager`)
      }
    }
  }, [socket])

  const handleSkip = () => {
    console.log('Manager: handleSkip called with state:', state.status.name)
    
    switch (state.status.name) {
      case "SHOW_ROOM":
        setNextText("Starting...")
        socket.emit("manager:startGame", { roomId: state.status.data.inviteCode })
        break

      case "SHOW_QUESTION":
        setNextText("Skipping...")
        // Skip directly to answers
        socket.emit("manager:abortQuiz", { roomId: state.status.data.inviteCode })
        break

      case "SELECT_ANSWER":
        setNextText("Skipping...")
        socket.emit("manager:abortQuiz", { roomId: state.status.data.inviteCode })
        break

      case "SHOW_RESPONSES":
        setNextText("Next...")
        socket.emit("manager:showLeaderboard", { roomId: state.status.data.inviteCode })
        break

      case "SHOW_LEADERBOARD":
        setNextText("Next Question...")
        socket.emit("manager:nextQuestion", { roomId: state.status.data.inviteCode })
        break
        
      case "FINISH":
        setNextText("Finished")
        // Game is complete, maybe reset or show options
        break
        
      default:
        console.log('Manager: Unknown state for handleSkip:', state.status.name)
    }
  }

  const handleRoomCreated = (roomId) => {
    console.log('Manager: Room created callback with roomId:', roomId)
    console.log('Manager: Current state before update:', state)
    setState(prevState => {
      const newState = {
        ...prevState,
        created: true,
        status: {
          ...prevState.status,
          data: {
            ...prevState.status.data,
            inviteCode: roomId,
          },
        },
      }
      console.log('Manager: New state after update:', newState)
      return newState
    })
  }

  console.log('Manager: Rendering with state.created =', state.created, 'state =', state)
  
  return (
    <>
      {!state.created ? (
        <div>
          <ManagerPassword onRoomCreated={handleRoomCreated} />
        </div>
      ) : (
        <>
          <GameWrapper textNext={nextText} onNext={handleSkip} manager>
            {GAME_STATE_COMPONENTS_MANAGER[state.status.name] &&
              createElement(GAME_STATE_COMPONENTS_MANAGER[state.status.name], {
                data: state.status.data,
              })}
          </GameWrapper>
        </>
      )}
    </>
  )
}