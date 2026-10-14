import React from 'react';
import { Play } from 'lucide-react';
import { VodItem } from '../types';
import { VOD_CATALOG } from '../services/vodData';

interface VodSectionProps {
  filterType: 'movie' | 'series';
  searchQuery: string;
  onSelectVod: (item: VodItem) => void;
}

export const VodSection: React.FC<VodSectionProps> = ({
  filterType,
  searchQuery,
  onSelectVod
}) => {
  const items = VOD_CATALOG.filter((item) => {
    const matchesType = item.type === filterType;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div>
      <div style={{ padding: '16px 20px 4px 20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
          {filterType === 'movie' ? '🎬 Películas Disponibles' : '🍿 Series y Maratones'}
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#8e95a5', marginTop: '4px' }}>
          {filterType === 'movie'
            ? 'Películas completas sin anuncios, listas para reproducir o enviar a tu Chromecast.'
            : 'Temporadas y episodios completos para disfrutar en pantalla grande.'}
        </p>
      </div>

      <div className="vod-grid">
        {items.map((vod) => (
          <div
            key={vod.id}
            className="vod-card"
            onClick={() => onSelectVod(vod)}
            title={vod.title}
          >
            <img
              src={vod.poster}
              alt={vod.title}
              className="vod-poster"
              loading="lazy"
            />
            <div className="vod-overlay">
              <span className="vod-meta">{vod.year} • {vod.category}</span>
              <div className="vod-title">{vod.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
