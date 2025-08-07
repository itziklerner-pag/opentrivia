import { createContext, useContext, useEffect, useState, useRef } from "react"
import { WEBSOCKET_PUBLIC_URL } from "../../config.mjs"

export const WebSocketContext = createContext()

export const WebSocketContextProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const eventHandlers = useRef({})

  useEffect(() => {
    const wsUrl = WEBSOCKET_PUBLIC_URL.replace('http://', 'ws://').replace('https://', 'wss://')
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      setConnected(true)
      if (eventHandlers.current.connect) {
        eventHandlers.current.connect()
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (eventHandlers.current[data.type]) {
          eventHandlers.current[data.type](data.payload)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      if (eventHandlers.current.disconnect) {
        eventHandlers.current.disconnect()
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    // Create Socket.IO-like interface
    const socketInterface = {
      emit: (type, payload) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type, payload }))
        }
      },
      on: (event, handler) => {
        eventHandlers.current[event] = handler
      },
      off: (event) => {
        delete eventHandlers.current[event]
      },
      connected,
      disconnect: () => ws.close()
    }

    setSocket(socketInterface)

    return () => {
      ws.close()
    }
  }, [])

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  return { socket: context }
}