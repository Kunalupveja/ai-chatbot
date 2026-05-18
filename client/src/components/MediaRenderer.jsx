import React from 'react';
import { formatFileSize } from '../utils/helpers';
import './MediaRenderer.css';

const MediaRenderer = ({ message }) => {
  const { mediaType, mediaUrl, mediaMimeType, mediaFilename, mediaSize, mediaCaption } = message;

  if (!mediaType || !mediaUrl) return null;

  const renderMedia = () => {
    switch (mediaType) {
      case 'image':
        return (
          <div className="media-image">
            <img
              src={mediaUrl}
              alt="Image"
              onClick={() => window.open(mediaUrl, '_blank')}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect fill="%23f3f4f6" width="300" height="200"/><text x="50%" y="50%" text-anchor="middle" fill="%239ca3af">Image unavailable</text></svg>';
              }}
            />
            {mediaSize && <div className="media-info">📸 {formatFileSize(mediaSize)}</div>}
          </div>
        );

      case 'video':
        return (
          <div className="media-video">
            <video controls preload="metadata">
              <source src={mediaUrl} type={mediaMimeType || 'video/mp4'} />
              Your browser does not support video playback.
            </video>
            {mediaSize && <div className="media-info">🎥 {formatFileSize(mediaSize)}</div>}
          </div>
        );

      case 'document':
        return (
          <div className="media-document">
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="document-link" download={mediaFilename}>
              <span>📄</span>
              <span>{mediaFilename}</span>
            </a>
            {mediaSize && <div className="media-info">{formatFileSize(mediaSize)}</div>}
          </div>
        );

      case 'audio':
      case 'voice':
        return (
          <div className="media-audio">
            <audio controls preload="metadata">
              <source src={mediaUrl} type={mediaMimeType || 'audio/ogg'} />
              Your browser does not support audio playback.
            </audio>
            {mediaSize && (
              <div className="media-info">
                {mediaType === 'voice' ? '🎤' : '🎵'} {formatFileSize(mediaSize)}
              </div>
            )}
          </div>
        );

      case 'sticker':
        return (
          <div className="media-sticker">
            <img src={mediaUrl} alt="Sticker" onError={(e) => (e.target.style.display = 'none')} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="media-container">
      {renderMedia()}
      {mediaCaption && <div className="media-caption">{mediaCaption}</div>}
    </div>
  );
};

export default MediaRenderer;
