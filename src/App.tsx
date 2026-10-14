import React, { useState, useEffect } from 'react';
import { Tv, Film, Clapperboard, Star, Loader2 } from 'lucide-react';
import { Channel, VodItem, ActiveTab } from './types';
import { PLAYLIST_SOURCES, PlaylistSource, FEATURED_CHANNELS } from './data/sources';
import { M3uParserService } from './services/m3uParser';
import { castService, CastStatus } from './services/castService';
import { Navbar } from './components/Navbar';
import { CategoryChips } from './components/CategoryChips';
import { ChannelCard } from './components/ChannelCard';
import { VideoModal } from './components/VideoModal';
import { CastFloatingBar } from './components/CastFloatingBar';
import { VodSection } from './components/VodSection';
import { CastModal } from './components/CastModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [selectedSource, setSelectedSource] = useState<PlaylistSource>(PLAYLIST_SOURCES[0]);
  const [channels, setChannels] = useState<Channel[]>(FEATURED_CHANNELS);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMedia, setSelectedMedia] = useState<Channel | VodItem | null>(null);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [isCastModalOpen, setIsCastModalOpen] = useState<boolean>(false);
  const [castStatus, setCastStatus] = useState<CastStatus>({
    isAvailable: false,
    isConnected: false,
    deviceName: null,
    currentTitle: null,
    isPaused: false
  });

  // 1. Escuchar estado de Google Cast
  useEffect(() => {
    const unsubscribe = castService.subscribe((status) => {
      setCastStatus(status);
    });
    return unsubscribe;
  }, []);

  // 2. Cargar favoritos guardados en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('golstream_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error cargando favoritos:', e);
    }
  }, []);

  // 3. Cargar canales de la lista M3U seleccionada
  useEffect(() => {
    let isCancelled = false;

    async function loadSourceChannels() {
      setIsLoadingChannels(true);
      try {
        const fetched = await M3uParserService.fetchAndParse(
          selectedSource.url,
          selectedSource.name
        );
        if (!isCancelled) {
          if (fetched.length > 0) {
            setChannels(fetched);
          } else {
            // Si la lista está vacía o bloqueada por CORS, mantener los canales destacados
            setChannels(FEATURED_CHANNELS);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setChannels(FEATURED_CHANNELS);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingChannels(false);
        }
      }
    }

    loadSourceChannels();

    return () => {
      isCancelled = true;
    };
  }, [selectedSource]);

  // Manejar Favoritos
  const toggleFavorite = (channel: Channel) => {
    setFavorites((prev) => {
      const exists = prev.some((c) => c.url === channel.url);
      let updated: Channel[];
      if (exists) {
        updated = prev.filter((c) => c.url !== channel.url);
      } else {
        updated = [...prev, channel];
      }
      try {
        localStorage.setItem('golstream_favorites', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const isChannelFavorite = (channel: Channel) => {
    return favorites.some((c) => c.url === channel.url);
  };

  // Función recursiva y unificada para reproducir canales:
  // Si está conectado a Chromecast, cambia la señal en la TV sin abrir video en el teléfono.
  // Si no está conectado, abre el reproductor en el teléfono.
  const handleSelectMedia = (media: Channel | VodItem) => {
    const title = 'name' in media ? media.name : media.title;
    const logo = 'logo' in media ? media.logo : media.poster;

    if (castStatus.isConnected) {
      castService.castMedia(media.url, title, logo);
      setSelectedMedia(null); // No abre video en la app, queda la pantalla limpia con la barra de control
    } else {
      setSelectedMedia(media);
    }
  };

  // Control Remoto: Canal Siguiente
  const handleNextChannel = () => {
    if (channels.length === 0) return;
    const currentIdx = channels.findIndex((c) => c.name === castStatus.currentTitle);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % channels.length;
    handleSelectMedia(channels[nextIdx]);
  };

  // Control Remoto: Canal Anterior
  const handlePrevChannel = () => {
    if (channels.length === 0) return;
    const currentIdx = channels.findIndex((c) => c.name === castStatus.currentTitle);
    const prevIdx = currentIdx === -1 ? 0 : (currentIdx - 1 + channels.length) % channels.length;
    handleSelectMedia(channels[prevIdx]);
  };

  // Filtrar canales según búsqueda
  const filteredChannels = channels.filter((ch) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return ch.name.toLowerCase().includes(q) || ch.category.toLowerCase().includes(q);
  });

  return (
    <div className="app-container">
      {/* Barra de navegación superior con buscador y botón Cast */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        castStatus={castStatus}
        onOpenCast={() => setIsCastModalOpen(true)}
      />

      {/* Contenido según la pestaña activa */}
      {activeTab === 'live' && (
        <>
          {/* Selector horizontal de países y categorías */}
          <CategoryChips
            selectedSourceId={selectedSource.id}
            onSelectSource={setSelectedSource}
          />

          {/* Estado de carga */}
          {isLoadingChannels ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                gap: '12px',
                color: '#8e95a5'
              }}
            >
              <Loader2 size={36} className="cast-pulse-icon" />
              <p>Cargando canales de {selectedSource.name}...</p>
            </div>
          ) : (
            <div className="channels-grid">
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isFavorite={isChannelFavorite(channel)}
                  onSelect={handleSelectMedia}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'movies' && (
        <VodSection
          filterType="movie"
          searchQuery={searchQuery}
          onSelectVod={handleSelectMedia}
        />
      )}

      {activeTab === 'series' && (
        <VodSection
          filterType="series"
          searchQuery={searchQuery}
          onSelectVod={handleSelectMedia}
        />
      )}

      {activeTab === 'favorites' && (
        <div>
          <div style={{ padding: '16px 20px 4px 20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>⭐ Tus Canales Favoritos</h2>
            <p style={{ fontSize: '0.82rem', color: '#8e95a5', marginTop: '4px' }}>
              Acceso instantáneo a tus transmisiones preferidas.
            </p>
          </div>

          {favorites.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#8e95a5'
              }}
            >
              <Star size={48} color="#2a2e45" style={{ marginBottom: '12px' }} />
              <p style={{ fontWeight: 600 }}>Aún no tienes canales favoritos.</p>
              <p style={{ fontSize: '0.85rem' }}>
                Toca la estrella en cualquier canal para guardarlo aquí.
              </p>
            </div>
          ) : (
            <div className="channels-grid">
              {favorites.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isFavorite={true}
                  onSelect={handleSelectMedia}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de control flotante de Chromecast (Estilo Control Remoto YouTube) */}
      <CastFloatingBar
        castStatus={castStatus}
        onPrevChannel={handlePrevChannel}
        onNextChannel={handleNextChannel}
      />

      {/* Modal de reproducción con selector de calidad y menú de zapping de canales */}
      {selectedMedia && (
        <VideoModal
          media={selectedMedia}
          castStatus={castStatus}
          currentSource={selectedSource}
          sources={PLAYLIST_SOURCES}
          channels={channels}
          isLoadingChannels={isLoadingChannels}
          onSelectChannel={handleSelectMedia}
          onSelectSource={(src) => setSelectedSource(src)}
          onOpenCast={() => setIsCastModalOpen(true)}
          onClose={() => setSelectedMedia(null)}
        />
      )}

      {/* Modal interactivo de detección y guía de Smart TV / Chromecast */}
      <CastModal
        isOpen={isCastModalOpen}
        castStatus={castStatus}
        currentStreamUrl={selectedMedia?.url}
        currentTitle={
          selectedMedia
            ? 'name' in selectedMedia
              ? selectedMedia.name
              : selectedMedia.title
            : undefined
        }
        onClose={() => setIsCastModalOpen(false)}
      />

      {/* Navegación inferior fija estilo aplicación móvil */}
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Tv size={20} />
          <span>TV en Vivo</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'movies' ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          <Film size={20} />
          <span>Películas</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'series' ? 'active' : ''}`}
          onClick={() => setActiveTab('series')}
        >
          <Clapperboard size={20} />
          <span>Series</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          <Star size={20} />
          <span>Favoritos</span>
        </button>
      </nav>
    </div>
  );
};
export default App;
