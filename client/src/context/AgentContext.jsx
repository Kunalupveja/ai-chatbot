import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/helpers';

const AgentContext = createContext();

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return context;
};

export const AgentProvider = ({ children }) => {
  const [currentAgent, setCurrentAgent] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [allAgents, setAllAgents] = useState([]);
  const [starredMessages, setStarredMessages] = useState(new Set());

  // Load starred messages from localStorage on mount
  useEffect(() => {
    const saved = storage.get('starredMessages', []);
    setStarredMessages(new Set(saved));
  }, []);

  // Save starred messages to localStorage when changed
  useEffect(() => {
    storage.set('starredMessages', Array.from(starredMessages));
  }, [starredMessages]);

  const login = (agent) => {
    setCurrentAgent(agent);
  };

  const logout = () => {
    setCurrentAgent(null);
    setCurrentConversation(null);
    setConversations([]);
  };

  const toggleStar = (messageId) => {
    setStarredMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const value = {
    currentAgent,
    setCurrentAgent,
    conversations,
    setConversations,
    currentConversation,
    setCurrentConversation,
    allAgents,
    setAllAgents,
    starredMessages,
    toggleStar,
    login,
    logout,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};
