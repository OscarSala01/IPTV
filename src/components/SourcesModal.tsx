import React, { useState } from 'react';
import { X, Search, Globe, Tv, Check } from 'lucide-react';
import { PlaylistSource } from '../data/sources';

interface SourcesModalProps {
  isOpen: boolean;
  selectedSourceId: string;
  allCountries: PlaylistSource[];
  allCategories: PlaylistSource[];
  onSelectSource: (source: PlaylistSource) => void;
  onClose: () => void;
}

export const SourcesModal: React.FC<SourcesModalProps> = ({
  isOpen,
  selectedSourceId,
  allCountries,
  allCategories,
  onSelectSource,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'countries' | 'categories'>('countries');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentList = activeTab === 'countries' ? allCountries : allCategories;
  const filteredList = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cast-modal-box" style={{ maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="cast-modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="cast-modal-title">
            <Globe size={22} color="#00d2d3" />
            <h3 style={{ fontSize: '1.15rem' }}>Catálogo Oficial iptv-org API</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Buscador interno */}
        <div style={{ padding: '12px 18px 6px 18px' }}>
          <div className="search-box" style={{ width: '100%', margin: 0 }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={activeTab === 'countries' ? 'Buscar país (Colombia, México, Japón...)' : 'Buscar género (Animación, Cocina, Deportes...)'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Selector de Pestañas (Países vs Categorías) */}
        <div style={{ display: 'flex', gap: '8px', padding: '8px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            className={`chip-btn ${activeTab === 'countries' ? 'active' : ''}`}
            onClick={() => setActiveTab('countries')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Globe size={16} />
            <span>Países del Mundo ({allCountries.length})</span>
          </button>
          <button
            className={`chip-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Tv size={16} />
            <span>Categorías / Géneros ({allCategories.length})</span>
          </button>
        </div>

        {/* Grid de opciones con scroll suave */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
          {filteredList.map((item) => {
            const isSelected = item.id === selectedSourceId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSource(item);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: isSelected ? 'rgba(0, 210, 211, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected ? '1px solid #00d2d3' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  color: isSelected ? '#00d2d3' : '#e0e6ed',
                  fontSize: '0.88rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.name}
                </span>
                {isSelected && <Check size={16} color="#00d2d3" />}
              </button>
            );
          })}

          {filteredList.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 10px', color: '#8e95a5' }}>
              No se encontraron resultados para "{searchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
