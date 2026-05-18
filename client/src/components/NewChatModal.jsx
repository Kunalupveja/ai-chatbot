import React, { useState } from 'react';
import { useAgent } from '../context/AgentContext';
import { startNewChat } from '../services/api';
import { normalizePhone } from '../utils/helpers';
import './Modal.css';

const NewChatModal = ({ onClose }) => {
  const { currentAgent, conversations, setCurrentConversation } = useAgent();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    try {
      const data = await startNewChat(
        phone,
        name || 'Manual Contact',
        message,
        currentAgent.id,
        currentAgent.name
      );

      if (data.success) {
        alert('Message sent successfully!');
        
        // Find and select the new conversation
        const normalized = normalizePhone(phone);
        setTimeout(() => {
          const newConv = conversations.find((c) => c.phone === normalized);
          if (newConv) {
            setCurrentConversation(newConv);
          }
        }, 1000);
        
        onClose();
      } else {
        setError(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Start chat error:', err);
      setError('Failed to start chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal active" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Start New Chat</h2>
          <p>Enter phone number and initial message</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="+254712345678 or 254712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              required
            />
            <small className="form-hint">
              Include country code (e.g., +254 for Kenya, +91 for India)
            </small>
          </div>

          <div className="form-group">
            <label>Contact Name (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Initial Message</label>
            <textarea
              className="form-textarea"
              placeholder="Hi! I'm reaching out from Nords Weight Loss Clinic..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={4}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-modal btn-modal-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal btn-modal-confirm"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal;
