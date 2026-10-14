import React, { useState } from 'react';
import { Tv, Star } from 'lucide-react';
import { Channel } from '../types';

interface ChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  onSelect: (channel: Channel) => void;
  onToggleFavorite: (channel: Channel) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isFavorite,
  onSelect,
  onToggleFavorite
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="channel-card" onClick={() => onSelect(channel)}>
      <button
        className={`fav-btn ${isFavorite ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(channel);
        }}
        title={isFavorite ? 'Quitar de Favoritos' : 'Guardar en Favoritos'}
      >
        <Star size={16} fill={isFavorite ? '#f1c40f' : 'none'} />
      </button>

      <div className="channel-logo-wrap">
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="channel-logo"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <Tv size={36} color="#8e95a5" />
        )}
      </div>

      <div className="channel-title" title={channel.name}>
        {channel.name}
      </div>

      <div className="channel-tag">{channel.country || channel.category}</div>
    </div>
  );
};
