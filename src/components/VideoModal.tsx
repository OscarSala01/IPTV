import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Cast,
  AlertCircle,
  Maximize2,
  Tv,
  Settings,
  List,
  Check,
  Search,
  Volume2,
  VolumeX,
  Play,
  Pause,
  X
} from 'lucide-react';
import { Channel, VodItem } from '../types';
import { PlaylistSource } from '../data/sources';
import { castService, CastStatus } from '../services/castService';
import { CastModal } from './CastModal';

interface VideoQuality {
  id: number; // -1 = Auto
  label: string;
  height: number;
  bitrate?: number;
}

interface VideoModalProps {
  media: Channel | VodItem;
  castStatus: CastStatus;
  currentSource?: PlaylistSource;
  sources: PlaylistSource[];
  channels: Channel[];
  isLoadingChannels?: boolean;
  onSelectChannel: (channel: Channel) => void;
  onSelectSource: (source: PlaylistSource) => void;
  onOpenCast?: () => void;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  media,
  castStatus,
  currentSource,
  sources,
  channels,
  isLoadingChannels,
  onSelectChannel,
  onSelectSource,
  onOpenCast,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  // Calidades disponibles y seleccionada
  const [qualities, setQualities] = useState<VideoQuality[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<number>(-1); // -1 = Auto
  const [currentResolution, setCurrentResolution] = useState<string>('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Menú de canales desplegable en pantalla grande (Zapping)
  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);

  // Control de aparición / desaparición de botones al hacer clic en pantalla
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (!showChannelDrawer && !showQualityMenu && !isCastModalOpen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [showChannelDrawer, showQualityMenu, isCastModalOpen]);

  // Al conectarse a Chromecast, cerramos el reproductor local del teléfono para transmitir solo a la TV
  useEffect(() => {
    if (castStatus.isConnected) {
      onClose();
    }
  }, [castStatus.isConnected, onClose]);

  const handleScreenClick = () => {
    if (!showControls) {
      resetControlsTimer();
    } else {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  };

  const title = 'name' in media ? media.name : media.title;
  const logo = 'logo' in media ? media.logo : media.poster;
  const currentUrl = media.url;

  // Inicializar o recargar reproductor HLS cuando cambia la URL
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    castService.registerActiveVideo(video);

    setErrorMsg(null);
    setQualities([]);
    setSelectedQuality(-1);
    setCurrentResolution('Auto');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = currentUrl.includes('.m3u8') || currentUrl.includes('/hls/');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsRef.current = hls;

      hls.loadSource(currentUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // Extraer niveles de calidad disponibles
        if (data.levels && data.levels.length > 0) {
          const parsedQualities: VideoQuality[] = [
            { id: -1, label: 'Automático (Recomendado)', height: 0 }
          ];

          data.levels.forEach((lvl, idx) => {
            const h = lvl.height || Math.round((lvl.bitrate || 0) / 3000);
            const label = h > 0 ? `${h}p` : `Calidad ${idx + 1}`;
            parsedQualities.push({
              id: idx,
              label,
              height: h,
              bitrate: lvl.bitrate
            });
          });

          // Ordenar calidades de mayor a menor (dejando Auto primero)
          const auto = parsedQualities[0];
          const rest = parsedQualities.slice(1).sort((a, b) => b.height - a.height);
          setQualities([auto, ...rest]);
        }

        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      // Detectar cuando el reproductor cambia de nivel en modo Auto
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl && lvl.height) {
          if (hls.autoLevelEnabled) {
            setCurrentResolution(`Auto (${lvl.height}p)`);
          } else {
            setCurrentResolution(`${lvl.height}p`);
          }
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setErrorMsg('Conexión inestable o señal temporalmente no disponible.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setErrorMsg('No se pudo reproducir este stream.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS nativo
      video.src = currentUrl;
      video.play().catch(() => {});
    } else {
      // MP4 u otro video directo
      video.src = currentUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.src = '';
      }
      castService.registerActiveVideo(null);
    };
  }, [currentUrl]);

