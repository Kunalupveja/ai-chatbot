import React from 'react';
import { AgentProvider, useAgent } from './context/AgentContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

const AppContent = () => {
  const { currentAgent } = useAgent();

  return currentAgent ? <Dashboard /> : <Login />;
};

function App() {
  return (
    <AgentProvider>
      <AppContent />
    </AgentProvider>
  );
}

export default App;
