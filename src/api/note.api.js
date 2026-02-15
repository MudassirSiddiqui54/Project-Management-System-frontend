import api from "./axios";

// Note API functions

// Create a new note in a project
export const createNote = (projectId, data) =>
api.post(`/projects/${projectId}/notes`, data);

// Get all notes for a project
export const getProjectNotes = (projectId) =>
api.get(`/projects/${projectId}/notes`);

// Get note details
export const getNoteDetails = (projectId, noteId) =>
api.get(`/projects/${projectId}/notes/${noteId}`);

// Update note
export const updateNote = (projectId, noteId, data) =>
api.put(`/projects/${projectId}/notes/${noteId}`, data);

// Delete note
export const deleteNote = (projectId, noteId) =>
api.delete(`/projects/${projectId}/notes/${noteId}`);
