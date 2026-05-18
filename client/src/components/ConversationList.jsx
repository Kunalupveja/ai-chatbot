import React, { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import { formatTime } from '../utils/helpers';
import NewChatModal from './NewChatModal';
import './ConversationList.css';

const ConversationList = () => {
  const { conversations, currentConversation, setCurrentConversation } = useAgent();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    return (
      conv.name.toLowerCase().includes(query) ||
      conv.phone.includes(query) ||
      conv.email?.toLowerCase().includes(query)
    );
  });

  const aiCount = conversations.filter((c) => c.mode === 'ai').length;
  const agentCount = conversations.filter((c) => c.mode === 'agent').length;

  const handleSelectConversation = (conv) => {
    setCurrentConversation(conv);
  };

  return (
    <>
      <div className="conversations-panel">
        <div className="panel-header">
          <h2>Conversations</h2>
          <button className="btn-new-chat" onClick={() => setShowNewChatModal(true)}>
            ➕ New Chat
          </button>
          <input
            type="text"
            className="search-box"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-dot ai"></span>
            <span className="stat-label">AI Mode:</span>
            <span className="stat-value">{aiCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-dot agent"></span>
            <span className="stat-label">Agent Mode:</span>
            <span className="stat-value">{agentCount}</span>
          </div>
        </div>

        <div className="conversations-list">
          {filteredConversations.length === 0 ? (
            <div className="empty-conversations">
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.phone}
                className={`conversation-item ${conv.mode === 'ai' ? 'ai-mode' : 'agent-mode'} ${
                  currentConversation?.phone === conv.phone ? 'active' : ''
                }`}
                onClick={() => handleSelectConversation(conv)}
              >
                <div className="conv-header">
                  <span className="conv-name">{conv.name}</span>
                  <span className="conv-time">{formatTime(conv.lastMessage)}</span>
                </div>
                <div className="conv-preview">{conv.preview}</div>
                <span className={`mode-badge ${conv.mode}`}>
                  {conv.mode === 'ai' ? '🤖 AI' : `👤 ${conv.agentName}`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showNewChatModal && <NewChatModal onClose={() => setShowNewChatModal(false)} />}
    </>
  );
};

export default ConversationList;
