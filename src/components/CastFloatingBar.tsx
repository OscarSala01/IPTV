import React from 'react';
import { Cast, Play, Pause, Square } from 'lucide-react';
import { CastStatus, castService } from '../services/castService';

interface CastFloatingBarProps {
  castStatus: CastStatus;
}

export const CastFloatingBar: React.FC<CastFloatingBarProps> = ({ castStatus }) => {
  if (!castStatus.isConnected) return null;

  return (
    <div className="cast-floating-bar">
      <div className="cast-floating-info">
        <Cast size={24} className="cast-pulse-icon" />
        <div>
          <div className="cast-channel-name">
            {castStatus.currentTitle || 'Transmitiendo en TV'}
          </div>
          <div className="cast-tv-name">
            En pantalla: {castStatus.deviceName || 'Smart TV'}
          </div>
        </div>
      </div>

      <div className="cast-actions">
        {castStatus.isPaused ? (
          <button
            className="cast-ctrl-btn"
            onClick={() => castService.play()}
            title="Reanudar en TV"
          >
            <Play size={18} fill="#fff" />
          </button>
        ) : (
          <button
            className="cast-ctrl-btn"
            onClick={() => castService.pause()}
            title="Pausar en TV"
          >
            <Pause size={18} fill="#fff" />
          </button>
        )}

        <button
          className="cast-ctrl-btn"
          onClick={() => castService.stop()}
          title="Detener transmisión"
          style={{ color: '#ff4d4f' }}
        >
          <Square size={16} fill="#ff4d4f" />
        </button>
      </div>
    </div>
  );
};
