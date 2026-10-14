import React from 'react';
import { Cast, Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';
import { CastStatus, castService } from '../services/castService';

interface CastFloatingBarProps {
  castStatus: CastStatus;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
}

export const CastFloatingBar: React.FC<CastFloatingBarProps> = ({
  castStatus,
  onPrevChannel,
  onNextChannel
}) => {
  if (!castStatus.isConnected) return null;

  return (
    <div className="cast-floating-bar">
      <div className="cast-floating-info">
        <Cast size={22} className="cast-pulse-icon" />
        <div style={{ minWidth: 0 }}>
          <div className="cast-channel-name" title={castStatus.currentTitle || 'Transmitiendo'}>
            {castStatus.currentTitle || 'Transmitiendo en TV'}
          </div>
          <div className="cast-tv-name">
            {castStatus.deviceName || 'Sony Bravia TV'}
          </div>
        </div>
      </div>

      {/* Controles de control remoto */}
      <div className="cast-actions">
        {/* Canal Anterior */}
        <button
          className="cast-ctrl-btn"
          onClick={onPrevChannel}
          title="Canal Anterior (Retroceder)"
        >
          <SkipBack size={18} />
        </button>

        {/* Play / Pausa */}
        {castStatus.isPaused ? (
          <button
            className="cast-ctrl-btn highlight"
            onClick={() => castService.play()}
            title="Reanudar en TV"
          >
            <Play size={18} fill="#fff" />
          </button>
        ) : (
          <button
            className="cast-ctrl-btn highlight"
            onClick={() => castService.pause()}
            title="Pausar en TV"
          >
            <Pause size={18} fill="#fff" />
          </button>
        )}

        {/* Canal Siguiente */}
        <button
          className="cast-ctrl-btn"
          onClick={onNextChannel}
          title="Canal Siguiente (Avanzar)"
        >
          <SkipForward size={18} />
        </button>

        {/* Desconectar */}
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
