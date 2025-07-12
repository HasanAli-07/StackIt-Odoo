import React, { createContext, useContext, useState, useCallback } from 'react'
import { notificationsApi } from '../services/api'
import { Notification } from '../types'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  toasts: Toast[]
  refreshNotifications: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
  showToast: (type: Toast['type'], message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await notificationsApi.getNotifications({ limit: 10 })
      setNotifications(response.data || [])
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotifications([])
    }
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount()
      setUnreadCount(response.count || 0)
    } catch (error) {
      console.error('Failed to load unread count:', error)
      setUnreadCount(0)
    }
  }, [])

  const showToast = useCallback((type: Toast['type'], message: string, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, type, message, duration }
    
    setToasts(prev => [...prev, toast])
    
    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const value = {
    notifications,
    unreadCount,
    toasts,
    refreshNotifications,
    refreshUnreadCount,
    showToast,
    removeToast
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              toast.type === 'warning' ? 'bg-orange-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
} 