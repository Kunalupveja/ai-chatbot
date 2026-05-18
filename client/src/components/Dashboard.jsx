import React, { useEffect } from 'react';
import { useAgent } from '../context/AgentContext';
import { getAllAgents } from '../services/api';
import { useConversations } from '../hooks/useConversations';
import Header from './Header';
import ConversationList from './ConversationList';
import ChatPanel from './ChatPanel';
import './Dashboard.css';

const Dashboard = () => {
  const { setAllAgents } = useAgent();
  
  // Auto-refresh conversations every 5 seconds
  useConversations(true, 5000);

  // Load all agents on mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await getAllAgents();
        if (data.success) {
          setAllAgents(data.agents);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
      }
    };
    loadAgents();
  }, [setAllAgents]);

  return (
    <div className="dashboard">
      <Header />
      <div className="main-content">
        <ConversationList />
        <ChatPanel />
      </div>
    </div>
  );
};

export default Dashboard;
