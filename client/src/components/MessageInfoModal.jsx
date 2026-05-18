import React from 'react';
import './Modal.css';

const MessageInfoModal = ({ message, onClose }) => {
  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Message Info</h2>
        </div>
        
        <div className="modal-body">
          <div className="info-item">
            <div className="info-label">Type:</div>
            <div className="info-value">
              {message.type === 'user' ? '👤 User' : message.type === 'ai' ? '🤖 AI' : '👤 Agent'}
              {message.agentName && ` (${message.agentName})`}
            </div>
          </div>
          
          <div className="info-item">
            <div className="info-label">Timestamp:</div>
            <div className="info-value">{new Date(message.timestamp).toLocaleString()}</div>
          </div>
          
          {message.status && (
            <div className="info-item">
              <div className="info-label">Status:</div>
              <div className="info-value">
                {message.status === 'read' ? '✓✓ Read' :
                 message.status === 'delivered' ? '✓✓ Delivered' :
                 message.status === 'sent' ? '✓ Sent' :
                 message.status === 'failed' ? '✗ Failed' : message.status}
              </div>
            </div>
          )}
          
          <div className="info-item">
            <div className="info-label">Message:</div>
            <div className="info-value message-text">{message.text}</div>
          </div>
          
          <div className="info-item">
            <div className="info-label">Character Count:</div>
            <div className="info-value">{message.text.length} characters</div>
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn-modal btn-modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;