  // Cambiar calidad de video
  const handleSelectQuality = (qualityId: number) => {
    setSelectedQuality(qualityId);
    setShowQualityMenu(false);

    if (hlsRef.current) {
      if (qualityId === -1) {
        // Modo Auto
        hlsRef.current.currentLevel = -1;
        setCurrentResolution('Auto');
      } else {
        // Calidad fija (ej: 720p, 480p)
        hlsRef.current.currentLevel = qualityId;
        const q = qualities.find((item) => item.id === qualityId);
        if (q) setCurrentResolution(q.label);
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleFullScreen = () => {
    const el = containerRef.current || videoRef.current;
    if (el) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    }
  };

  const handleCast = () => {
    setIsCastModalOpen(true);
  };

  // Canales filtrados en el buscador interno del drawer
  const filteredDrawerChannels = channels.filter((ch) => {
    if (!drawerSearch.trim()) return true;
    const q = drawerSearch.toLowerCase();
    return ch.name.toLowerCase().includes(q) || ch.category.toLowerCase().includes(q);
  });

  return (
    <div className="player-fullscreen-overlay">
      <div className="player-main-area" ref={containerRef}>
        {/* Barra superior de control: Botón Atrás + Título + Acciones (Auto-ocultable) */}
        <div className={`player-top-header ${!showControls ? 'hidden-controls' : ''}`}>
          <button className="player-back-btn" onClick={onClose} title="Regresar a RinRinTV">
            <ArrowLeft size={20} />
            <span>Atrás</span>
          </button>

          <div className="player-header-title">
            {logo && <img src={logo} alt="" className="player-header-logo" />}
            <div className="player-header-text">
              <span className="live-pill">🔴 EN VIVO</span>
              <h3>{title}</h3>
            </div>
          </div>

          <div className="player-header-actions">
            {/* Botón para abrir el Menú de Canales (Zapping) */}
            <button
              className={`player-action-pill ${showChannelDrawer ? 'active' : ''}`}
              onClick={() => {
                setShowChannelDrawer(!showChannelDrawer);
                resetControlsTimer();
              }}
              title="Ver lista de canales mientras se reproduce la TV"
            >
              <List size={18} />
              <span className="hide-mobile">Canales</span>
            </button>

            {/* Selector de Calidad (Auto / 1080p / 720p / 480p) */}
            <div className="quality-dropdown-wrap">
              <button
                className={`player-action-pill ${selectedQuality !== -1 ? 'highlight' : ''}`}
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  resetControlsTimer();
                }}
                title="Cambiar calidad de imagen"
              >
                <Settings size={17} />
                <span>{currentResolution}</span>
              </button>

              {showQualityMenu && (
                <div className="quality-menu-popup">
                  <div className="quality-menu-header">Calidad de Video</div>
                  {qualities.length === 0 ? (
                    <div className="quality-menu-item disabled">Calidad única / Automática</div>
                  ) : (
                    qualities.map((q) => (
                      <button
                        key={q.id}
                        className={`quality-menu-item ${selectedQuality === q.id ? 'active' : ''}`}
                        onClick={() => handleSelectQuality(q.id)}
                      >
                        <span>{q.label}</span>
                        {selectedQuality === q.id && <Check size={16} color="#00d2d3" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Transmitir a TV (Chromecast) */}
            <button
              className={`player-action-pill ${castStatus.isConnected ? 'cast-active' : ''}`}
              onClick={handleCast}
              title="Transmitir a Smart TV / Chromecast"
            >
              <Cast size={18} />
              <span className="hide-mobile">
                {castStatus.isConnected ? 'En TV' : 'Transmitir'}
              </span>
            </button>

            {/* Pantalla Completa */}
            <button
              className="player-icon-btn"
              onClick={handleFullScreen}
              title="Pantalla Completa"
            >
              <Maximize2 size={19} />
            </button>
          </div>
        </div>

        {/* Video en Vivo con Pantalla Limpia (oculta controles al hacer clic o al estar quieto) */}
        <div
          className={`player-video-wrapper ${!showControls ? 'hide-cursor' : ''}`}
          onClick={handleScreenClick}
          onMouseMove={resetControlsTimer}
          onTouchStart={resetControlsTimer}
        >
          <video
            ref={videoRef}
            className="player-video"
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Cartel de error / reconexión */}
          {errorMsg && (
            <div className="player-error-banner">
              <AlertCircle size={44} color="#e50914" />
              <h4>{errorMsg}</h4>
              <p>
                Prueba a bajar la calidad a 480p/Auto o selecciona otro canal de la lista.
              </p>
              <button
                className="chip-btn active"
                onClick={() => setShowChannelDrawer(true)}
                style={{ marginTop: '8px' }}
              >
                <List size={16} /> Abrir Lista de Canales
              </button>
            </div>
          )}

          {/* Controles rápidos en video al pasar cursor */}
          <div
            className={`player-overlay-controls ${!showControls ? 'hidden-controls' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="player-icon-btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button className="player-icon-btn" onClick={toggleMute}>
              {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>

            <span className="player-live-indicator">
              <span className="pulse-dot"></span> EN VIVO
            </span>
          </div>
        </div>

        {/* 📋 MENÚ LATERAL DESPLEGABLE CON TODOS LOS CANALES (ZAPPING) */}
        {showChannelDrawer && (
          <aside className="channel-drawer">
            <div className="drawer-header">
              <div>
                <h4>Guía de Canales</h4>
                <p>La TV sigue reproduciéndose en el fondo</p>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setShowChannelDrawer(false)}
                title="Cerrar lista"
              >
                <X size={20} />
              </button>
            </div>

            {/* Buscador dentro del menú */}
            <div className="drawer-search">
              <Search size={16} className="drawer-search-icon" />
              <input
                type="text"
                placeholder="Buscar canal..."
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
              />
            </div>

            {/* Pestañas de países y categorías para cambiar de lista */}
            <div className="drawer-categories">
              {sources.map((src) => {
                const isSelected = currentSource?.id === src.id;
                return (
                  <button
                    key={src.id}
                    className={`drawer-cat-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => onSelectSource(src)}
                  >
                    <span>{src.icon}</span>
                    <span>{src.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Lista de canales scrolleable */}
            <div className="drawer-channels-list">
              {isLoadingChannels ? (
                <div className="drawer-loading">Cargando canales...</div>
              ) : filteredDrawerChannels.length === 0 ? (
                <div className="drawer-loading">No se encontraron canales.</div>
              ) : (
                filteredDrawerChannels.map((ch) => {
                  const isCurrent = 'url' in media && media.url === ch.url;
                  return (
                    <div
                      key={ch.id}
                      className={`drawer-channel-row ${isCurrent ? 'active' : ''}`}
                      onClick={() => {
                        onSelectChannel(ch);
                        if (castStatus.isConnected) {
                          castService.loadMedia(ch.url, ch.name, ch.logo);
                        }
                      }}
                    >
                      <div className="drawer-channel-logo">
                        {ch.logo ? (
                          <img src={ch.logo} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <Tv size={20} color="#8e95a5" />
                        )}
                      </div>

                      <div className="drawer-channel-info">
                        <span className="drawer-channel-name">{ch.name}</span>
                        <span className="drawer-channel-category">{ch.category || ch.country}</span>
                      </div>

                      {isCurrent && <span className="drawer-playing-badge">REPRODUCIENDO</span>}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Modal de Transmisión dentro del área del reproductor (visible en Pantalla Completa) */}
        <CastModal
          isOpen={isCastModalOpen}
          castStatus={castStatus}
          currentStreamUrl={currentUrl}
          currentTitle={title}
          onClose={() => setIsCastModalOpen(false)}
        />
      </div>
    </div>
  );
};
