import { useState, useEffect, useCallback } from 'react';
import { getConversations } from '../services/api';
import { useAgent } from '../context/AgentContext';

export const useConversations = (autoRefresh = true, interval = 5000) => {
  const { setConversations, currentConversation, setCurrentConversation } = useAgent();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConversations();
      
      if (data.success) {
        setConversations(data.conversations);
        
        // Update current conversation state if it exists
        if (currentConversation) {
          const updated = data.conversations.find(c => c.phone === currentConversation.phone);
          if (updated) {
            setCurrentConversation(updated);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setConversations, currentConversation, setCurrentConversation]);

  useEffect(() => {
    fetchConversations();

    if (autoRefresh) {
      const intervalId = setInterval(fetchConversations, interval);
      return () => clearInterval(intervalId);
    }
  }, [fetchConversations, autoRefresh, interval]);

  return { loading, error, refetch: fetchConversations };
};
