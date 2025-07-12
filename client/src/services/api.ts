import axios from 'axios'
import { 
  User, 
  Question, 
  Answer, 
  Tag, 
  Notification, 
  CreateQuestionRequest, 
  CreateAnswerRequest, 
  VoteRequest,
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
  ApiResponse,
  PaginatedResponse
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Please wait before making more requests.')
      // Show toast notification if available
      if (window.showRateLimitToast) {
        window.showRateLimitToast('Rate limit exceeded. Please wait before making more requests.')
      }
    }
    
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      email,
      password,
    })
    return response.data.data!
  },

  register: async (username: string, email: string, password: string) => {
    const response = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', {
      username,
      email,
      password,
    })
    return response.data.data!
  },

  getCurrentUser: async () => {
    const response = await api.get<ApiResponse<User>>('/auth/me')
    return response.data.data!
  },

  updateProfile: async (data: UpdateUserRequest) => {
    const response = await api.put<ApiResponse<User>>('/auth/profile', data)
    return response.data.data!
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put<ApiResponse>('/auth/password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },
}

// Questions API
export const questionsApi = {
  getQuestions: async (params?: {
    page?: number
    limit?: number
    tag?: string
    search?: string
    sort?: string
  }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Question>>>('/questions', { params })
    return response.data.data!
  },

  getQuestion: async (id: number) => {
    const response = await api.get<ApiResponse<Question>>(`/questions/${id}`)
    return response.data.data!
  },

  createQuestion: async (data: CreateQuestionRequest) => {
    const response = await api.post<ApiResponse<Question>>('/questions', data)
    return response.data.data!
  },

  updateQuestion: async (id: number, data: Partial<CreateQuestionRequest>) => {
    const response = await api.put<ApiResponse>(`/questions/${id}`, data)
    return response.data
  },

  deleteQuestion: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/questions/${id}`)
    return response.data
  },

  voteQuestion: async (id: number, voteType: -1 | 1) => {
    const response = await api.post<ApiResponse>(`/questions/${id}/vote`, { vote_type: voteType })
    return response.data
  },
}

// Answers API
export const answersApi = {
  createAnswer: async (questionId: number, data: CreateAnswerRequest) => {
    const response = await api.post<ApiResponse<Answer>>(`/questions/${questionId}/answers`, data)
    return response.data.data!
  },

  updateAnswer: async (questionId: number, answerId: number, data: CreateAnswerRequest) => {
    const response = await api.put<ApiResponse>(`/questions/${questionId}/answers/${answerId}`, data)
    return response.data
  },

  deleteAnswer: async (questionId: number, answerId: number) => {
    const response = await api.delete<ApiResponse>(`/questions/${questionId}/answers/${answerId}`)
    return response.data
  },

  voteAnswer: async (questionId: number, answerId: number, voteType: -1 | 1) => {
    const response = await api.post<ApiResponse>(`/questions/${questionId}/answers/${answerId}/vote`, { vote_type: voteType })
    return response.data
  },

  acceptAnswer: async (questionId: number, answerId: number) => {
    const response = await api.post<ApiResponse>(`/questions/${questionId}/answers/${answerId}/accept`)
    return response.data
  },

  unacceptAnswer: async (questionId: number, answerId: number) => {
    const response = await api.post<ApiResponse>(`/questions/${questionId}/answers/${answerId}/unaccept`)
    return response.data
  },
}

// Tags API
export const tagsApi = {
  getTags: async () => {
    const response = await api.get<ApiResponse<Tag[]>>('/tags')
    return response.data.data!
  },

  getPopularTags: async () => {
    const response = await api.get<ApiResponse<Tag[]>>('/tags/popular')
    return response.data.data!
  },
}

// Notifications API
export const notificationsApi = {
  getNotifications: async (params?: {
    page?: number
    limit?: number
    unread?: boolean
  }) => {
    const response = await api.get<ApiResponse<PaginatedResponse<Notification>>>('/notifications', { params })
    return response.data.data!
  },

  markAsRead: async (id: number) => {
    const response = await api.put<ApiResponse>(`/notifications/${id}/read`)
    return response.data
  },

  markAllAsRead: async () => {
    const response = await api.put<ApiResponse>('/notifications/read-all')
    return response.data
  },

  getUnreadCount: async () => {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
    return response.data.data!
  },

  deleteNotification: async (id: number) => {
    const response = await api.delete<ApiResponse>(`/notifications/${id}`)
    return response.data
  },
}

export default api 