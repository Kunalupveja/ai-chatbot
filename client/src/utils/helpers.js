// Format timestamp to relative time
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return date.toLocaleDateString();
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '';

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

// Escape HTML
export const escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Normalize phone number
export const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
};

// Get message status icon and text
export const getMessageStatus = (status) => {
  switch (status) {
    case 'read':
      return { icon: '✓✓', text: 'Read', color: '#3b82f6' };
    case 'delivered':
      return { icon: '✓✓', text: 'Delivered', color: '#6b7280' };
    case 'sent':
      return { icon: '✓', text: 'Sent', color: '#9ca3af' };
    case 'failed':
      return { icon: '✗', text: 'Failed', color: '#ef4444' };
    default:
      return { icon: '✓', text: 'Sent', color: '#9ca3af' };
  }
};

// Check if message is media placeholder
export const isMediaPlaceholder = (text) => {
  const placeholders = ['[Image]', '[Video]', '[Document]', '[Audio]', '[Voice Message]', '[Sticker]'];
  return placeholders.includes(text);
};

// Get avatar text
export const getAvatarText = (type, name) => {
  if (type === 'user') return name?.charAt(0)?.toUpperCase() || 'U';
  if (type === 'ai') return '🤖';
  return '👤';
};

// LocalStorage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
};
