import api from "./axios";

// Task API functions

// Create a new task in a project
export const createTask = (projectId, data) =>
api.post(`/projects/${projectId}/tasks`, data);

// Get all tasks for a project
export const getProjectTasks = (projectId, params = {}) =>
api.get(`/projects/${projectId}/tasks`, { params });

// Get task details
export const getTaskDetails = (projectId, taskId) =>
api.get(`/projects/${projectId}/tasks/${taskId}`);

// Update task
export const updateTask = (projectId, taskId, data) =>
api.put(`/projects/${projectId}/tasks/${taskId}`, data);

// Delete task
export const deleteTask = (projectId, taskId) =>
api.delete(`/projects/${projectId}/tasks/${taskId}`);

// Update task status
export const updateTaskStatus = (projectId, taskId, status) =>
api.patch(`/projects/${projectId}/tasks/${taskId}/status`, { status });
