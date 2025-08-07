import { createContext, useContext, useEffect, useState, useRef } from "react"
import Pusher from "pusher-js"
import { PUSHER_CONFIG } from "../../config.mjs"

export const PusherContext = createContext()

export const PusherContextProvider = ({ children }) => {
  const [pusher, setPusher] = useState(null)
  const [connected, setConnected] = useState(false)
  const channelsRef = useRef({})
  const eventHandlersRef = useRef({})

  useEffect(() => {
    const pusherClient = new Pusher(PUSHER_CONFIG.key, {
      cluster: PUSHER_CONFIG.cluster,
      encrypted: true,
    })

    pusherClient.connection.bind('connected', () => {
      console.log('Pusher connected')
      setConnected(true)
      if (eventHandlersRef.current.connect) {
        eventHandlersRef.current.connect()
      }
    })

    pusherClient.connection.bind('disconnected', () => {
      console.log('Pusher disconnected')
      setConnected(false)
      if (eventHandlersRef.current.disconnect) {
        eventHandlersRef.current.disconnect()
      }
    })

    // Create Socket.IO-like interface
    const socketInterface = {
      emit: async (event, data) => {
        // Send to backend API route that will trigger Pusher events
        try {
          const response = await fetch('/api/pusher', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ event, data }),
          })
          
          const result = await response.json()
          
          // Auto-subscribe to room channels based on response
          if (result.roomId && event.includes('Room')) {
            console.log('Auto-subscribing to room channel:', `room-${result.roomId}`)
            socketInterface.join(`room-${result.roomId}`)
            // Also subscribe to manager channel for manager events
            if (event === 'manager:createRoom') {
              console.log('Auto-subscribing to manager channel:', `room-${result.roomId}-manager`)
              socketInterface.join(`room-${result.roomId}-manager`)
            }
          }
          
          return result
        } catch (error) {
          console.error('Error emitting to Pusher:', error)
          return { success: false, error: error.message }
        }
      },
      
      on: (event, handler) => {
        console.log('Pusher: Registering event handler for:', event)
        eventHandlersRef.current[event] = handler
        
        // Create a wrapper that calls both the specific handler and onAny
        const wrappedHandler = (...args) => {
          // Call the specific event handler
          handler(...args)
          
          // Call the onAny handler if it exists
          if (eventHandlersRef.current._onAny) {
            eventHandlersRef.current._onAny(event, ...args)
          }
        }
        
        // Store the wrapped handler for later unbinding
        eventHandlersRef.current[`_wrapped_${event}`] = wrappedHandler
        
        // Bind to all existing channels
        Object.values(channelsRef.current).forEach(channel => {
          console.log('Pusher: Binding event', event, 'to existing channel')
          channel.bind(event, wrappedHandler)
        })
      },
      
      off: (event) => {
        // Unbind from all channels using the wrapped handler
        const wrappedHandler = eventHandlersRef.current[`_wrapped_${event}`]
        Object.values(channelsRef.current).forEach(channel => {
          if (wrappedHandler) {
            channel.unbind(event, wrappedHandler)
          } else {
            channel.unbind(event)
          }
        })
        delete eventHandlersRef.current[event]
        delete eventHandlersRef.current[`_wrapped_${event}`]
      },
      
      join: (channelName) => {
        console.log('Pusher: Joining channel:', channelName)
        if (!channelsRef.current[channelName]) {
          const channel = pusherClient.subscribe(channelName)
          channelsRef.current[channelName] = channel
          
          // Bind all registered event handlers to this channel
          Object.entries(eventHandlersRef.current).forEach(([eventName, handler]) => {
            // Skip internal handlers and use wrapped handlers where available
            if (eventName.startsWith('_')) return
            
            const wrappedHandler = eventHandlersRef.current[`_wrapped_${eventName}`]
            console.log('Pusher: Binding event', eventName, 'to new channel', channelName)
            channel.bind(eventName, wrappedHandler || handler)
          })
        }
        return channelsRef.current[channelName]
      },
      
      leave: (channelName) => {
        if (channelsRef.current[channelName]) {
          pusherClient.unsubscribe(channelName)
          delete channelsRef.current[channelName]
        }
      },
      
      onAny: (handler) => {
        // Store the global event handler
        eventHandlersRef.current._onAny = handler
      },
      
      connected,
      disconnect: () => pusherClient.disconnect()
    }

    setPusher(socketInterface)

    return () => {
      pusherClient.disconnect()
    }
  }, [])

  // Auto-bind new event handlers to existing channels
  useEffect(() => {
    if (pusher && eventHandlersRef.current) {
      Object.values(channelsRef.current).forEach(channel => {
        Object.entries(eventHandlersRef.current).forEach(([eventName, handler]) => {
          // Skip internal handlers and use wrapped handlers where available
          if (eventName.startsWith('_')) return
          
          const wrappedHandler = eventHandlersRef.current[`_wrapped_${eventName}`]
          channel.bind(eventName, wrappedHandler || handler)
        })
      })
    }
  }, [pusher])

  return (
    <PusherContext.Provider value={pusher}>
      {children}
    </PusherContext.Provider>
  )
}

export function usePusherContext() {
  const context = useContext(PusherContext)
  
  // Return a mock socket if context is null to prevent errors
  const mockSocket = {
    emit: async () => ({ success: false, error: 'Not connected' }),
    on: () => {},
    off: () => {},
    join: () => {},
    leave: () => {},
    connected: false,
    disconnect: () => {}
  }
  
  return { socket: context || mockSocket }
}