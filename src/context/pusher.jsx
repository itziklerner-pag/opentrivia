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
        console.log('🚀 PUSHER: Emitting event:', event, 'with data:', data)
        
        // Ensure we're subscribed to global channel before emitting events that expect global responses
        if (event.includes('player:') && !channelsRef.current['global']) {
          console.log('🌍 PUSHER: Ensuring global channel subscription before player event')
          socketInterface.join('global')
        }
        
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
          console.log('📡 PUSHER: API response:', result)
          
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
        console.log('📝 PUSHER: Registering event handler for:', event)
        eventHandlersRef.current[event] = handler
        
        // Create a wrapper that calls both the specific handler and onAny
        const wrappedHandler = (...args) => {
          console.log('🎯 PUSHER: Event received:', event, 'with args:', args)
          
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
          console.log('🔗 PUSHER: Binding event', event, 'to existing channel')
          channel.bind(event, wrappedHandler)
        })
        
        // Ensure we're subscribed to global channel for global events
        if (!channelsRef.current['global']) {
          console.log('🌍 PUSHER: Auto-subscribing to global channel for event:', event)
          socketInterface.join('global')
        }
      },
      
      off: (event) => {
        console.log('❌ PUSHER: Removing event handler for:', event)
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
        console.log('🚪 PUSHER: Joining channel:', channelName)
        if (!channelsRef.current[channelName]) {
          const channel = pusherClient.subscribe(channelName)
          channelsRef.current[channelName] = channel
          
          // Bind all registered event handlers to this channel
          Object.entries(eventHandlersRef.current).forEach(([eventName, handler]) => {
            // Skip internal handlers and use wrapped handlers where available
            if (eventName.startsWith('_')) return
            
            const wrappedHandler = eventHandlersRef.current[`_wrapped_${eventName}`]
            console.log('🔗 PUSHER: Binding event', eventName, 'to new channel', channelName)
            channel.bind(eventName, wrappedHandler || handler)
          })
        }
        return channelsRef.current[channelName]
      },
      
      leave: (channelName) => {
        console.log('🚪 PUSHER: Leaving channel:', channelName)
        if (channelsRef.current[channelName]) {
          pusherClient.unsubscribe(channelName)
          delete channelsRef.current[channelName]
        }
      },
      
      onAny: (handler) => {
        console.log('👀 PUSHER: Setting up onAny handler')
        // Store the global event handler
        eventHandlersRef.current._onAny = handler
      },
      
      offAny: () => {
        console.log('👀 PUSHER: Removing onAny handler')
        delete eventHandlersRef.current._onAny
      },
      
      connected,
      disconnect: () => {
        console.log('🔌 PUSHER: Disconnecting')
        pusherClient.disconnect()
      }
    }

    setPusher(socketInterface)

    // Auto-subscribe to global channel immediately (no delay!)
    console.log('🌍 PUSHER: Auto-subscribing to global channel on startup (immediate)')
    socketInterface.join('global')

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
    onAny: () => {},
    offAny: () => {},
    connected: false,
    disconnect: () => {}
  }
  
  return { socket: context || mockSocket }
}