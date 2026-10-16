import React from 'react';
import { Compass } from 'lucide-react';
import { PlaylistSource } from '../data/sources';

interface CategoryChipsProps {
  sources: PlaylistSource[];
  selectedSourceId: string;
  onSelectSource: (source: PlaylistSource) => void;
  onOpenExplorer: () => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  sources,
  selectedSourceId,
  onSelectSource,
  onOpenExplorer
}) => {
  return (
    <div className="chips-container">
      {/* Botón para abrir el catálogo completo de la API iptv-org */}
      <button
        className="chip-btn"
        onClick={onOpenExplorer}
        style={{
          background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.2), rgba(10, 189, 227, 0.1))',
          borderColor: '#00d2d3',
          color: '#00d2d3',
          fontWeight: 700
        }}
        title="Explorar todos los países y categorías de iptv-org"
      >
        <Compass size={16} />
        <span>+ Países / Géneros</span>
      </button>

      {sources.map((source) => {
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
