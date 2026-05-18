import React from 'react';
import { useAgent } from '../context/AgentContext';
import { formatTime, getMessageStatus, isMediaPlaceholder, getAvatarText } from '../utils/helpers';
import MediaRenderer from './MediaRenderer';
import './MessageBubble.css';

const MessageBubble = ({ message, index, onContextMenu }) => {
  const { currentConversation, starredMessages } = useAgent();
  const messageId = `${currentConversation.phone}_${index}`;
  const isStarred = starredMessages.has(messageId);

  const handleContextMenu = (e) => {
    onContextMenu(e, message, index);
  };

  const avatar = getAvatarText(message.type, message.name);
  const showText = message.text && !isMediaPlaceholder(message.text);

  return (
    <div
      className={`message ${message.type}`}
      onContextMenu={handleContextMenu}
      data-message-id={messageId}
    >
      {isStarred && <div className="message-starred">⭐</div>}
      
      <div className="message-avatar">{avatar}</div>
      
      <div className="message-content">
        {message.type === 'agent' && message.agentName && (
          <div className="agent-name-label">👤 {message.agentName}</div>
        )}
        
        {message.mediaType && <MediaRenderer message={message} />}
        
        {showText && <div className="message-bubble">{message.text}</div>}
        
        <div className="message-time">{formatTime(message.timestamp)}</div>
        
        {(message.type === 'ai' || message.type === 'agent') && message.status && (
          <MessageStatus status={message.status} />
        )}
      </div>
    </div>
  );
};

const MessageStatus = ({ status }) => {
  const { icon, text, color } = getMessageStatus(status);
  
  return (
    <div className={`message-status ${status}`} style={{ color }}>
      {icon} {text}
    </div>
  );
};

export default MessageBubble;
