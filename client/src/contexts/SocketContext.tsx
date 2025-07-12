import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { SocketContextType } from '../types'

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token')
      if (token) {
        const newSocket = io('http://localhost:5000', {
          auth: {
            token
          }
        })

        newSocket.on('connect', () => {
          console.log('Connected to server')
          setIsConnected(true)
        })

        newSocket.on('disconnect', () => {
          console.log('Disconnected from server')
          setIsConnected(false)
        })

        newSocket.on('notification', (notification) => {
          console.log('New notification:', notification)
          // You can add toast notification here
        })

        setSocket(newSocket)

        return () => {
          newSocket.close()
        }
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [user])

  const value: SocketContextType = {
    socket,
    isConnected
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 