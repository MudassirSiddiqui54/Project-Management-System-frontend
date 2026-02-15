import api from "./axios";

// Subtask API functions

// Create a new subtask for a task
export const createSubTask = (projectId, taskId, data) =>
api.post(`/projects/${projectId}/tasks/${taskId}/subtasks`, data);

// Get all subtasks for a task
export const getTaskSubTasks = (projectId, taskId) =>
api.get(`/projects/${projectId}/tasks/${taskId}/subtasks`);

// Update subtask
export const updateSubTask = (projectId, subTaskId, data) =>
api.put(`/projects/${projectId}/subtasks/${subTaskId}`, data);

// Delete subtask
export const deleteSubTask = (projectId, subTaskId) =>
api.delete(`/projects/${projectId}/subtasks/${subTaskId}`);

// Update subtask status
export const updateSubTaskStatus = (projectId, subTaskId, status) =>
api.patch(`/projects/${projectId}/subtasks/${subTaskId}/status`, { status });
