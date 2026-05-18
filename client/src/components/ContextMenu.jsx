import React, { useEffect, useRef, useState } from 'react';
import { useAgent } from '../context/AgentContext';
import MessageInfoModal from './MessageInfoModal';
import './ContextMenu.css';

const ContextMenu = ({ x, y, message, index, onClose }) => {
  const { currentConversation, starredMessages, toggleStar } = useAgent();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const menuRef = useRef(null);
  const messageId = `${currentConversation.phone}_${index}`;
  const isStarred = starredMessages.has(messageId);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${window.innerWidth - rect.width - 10}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${window.innerHeight - rect.height - 10}px`;
      }
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      showNotification('✓ Message copied');
      onClose();
    }).catch(() => {
      alert('Failed to copy message');
      onClose();
    });
  };

  const handleForward = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      alert('Message copied to clipboard!\n\nYou can now paste it in another conversation or use the "New Chat" feature to forward it.');
      onClose();
    }).catch(() => {
      alert('Failed to copy message');
      onClose();
    });
  };

  const handleReply = () => {
    alert(`Replying to: "${message.text.substring(0, 100)}..."\n\nNote: Reply feature stores the reference. In a full implementation, this would show a reply preview above the input box.`);
    onClose();
  };

  const handleStar = () => {
    toggleStar(messageId);
    showNotification(isStarred ? '⭐ Message unstarred' : '⭐ Message starred');
    onClose();
  };

  const handleInfo = () => {
    setShowInfoModal(true);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?\n\nNote: This only removes it from your view. The message will still exist in the database and conversation history.')) {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.style.opacity = '0.3';
        messageElement.style.pointerEvents = 'none';
        messageElement.innerHTML = `
          <div style="text-align: center; width: 100%; padding: 10px; color: #9ca3af; font-style: italic; font-size: 13px;">
            🗑️ Message deleted
          </div>
        `;
      }
      showNotification('🗑️ Message deleted from view');
      onClose();
    } else {
      onClose();
    }
  };

  const showNotification = (text) => {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = text;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  return (
    <>
      <div
        ref={menuRef}
        className="context-menu active"
        style={{ left: `${x}px`, top: `${y}px` }}
      >
        <div className="context-menu-item" onClick={handleReply}>
          <span className="context-menu-icon">↩️</span>
          <span>Reply</span>
        </div>
        <div className="context-menu-item" onClick={handleForward}>
          <span className="context-menu-icon">➡️</span>
          <span>Forward</span>
        </div>
        <div className="context-menu-item" onClick={handleCopy}>
          <span className="context-menu-icon">📋</span>
          <span>Copy</span>
        </div>
        <div className="context-menu-divider"></div>
        <div className="context-menu-item" onClick={handleStar}>
          <span className="context-menu-icon">⭐</span>
          <span>{isStarred ? 'Unstar' : 'Star'}</span>
        </div>
        <div className="context-menu-item" onClick={handleInfo}>
          <span className="context-menu-icon">ℹ️</span>
          <span>Info</span>
        </div>
        <div className="context-menu-divider"></div>
        <div className="context-menu-item danger" onClick={handleDelete}>
          <span className="context-menu-icon">🗑️</span>
          <span>Delete</span>
        </div>
      </div>

      {showInfoModal && (
        <MessageInfoModal
          message={message}
          onClose={() => {
            setShowInfoModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
};

export default ContextMenu;
