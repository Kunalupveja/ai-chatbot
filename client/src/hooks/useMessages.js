import { useState, useEffect, useCallback } from 'react';
import { getMessages } from '../services/api';

export const useMessages = (phone, autoRefresh = true, interval = 5000) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMessages = useCallback(async () => {
    if (!phone) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getMessages(phone);
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (phone) {
      fetchMessages();

      if (autoRefresh) {
        const intervalId = setInterval(fetchMessages, interval);
        return () => clearInterval(intervalId);
      }
    }
  }, [phone, fetchMessages, autoRefresh, interval]);

  return { messages, loading, error, refetch: fetchMessages };
};
