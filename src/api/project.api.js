import api from "./axios";

export const getProjects = () => api.get("/projects");
export const createProject = (data) => api.post("/projects", data);
export const getProject = (id) => api.get(`/projects/${id}`);
export const getProjectDetails = (id) => api.get(`/projects/${id}`);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const addProjectMember = (id, data) => api.post(`/projects/${id}/members`, data);
export const acceptInvitation = (projectId, invitationToken, data) => api.post(`/projects/${projectId}/invitations/accept/${invitationToken}`, data);
export const removeProjectMember = (projectId, userId) => api.delete(`/projects/${projectId}/members/${userId}`);
export const updateMemberRole = (projectId, userId, role) => api.put(`/projects/${projectId}/members/${userId}`, { role });
export const getProjectStats = (id) => api.get(`/projects/${id}/stats`);