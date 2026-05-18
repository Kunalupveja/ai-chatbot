import React, { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import { assignConversation } from '../services/api';
import './Modal.css';

const AssignModal = ({ onClose }) => {
  const { currentAgent, currentConversation, allAgents, setCurrentConversation } = useAgent();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(false);

  const availableAgents = allAgents.filter((agent) => agent.id !== currentAgent.id);

  const handleAssign = async () => {
    if (!selectedAgent) return;

    setLoading(true);
    try {
      const data = await assignConversation(
        currentConversation.phone,
        selectedAgent.id,
        selectedAgent.name,
        currentAgent.name
      );

      if (data.success) {
        setCurrentConversation({
          ...currentConversation,
          mode: 'agent',
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
        });
        alert(`Conversation assigned to ${selectedAgent.name}`);
        onClose();
      } else {
        alert('Failed to assign conversation');
      }
    } catch (error) {
      console.error('Assign error:', error);
      alert('Failed to assign conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Conversation</h2>
          <p>Select an agent to assign this conversation to</p>
        </div>

        <div className="agent-list">
          {availableAgents.map((agent) => (
            <div
              key={agent.id}
              className={`agent-option ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
              onClick={() => setSelectedAgent(agent)}
            >
              <input
                type="radio"
                name="assignAgent"
                checked={selectedAgent?.id === agent.id}
                onChange={() => setSelectedAgent(agent)}
              />
              <div className="agent-option-info">
                <div className="agent-option-name">{agent.name}</div>
                <div className="agent-option-username">@{agent.username}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn-modal btn-modal-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-modal btn-modal-confirm"
            onClick={handleAssign}
            disabled={!selectedAgent || loading}
          >
            {loading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignModal;
