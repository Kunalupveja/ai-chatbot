import React, { useState, useRef, useEffect } from 'react';
import { useAgent } from '../context/AgentContext';
import { useMessages } from '../hooks/useMessages';
import { takeoverConversation, releaseConversation, sendMessage as sendMessageApi } from '../services/api';
import MessageBubble from './MessageBubble';
import AssignModal from './AssignModal';
import ContextMenu from './ContextMenu';
import './ChatPanel.css';

const ChatPanel = () => {
  const { currentConversation, currentAgent, setCurrentConversation } = useAgent();
  const { messages, refetch } = useMessages(currentConversation?.phone, true, 5000);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!currentConversation) {
    return (
      <div className="chat-panel">
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the list to start chatting</p>
        </div>
      </div>
    );
  }

  const isAgentMode = currentConversation.mode === 'agent' && currentConversation.agentId === currentAgent.id;
  const isAIMode = currentConversation.mode === 'ai';
  const isOtherAgentMode = currentConversation.mode === 'agent' && currentConversation.agentId !== currentAgent.id;

  const handleTakeover = async () => {
    try {
      const data = await takeoverConversation(currentConversation.phone, currentAgent.id, currentAgent.name);
      if (data.success) {
        setCurrentConversation({
          ...currentConversation,
          mode: 'agent',
          agentId: currentAgent.id,
          agentName: currentAgent.name,
        });
      } else {
        alert('Failed to take over conversation');
      }
    } catch (error) {
      console.error('Takeover error:', error);
      alert('Failed to take over conversation');
    }
  };

  const handleRelease = async () => {
    try {
      const data = await releaseConversation(currentConversation.phone);
      if (data.success) {
        setCurrentConversation({
          ...currentConversation,
          mode: 'ai',
          agentId: null,
          agentName: null,
        });
      } else {
        alert('Failed to release conversation');
      }
    } catch (error) {
      console.error('Release error:', error);
      alert('Failed to release conversation');
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    const message = messageInput.trim();
    if (!message || !isAgentMode) return;

    setSending(true);
    try {
      const data = await sendMessageApi(currentConversation.phone, message, currentAgent.id, currentAgent.name);
      if (data.success) {
        setMessageInput('');
        await refetch();
      } else {
        alert('Failed to send message: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleContextMenu = (e, message, index) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message,
      index,
    });
  };

  const placeholder = isOtherAgentMode
    ? `${currentConversation.agentName} is handling this conversation...`
    : isAgentMode
    ? 'Type your message...'
    : 'Take over to send messages...';

  return (
    <>
      <div className="chat-panel">
        <div className="chat-header">
          <div className="chat-info">
            <h3>{currentConversation.name}</h3>
            <div className="chat-meta">
              <span>{currentConversation.phone}</span>
              {currentConversation.email && (
                <>
                  {' • '}
                  <span>{currentConversation.email}</span>
                </>
              )}
            </div>
          </div>
          <div className="chat-actions">
            {isAIMode && (
              <button className="btn-takeover" onClick={handleTakeover}>
                👤 Take Over
              </button>
            )}
            {isAgentMode && (
              <>
                <button className="btn-assign" onClick={() => setShowAssignModal(true)}>
                  🔄 Assign
                </button>
                <button className="btn-release" onClick={handleRelease}>
                  🤖 Release to AI
                </button>
              </>
            )}
          </div>
        </div>

        <div className="messages-container">
          {messages.map((msg, index) => (
            <MessageBubble
              key={`${msg.timestamp}-${index}`}
              message={msg}
              index={index}
              onContextMenu={handleContextMenu}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="message-input-container">
          <form onSubmit={handleSendMessage} className="message-input-box">
            <textarea
              className="message-input"
              placeholder={placeholder}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isAgentMode || sending}
              rows={2}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={!isAgentMode || sending || !messageInput.trim()}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {showAssignModal && <AssignModal onClose={() => setShowAssignModal(false)} />}
      {contextMenu && <ContextMenu {...contextMenu} onClose={() => setContextMenu(null)} />}
    </>
  );
};

export default ChatPanel;
