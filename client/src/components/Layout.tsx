import { Outlet } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useNotifications } from '../contexts/NotificationContext'
import { Bell, Search, Plus, User, LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { notificationsApi } from '../services/api'
import toast from 'react-hot-toast'

const Layout = () => {
  const { user, logout } = useAuth()
  const { isConnected } = useSocket()
  const { notifications, unreadCount, refreshNotifications, refreshUnreadCount } = useNotifications()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (user) {
      refreshNotifications()
      refreshUnreadCount()
      
      // Refresh notifications every 30 seconds
      const interval = setInterval(() => {
        refreshNotifications()
        refreshUnreadCount()
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [user, refreshNotifications, refreshUnreadCount])



  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id)
      refreshNotifications()
      refreshUnreadCount()
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">StackIt</span>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Ask Question Button */}
                  <Link
                    to="/ask"
                    className="hidden sm:flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ask Question</span>
                  </Link>

                  {/* Notifications */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        if (!isNotificationOpen) {
                          refreshNotifications()
                          refreshUnreadCount()
                        }
                        setIsNotificationOpen(!isNotificationOpen)
                      }}
                      className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="notification-badge">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {isNotificationOpen && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold">Notifications</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {!notifications || notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No notifications
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                                  !notification.is_read ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleMarkAsRead(notification.id)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">
                                      {notification.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2">
                                      {new Date(notification.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {!notification.is_read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <User className="h-5 w-5" />
                      <span className="hidden sm:block">{user.username}</span>
                      {user.role === 'admin' && (
                        <span className="hidden sm:block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Admin
                        </span>
                      )}
                    </button>

                    {/* User Dropdown */}
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="flex items-center justify-between">
                            <span>Profile</span>
                            {user.role === 'admin' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                        </Link>
                        <button
                          onClick={() => {
                            logout()
                            setIsMenuOpen(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Click outside to close dropdowns */}
      {(isMenuOpen || isNotificationOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMenuOpen(false)
            setIsNotificationOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default Layout 