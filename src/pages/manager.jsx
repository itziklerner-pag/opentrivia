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
    status: {
      ...GAME_STATES.status,
      name: "SHOW_ROOM",
    },
  })

  useEffect(() => {
    console.log('Manager: Setting up event handlers')
    
    // Pre-subscribe to a global manager channel to ensure we receive events
    socket.join("manager-global")
    
    socket.on("game:status", (status) => {
      console.log('Manager: Received game:status', status)
      setState(prevState => ({
        ...prevState,
        status: status,
        question: {
          ...prevState.question,
          current: status.question,
        },
      }))
    })

    socket.on("manager:inviteCode", (inviteCode) => {
      console.log('Manager: Received manager:inviteCode', inviteCode)
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
    }
  }, [])

  const handleCreate = () => {
    socket.emit("manager:createRoom")
  }

  const handleSkip = () => {
    setNextText("Skip")

    switch (state.status.name) {
      case "SHOW_ROOM":
        socket.emit("manager:startGame")
        break

      case "SELECT_ANSWER":
        socket.emit("manager:abortQuiz")
        break

      case "SHOW_RESPONSES":
        socket.emit("manager:showLeaderboard")
        break

      case "SHOW_LEADERBOARD":
        socket.emit("manager:nextQuestion")
        break
    }
  }

  const handleRoomCreated = (roomId) => {
    console.log('Manager: Room created callback with roomId:', roomId)
    setState(prevState => ({
      ...prevState,
      created: true,
      status: {
        ...prevState.status,
        data: {
          ...prevState.status.data,
          inviteCode: roomId,
        },
      },
    }))
  }

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
