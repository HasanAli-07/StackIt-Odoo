import { Routes, Route } from 'react-router-dom'
import { useNotifications } from './contexts/NotificationContext'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import AskQuestion from './pages/AskQuestion'
import QuestionDetail from './pages/QuestionDetail'
import Profile from './pages/Profile'
import ProtectedRoute from './components/ProtectedRoute'
import React from 'react'

// Extend Window interface for global toast function
declare global {
  interface Window {
    showRateLimitToast?: (message: string) => void
  }
}

function AppContent() {
  const { showToast } = useNotifications()

  // Set up global toast function for API service
  React.useEffect(() => {
    window.showRateLimitToast = (message: string) => {
      showToast('warning', message, 8000)
    }
  }, [showToast])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="questions/:id" element={<QuestionDetail />} />
        <Route
          path="ask"
          element={
            <ProtectedRoute>
              <AskQuestion />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App 