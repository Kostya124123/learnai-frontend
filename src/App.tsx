// src/App.tsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { CoursesPage } from './pages/CoursesPage'
import { CourseDetailPage } from './pages/CourseDetailPage'
import { TestPage } from './pages/TestPage'
import { AssistantPage } from './pages/AssistantPage'
import { HRPage } from './pages/HRPage'

// Защищённый маршрут — редирект на /login если нет токена
const Protected: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

// Маршрут только для HR/admin
const HRRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  if (!token) return <Navigate to="/login" replace />
  if (role !== 'hr' && role !== 'admin') return <Navigate to="/courses" replace />
  return <Layout>{children}</Layout>
}

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/courses" element={
        <Protected><CoursesPage /></Protected>
      } />
      <Route path="/courses/:courseId" element={
        <Protected><CourseDetailPage /></Protected>
      } />
      <Route path="/test/:moduleId" element={
        <Protected><TestPage /></Protected>
      } />
      <Route path="/assistant" element={
        <Protected><AssistantPage /></Protected>
      } />

      <Route path="/hr" element={
        <HRRoute><HRPage /></HRRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/courses" replace />} />
      <Route path="*" element={<Navigate to="/courses" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App
