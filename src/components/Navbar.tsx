import React from 'react';
import { Tv, Search, Cast } from 'lucide-react';
import { CastStatus, castService } from '../services/castService';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  castStatus: CastStatus;
  onOpenCast: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  castStatus,
  onOpenCast
}) => {
  const handleCastClick = () => {
    onOpenCast();
  };

  return (
    <header className="navbar">
      <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="brand-icon">
          <Tv size={20} />
        </div>
        <div className="brand-title">
          Rin<span>Rin</span>TV
        </div>
      </div>

      <div className="search-box">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar canal, fútbol, país..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <button
        className={`cast-button ${castStatus.isConnected ? 'connected' : ''}`}
        onClick={handleCastClick}
        title={castStatus.isConnected ? `Conectado a ${castStatus.deviceName}` : 'Transmitir a Smart TV / Chromecast'}
      >
        <Cast size={18} />
        <span className="cast-text">
          {castStatus.isConnected ? castStatus.deviceName : 'Transmitir'}
        </span>
      </button>
    </header>
  );
};
