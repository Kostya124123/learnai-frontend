import { apiClient } from './client';
import type { Course, Enrollment, CourseModule, TestQuestion, TestAttempt } from '../types';

export const coursesApi = {
  // Employee
  getMyEnrollments: async (): Promise<Enrollment[]> => {
    const { data } = await apiClient.get<Enrollment[]>('/enrollments/me');
    return data;
  },

  getCourseModules: async (courseId: string): Promise<CourseModule[]> => {
    const { data } = await apiClient.get<CourseModule[]>(`/courses/${courseId}/modules`);
    return data;
  },

  getModuleTests: async (moduleId: string): Promise<TestQuestion[]> => {
    const { data } = await apiClient.get<TestQuestion[]>(`/modules/${moduleId}/tests`);
    return data;
  },

  submitAnswer: async (testId: string, answer: string): Promise<TestAttempt> => {
    const { data } = await apiClient.post<TestAttempt>(`/tests/${testId}/attempt`, { answer });
    return data;
  },

  updateProgress: async (enrollmentId: string, progress: number): Promise<void> => {
    await apiClient.patch(`/enrollments/${enrollmentId}/progress`, { progress_pct: progress });
  },

  // HR
  getAllCourses: async (): Promise<Course[]> => {
    const { data } = await apiClient.get<Course[]>('/courses');
    return data;
  },

  generateCourse: async (documentId: string, title: string): Promise<Course> => {
    const { data } = await apiClient.post<Course>('/courses/generate', { document_id: documentId, title });
    return data;
  },

  uploadDocument: async (file: File): Promise<{ id: string; filename: string }> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  reloadDocs: async (): Promise<void> => {
    await apiClient.post('/reload_docs');
  },
};
