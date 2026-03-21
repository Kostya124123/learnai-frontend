// src/api/index.ts
import axios from 'axios'
import type {
  Course, Enrollment, CourseModule, TestQuestion,
  TestAttempt, AnalyticsData, ChatMessage
} from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const { data } = await api.post<{ access_token: string }>(
      '/auth/token', form,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
    localStorage.setItem('token', data.access_token)
    // fetch role
    const me = await api.get<{ role: string; full_name: string; id: number; email: string }>('/auth/me')
    localStorage.setItem('role', me.data.role)
    localStorage.setItem('user_name', me.data.full_name)
    return { ...data, ...me.data }
  },
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user_name')
  }
}

// ── Courses ───────────────────────────────────────────────────
export const coursesApi = {
  getAll: () => api.get<Course[]>('/courses').then(r => r.data),
  generate: (documentId: number | null, title: string) =>
    api.post<Course>('/courses/generate', { document_id: documentId, title }).then(r => r.data),
}

// ── Enrollments ───────────────────────────────────────────────
export const enrollmentsApi = {
  getMy: () => api.get<Enrollment[]>('/enrollments/me').then(r => r.data),
  enroll: (courseId: number) => api.post(`/enrollments/${courseId}`).then(r => r.data),
  updateProgress: (enrollmentId: number, progress: number) =>
    api.patch(`/enrollments/${enrollmentId}/progress`, { progress_pct: progress }).then(r => r.data),
}

// ── Modules & Tests ───────────────────────────────────────────
export const modulesApi = {
  getByCourse: (courseId: number) =>
    api.get<CourseModule[]>(`/courses/${courseId}/modules`).then(r => r.data),
  getTests: (moduleId: number) =>
    api.get<TestQuestion[]>(`/modules/${moduleId}/tests`).then(r => r.data),
}

export const testsApi = {
  submit: (testId: number, answer: string) =>
    api.post<TestAttempt>(`/tests/${testId}/attempt`, { answer }).then(r => r.data),
}

// ── Chat ──────────────────────────────────────────────────────
export const chatApi = {
  ask: (question: string) =>
    api.post<{ answer: string; source: string }>('/ask', { question }).then(r => r.data),
  getHistory: () => api.get<ChatMessage[]>('/chat/history').then(r => r.data),
}

// ── Documents ─────────────────────────────────────────────────
export const documentsApi = {
  getAll: () => api.get('/documents').then(r => r.data),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
  reload: () => api.post('/reload_docs').then(r => r.data),
}

// ── Analytics ─────────────────────────────────────────────────
export const analyticsApi = {
  get: () => api.get<AnalyticsData>('/analytics/dashboard').then(r => r.data),
}

export default api
