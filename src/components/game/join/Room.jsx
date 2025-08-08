import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { usePusherContext } from "@/context/pusher"

export default function Room() {
  const { socket } = usePusherContext()
  const { player, dispatch } = usePlayerContext()
  const [roomId, setRoomId] = useState("")

  const handleSuccessRoom = (validatedRoomId) => {
    console.log("✅ Room validated successfully:", validatedRoomId)
    // Create a proper player object with the room set
    dispatch({ 
      type: "JOIN", 
      payload: { room: validatedRoomId }
    })
  }

  const handleLogin = async () => {
    if (!roomId || roomId.length === 0) {
      return
    }
    
    if (!socket) {
      return
    }
    
    console.log("🔍 Checking room:", roomId)
    
    // Emit PIN check and get API response
    const apiResult = await socket.emit("player:checkRoom", roomId)
    
    // If successful, trigger the state change to show Username component
    if (apiResult && apiResult.success) {
      handleSuccessRoom(apiResult.roomId)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin()
    }
  }

  useEffect(() => {
    if (socket) {
      socket.join("global")
      
      // Listen for Pusher events as backup/primary method
      socket.on("game:successRoom", handleSuccessRoom)
      
      return () => {
        socket.off("game:successRoom", handleSuccessRoom)
      }
    }
  }, [socket])

  return (
    <Form>
      <Input
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="PIN Code here"
      />
      <Button onClick={() => handleLogin()}>Submit</Button>
    </Form>
  )
}
