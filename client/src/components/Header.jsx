import React from 'react';
import { useAgent } from '../context/AgentContext';
import './Header.css';

const Header = () => {
  const { currentAgent, logout } = useAgent();

  return (
    <div className="header">
      <h1>🤖 Agent Dashboard</h1>
      <div className="agent-info">
        <span className="agent-name">{currentAgent?.name || 'Agent'}</span>
        <button className="btn-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
