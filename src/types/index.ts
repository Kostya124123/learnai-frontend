export interface User {
  id: number
  email: string
  full_name: string
  role: 'employee' | 'hr' | 'admin'
}

export interface Course {
  id: number
  title: string
  description: string
  status: string
  generated_at: string
  module_count: number
  document_id?: number | null
}

export interface Enrollment {
  id: number
  course_id: number
  course_title: string
  enrolled_at: string
  status: 'active' | 'completed' | 'paused'
  progress_pct: number
  last_score?: number | null
}

export interface CourseModule {
  id: number
  course_id: number
  module_type: 'theory' | 'test' | 'case'
  order_index: number
  title: string
  content: string
}

export interface TestQuestion {
  id: number
  module_id: number
  question: string
  options: string[]
  points: number
}

export interface TestAttempt {
  test_id: number
  answer: string
  is_correct: boolean
  score: number
  correct_answer: string
  explanation: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  source?: string
  created_at?: string
}

export interface AnalyticsData {
  total_enrolled: number
  avg_score: number
  courses_generated: number
  incomplete_count: number
  weak_topics: { topic: string; score: number }[]
  recent_activity: { date: string; completions: number }[]
}

export interface AuthTokens {
  access_token: string
  token_type: string
}

export interface Document {
  id: number
  filename: string
  status: string
  uploaded_at: string
  chunk_count: number
}

// Legacy aliases kept for compatibility
export type AskResponse = { answer: string; source: string }
export type GenerateCourseResponse = Course
