import React, { useState, useEffect } from 'react';
import { Cast, Wifi, Tv, ExternalLink, Copy, Check, X, RefreshCw, Smartphone, Play } from 'lucide-react';
import { CastStatus, castService } from '../services/castService';

interface CastModalProps {
  isOpen: boolean;
  castStatus: CastStatus;
  currentStreamUrl?: string;
  currentTitle?: string;
  onClose: () => void;
}

export const CastModal: React.FC<CastModalProps> = ({
  isOpen,
  castStatus,
  currentStreamUrl,
  currentTitle,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen && !castStatus.isConnected) {
      handleSearch();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const connected = await castService.requestSession();
      if (connected) {
        if (currentStreamUrl) {
          castService.loadMedia(currentStreamUrl, currentTitle || 'Canal RinRinTV');
        }
        onClose();
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setTimeout(() => setIsSearching(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (currentStreamUrl) {
      navigator.clipboard.writeText(currentStreamUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenWebVideoCaster = () => {
    if (currentStreamUrl) {
      // Esquema estándar para Web Video Caster / VLC
      const wvcUrl = `wvc-x-callback://open?url=${encodeURIComponent(currentStreamUrl)}&secure_uri=true`;
      window.location.href = wvcUrl;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cast-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="cast-modal-header">
          <div className="cast-modal-title">
            <Cast size={24} color="#00d2d3" />
            <h3>Transmitir a Smart TV / Pantalla</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cast-modal-body">
          {/* Si ya está conectado */}
          {castStatus.isConnected ? (
            <div className="cast-connected-card">
              <div className="cast-connected-badge">
                <span className="pulse-dot"></span> CONECTADO A LA TV
              </div>
              <h4>{castStatus.deviceName || 'Sony Bravia TV'}</h4>
              <p>Canal seleccionado: {currentTitle || 'Transmisión en Vivo'}</p>

              {currentStreamUrl && (
                <button
                  className="chip-btn active"
                  style={{
                    marginTop: '14px',
                    padding: '12px 20px',
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 700
                  }}
                  onClick={() => {
                    castService.loadMedia(currentStreamUrl, currentTitle || 'Canal RinRinTV');
                    onClose();
                  }}
                >
                  <Play size={18} fill="#fff" />
                  <span>Transmitir señal a {castStatus.deviceName || 'la TV'}</span>
                </button>
              )}

              <button
                className="chip-btn"
                style={{ borderColor: '#ff4d4f', color: '#ff4d4f', marginTop: '10px' }}
                onClick={() => castService.stop()}
              >
                Desconectar Transmisión
              </button>
            </div>
          ) : (
            <>
              {/* Radar de búsqueda */}
              <div className="cast-radar-section">
                <div className={`radar-circle ${isSearching ? 'pulsing' : ''}`}>
                  <Tv size={36} color="#00d2d3" />
                </div>
                <h4>
                  {isSearching
                    ? 'Buscando dispositivos en tu red...'
                    : 'Dispositivos de Transmisión'}
                </h4>
                <p>
                  Busca Chromecast, Android TV, Google TV o televisores compatibles conectados a tu Wi-Fi.
                </p>

                <button
                  className="chip-btn active"
                  onClick={handleSearch}
                  disabled={isSearching}
                  style={{ marginTop: '12px' }}
                >
                  <RefreshCw size={16} className={isSearching ? 'spin' : ''} />
                  <span>{isSearching ? 'Buscando...' : 'Buscar Smart TVs en Wi-Fi'}</span>
                </button>
              </div>

              {/* Guía si no aparece el televisor */}
              <div className="cast-help-box">
                <div className="help-item">
                  <Wifi size={18} color="#00d2d3" />
                  <div>
                    <strong>Misma red Wi-Fi</strong>
                    <p>Verifica que tu celular/computadora y tu TV estén conectados a la misma red.</p>
                  </div>
                </div>

                <div className="help-item">
                  <Smartphone size={18} color="#00d2d3" />
                  <div>
                    <strong>Smart TVs Samsung, LG o Roku</strong>
                    <p>Estas TVs usan DLNA en vez de Chromecast. Puedes transmitirles directo con Web Video Caster:</p>
                    {currentStreamUrl && (
                      <button
                        className="cast-alt-btn"
                        onClick={handleOpenWebVideoCaster}
                      >
                        <ExternalLink size={15} /> Abrir en Web Video Caster / VLC
                      </button>
                    )}
                  </div>
                </div>

                {currentStreamUrl && (
                  <div className="help-item">
                    <Copy size={18} color="#00d2d3" />
                    <div style={{ width: '100%' }}>
                      <strong>Copiar Enlace Directo (.m3u8)</strong>
                      <div className="copy-link-row">
                        <input
                          type="text"
                          readOnly
                          value={currentStreamUrl}
                          className="copy-link-input"
                        />
                        <button className="copy-btn" onClick={handleCopyLink}>
                          {copied ? <Check size={16} color="#2ed573" /> : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
