import { usePusherContext } from "@/context/pusher"
import { useEffect, useState } from "react"

export default function Room({ data: { text, inviteCode } }) {
  const { socket } = usePusherContext()
  const [playerList, setPlayerList] = useState([])

  useEffect(() => {
    console.log('Room: Setting up player event handlers for room:', inviteCode)
    
    // Subscribe to room-specific manager channel
    socket.join(`room-${inviteCode}-manager`)
    
    // Use functional updates to avoid stale closure issues
    const handleNewPlayer = (player) => {
      console.log('Room: Received manager:newPlayer:', player)
      setPlayerList(prevPlayers => {
        // Avoid duplicates
        if (prevPlayers.find(p => p.id === player.id)) {
          return prevPlayers
        }
        return [...prevPlayers, player]
      })
    }

    const handleRemovePlayer = (playerId) => {
      console.log('Room: Received manager:removePlayer:', playerId)
      setPlayerList(prevPlayers => prevPlayers.filter((p) => p.id !== playerId))
    }

    const handlePlayerKicked = (playerId) => {
      console.log('Room: Received manager:playerKicked:', playerId)
      setPlayerList(prevPlayers => prevPlayers.filter((p) => p.id !== playerId))
    }

    socket.on("manager:newPlayer", handleNewPlayer)
    socket.on("manager:removePlayer", handleRemovePlayer)
    socket.on("manager:playerKicked", handlePlayerKicked)

    return () => {
      console.log('Room: Cleaning up event handlers')
      socket.off("manager:newPlayer")
      socket.off("manager:removePlayer")
      socket.off("manager:playerKicked")
      socket.leave(`room-${inviteCode}-manager`)
    }
  }, [inviteCode, socket]) // Remove playerList from dependencies to fix stale closure

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-2">
      <div className="mb-10 rotate-3 rounded-md bg-white px-6 py-4 text-6xl font-extrabold">
        {inviteCode}
      </div>

      <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg">
        {text}
      </h2>

      <div className="flex flex-wrap gap-3">
        {playerList.map((player) => (
          <div
            key={player.id}
            className="shadow-inset rounded-md bg-primary px-4 py-3 font-bold text-white"
            onClick={() => socket.emit("manager:kickPlayer", player.id)}
          >
            <span className="cursor-pointer text-xl drop-shadow-md hover:line-through">
              {player.username}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
