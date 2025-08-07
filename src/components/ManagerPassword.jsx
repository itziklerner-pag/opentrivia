import Image from "next/image"
import { usePlayerContext } from "@/context/player"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import { useEffect, useState } from "react"
import { usePusherContext } from "@/context/pusher"
import logo from "@/assets/logo.svg"
import toast from "react-hot-toast"

export default function ManagerPassword() {
  const { socket } = usePusherContext()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")

  const handleCreate = async () => {
    setLoading(true)
    try {
      const result = await socket.emit("manager:createRoom", password)
      if (result.success) {
        // Success will be handled by the room:created event
        console.log('Room created:', result.roomId)
      } else {
        toast.error(result.error || 'Failed to create room')
      }
    } catch (error) {
      toast.error('Failed to create room')
      console.error('Error creating room:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleCreate()
    }
  }

  useEffect(() => {
    socket.on("game:errorMessage", (message) => {
      toast.error(message)
    })

    return () => {
      socket.off("game:errorMessage")
    }
  }, [])

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center">
      <div className="absolute h-full w-full overflow-hidden">
        <div className="absolute -left-[15vmin] -top-[15vmin] min-h-[75vmin] min-w-[75vmin] rounded-full bg-primary/15"></div>
        <div className="absolute -bottom-[15vmin] -right-[15vmin] min-h-[75vmin] min-w-[75vmin] rotate-45 bg-primary/15"></div>
      </div>

      <Image src={logo} className="mb-6 h-32" alt="logo" />

      <Form>
        <Input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Manager password"
        />
        <Button onClick={() => handleCreate()}>Submit</Button>
      </Form>
    </section>
  )
}
