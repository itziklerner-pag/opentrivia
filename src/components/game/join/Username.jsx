import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { usePusherContext } from "@/context/pusher"
import { useRouter } from "next/router"

export default function Username() {
  const { socket } = usePusherContext()
  const { player, dispatch } = usePlayerContext()
  const router = useRouter()
  const [username, setUsername] = useState("")

  const handleJoin = async () => {
    const apiResult = await socket.emit("player:join", { username: username, room: player.room })
    
    // If successful, trigger the state change  
    if (apiResult && apiResult.success) {
      dispatch({
        type: "LOGIN",
        payload: username,
      })
      router.replace("/game")
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleJoin()
    }
  }

  // Removed useEffect - now handling join success directly in handleJoin

  return (
    <Form>
      <Input
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Username here"
      />
      <Button onClick={() => handleJoin()}>Submit</Button>
    </Form>
  )
}
