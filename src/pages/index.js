import Image from "next/image"
import { Montserrat } from "next/font/google"
import Form from "@/components/Form"
import Button from "@/components/Button"
import Input from "@/components/Input"
import logo from "@/assets/logo.svg"
import { useEffect, useState } from "react"
import Loader from "@/components/Loader"
import { usePlayerContext } from "@/context/player"
import Room from "@/components/game/join/Room"
import Username from "@/components/game/join/Username"
import { usePusherContext } from "@/context/pusher"
import { useRouter } from "next/router"
import toast from "react-hot-toast"

export default function Home() {
  const { player, dispatch } = usePlayerContext()
  const { socket } = usePusherContext()
  const router = useRouter()
  const [isAutoJoining, setIsAutoJoining] = useState(false)
  const [quickJoinStarted, setQuickJoinStarted] = useState(false)

  // Simple quick join - handle URL parameters and auto-join immediately
  useEffect(() => {
    if (!router.isReady) return
    
    const { pin, name } = router.query
    console.log("Quick join check - pin:", pin, "name:", name, "player:", !!player, "isAutoJoining:", isAutoJoining, "started:", quickJoinStarted)
    
    if (pin && name && !player && !isAutoJoining && !quickJoinStarted) {
      console.log("Starting quick join with pin:", pin, "name:", name)
      setIsAutoJoining(true)
      setQuickJoinStarted(true)
      
      const handleSuccessRoom = (roomId) => {
        console.log("✅ Room found:", roomId, "joining with name:", name)
        dispatch({ type: "JOIN", payload: roomId })
        console.log("🔄 Emitting player:join with:", { username: name, room: roomId })
        socket.emit("player:join", { username: name, room: roomId })
      }
      
      const handleSuccessJoin = () => {
        console.log("🎉 Join successful! Logging in and redirecting")
        dispatch({ type: "LOGIN", payload: name })
        setIsAutoJoining(false)
        router.push("/game")
        // Clean up after success
        socket.off("game:successRoom", handleSuccessRoom)
        socket.off("game:successJoin", handleSuccessJoin)
        socket.off("game:errorMessage", handleError)
      }
      
      const handleError = (message) => {
        console.log("❌ Join failed:", message)
        toast.error(message)
        setIsAutoJoining(false)
        // Clean up after error
        socket.off("game:successRoom", handleSuccessRoom)
        socket.off("game:successJoin", handleSuccessJoin)
        socket.off("game:errorMessage", handleError)
      }
      
      console.log("📡 Setting up socket listeners for quick join")
      console.log("🔌 Socket connected:", socket.connected, "Socket ID:", socket.id)
      
      // Listen for ANY events to debug
      socket.onAny((eventName, ...args) => {
        console.log("🔍 ANY socket event received:", eventName, args)
        if (eventName === "game:successRoom") {
          console.log("🎯 successRoom event details:", args[0])
          handleSuccessRoom(args[0])
        }
      })
      
      // Test if socket is receiving events at all
      socket.on("game:successRoom", (roomId) => {
        console.log("🎯 RAW successRoom event received:", roomId)
        handleSuccessRoom(roomId)
      })
      
      socket.on("game:successJoin", () => {
        console.log("🎯 RAW successJoin event received")
        handleSuccessJoin()
      })
      
      socket.on("game:errorMessage", (message) => {
        console.log("🎯 RAW errorMessage event received:", message)
        handleError(message)
      })
      
      // Wait for socket connection if needed
      if (socket.connected) {
        console.log("✅ Socket already connected, emitting checkRoom for pin:", pin)
        socket.emit("player:checkRoom", pin)
      } else {
        console.log("⚠️ Socket not connected, waiting for connection...")
        socket.on("connect", () => {
          console.log("✅ Socket connected! Socket ID now:", socket.id)
          console.log("🚀 Emitting checkRoom for pin:", pin)
          socket.emit("player:checkRoom", pin)
          
          // Add timeout to check if we receive a response
          setTimeout(() => {
            console.log("⏰ 5 seconds after emit - checking if we got response...")
            console.log("🔍 Socket still connected:", socket.connected, "ID:", socket.id)
          }, 5000)
        })
      }
    }
  }, [router.isReady, router.query, player, isAutoJoining, quickJoinStarted])

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

      {isAutoJoining ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white text-lg">Joining game...</p>
          <p className="text-white/70 text-sm mt-2">Please wait</p>
        </div>
      ) : !player ? (
        <Room />
      ) : (
        <Username />
      )}
    </section>
  )
}