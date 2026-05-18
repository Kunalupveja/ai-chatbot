import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agent Authentication
export const agentLogin = async (username, password) => {
  const response = await api.post('/agent/login', { username, password });
  return response.data;
};

// Agents
export const getAllAgents = async () => {
  const response = await api.get('/agents');
  return response.data;
};

// Conversations
export const getConversations = async () => {
  const response = await api.get('/conversations');
  return response.data;
};

export const getMessages = async (phone) => {
  const response = await api.get(`/conversations/${encodeURIComponent(phone)}/messages`);
  return response.data;
};

export const takeoverConversation = async (phone, agentId, agentName) => {
  const response = await api.post(`/conversations/${encodeURIComponent(phone)}/takeover`, {
    agentId,
    agentName,
  });
  return response.data;
};

export const releaseConversation = async (phone) => {
  const response = await api.post(`/conversations/${encodeURIComponent(phone)}/release`);
  return response.data;
};

export const assignConversation = async (phone, targetAgentId, targetAgentName, fromAgentName) => {
  const response = await api.post(`/conversations/${encodeURIComponent(phone)}/assign`, {
    targetAgentId,
    targetAgentName,
    fromAgentName,
  });
  return response.data;
};

export const sendMessage = async (phone, message, agentId, agentName) => {
  const response = await api.post(`/conversations/${encodeURIComponent(phone)}/send`, {
    message,
    agentId,
    agentName,
  });
  return response.data;
};

export const startNewChat = async (phone, name, message, agentId, agentName) => {
  const response = await api.post('/conversations/start', {
    phone,
    name,
    message,
    agentId,
    agentName,
  });
  return response.data;
};

export default api;
