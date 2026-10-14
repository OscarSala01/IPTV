import React from 'react';
import { PLAYLIST_SOURCES, PlaylistSource } from '../data/sources';

interface CategoryChipsProps {
  selectedSourceId: string;
  onSelectSource: (source: PlaylistSource) => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedSourceId,
  onSelectSource
}) => {
  return (
    <div className="chips-container">
      {PLAYLIST_SOURCES.map((source) => {
        const isActive = source.id === selectedSourceId;
        return (
          <button
            key={source.id}
            className={`chip-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectSource(source)}
          >
            <span>{source.icon}</span>
            <span>{source.name}</span>
          </button>
        );
      })}
    </div>
  );
};
