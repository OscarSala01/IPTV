export interface PlaylistSource {
  id: string;
  name: string;
  url: string;
  icon: string;
  type: 'country' | 'category';
}

export const PLAYLIST_SOURCES: PlaylistSource[] = [
  // 🌎 Países
  { id: 'ec', name: 'Ecuador', url: 'https://iptv-org.github.io/iptv/countries/ec.m3u', icon: '🇪🇨', type: 'country' },
  { id: 'cl', name: 'Chile', url: 'https://iptv-org.github.io/iptv/countries/cl.m3u', icon: '🇨🇱', type: 'country' },
  { id: 'ar', name: 'Argentina', url: 'https://iptv-org.github.io/iptv/countries/ar.m3u', icon: '🇦🇷', type: 'country' },
  { id: 'es', name: 'España', url: 'https://iptv-org.github.io/iptv/countries/es.m3u', icon: '🇪🇸', type: 'country' },
  { id: 'br', name: 'Brasil', url: 'https://iptv-org.github.io/iptv/countries/br.m3u', icon: '🇧🇷', type: 'country' },
  { id: 'it', name: 'Italia', url: 'https://iptv-org.github.io/iptv/countries/it.m3u', icon: '🇮🇹', type: 'country' },
  { id: 'uk', name: 'Inglaterra', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u', icon: '🇬🇧', type: 'country' },

  // ⚽ Categorías
  { id: 'sports', name: 'Deportes', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', icon: '⚽', type: 'category' },
  { id: 'spa', name: 'En Español', url: 'https://iptv-org.github.io/iptv/languages/spa.m3u', icon: '🗣️', type: 'category' },
  { id: 'movies', name: 'Películas TV', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', icon: '🎬', type: 'category' },
  { id: 'kids', name: 'Infantil', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u', icon: '👶', type: 'category' },
  { id: 'music', name: 'Música', url: 'https://iptv-org.github.io/iptv/categories/music.m3u', icon: '🎵', type: 'category' },
  { id: 'documentary', name: 'Documentales', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u', icon: '🦁', type: 'category' },
  { id: 'news', name: 'Noticias', url: 'https://iptv-org.github.io/iptv/categories/news.m3u', icon: '📰', type: 'category' },
  { id: 'comedy', name: 'Comedia', url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u', icon: '😄', type: 'category' }
];

// Canales destacados pre-cargados que funcionan directamente con HLS para reproducción instantánea
export const FEATURED_CHANNELS = [
  {
    id: 'rtve-24h',
    name: 'RTVE 24h Noticias',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/RTVE_24h_logo.svg/300px-RTVE_24h_logo.svg.png',
    url: 'https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main_500.m3u8',
    category: 'Noticias',
    country: 'España'
  },
  {
    id: 'telefe-noticias',
    name: 'Telefe Noticias',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Telefe_logo_2018.svg/300px-Telefe_logo_2018.svg.png',
    url: 'https://telefe-live.akamaized.net/live/telefenoticias/master.m3u8',
    category: 'Noticias',
    country: 'Argentina'
  },
  {
    id: 'redbull-tv',
    name: 'Red Bull TV Deportes',
    logo: 'https://resources.redbull.com/logos/redbull-tv-logo.png',
    url: 'https://rbmn-live.akamaized.net/hls/live/590964/geoRBMN/master.m3u8',
    category: 'Deportes',
    country: 'Internacional'
  },
  {
    id: 'nasa-tv',
    name: 'NASA TV HD Documental',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/300px-NASA_logo.svg.png',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    category: 'Documentales',
    country: 'Internacional'
  },
  {
    id: 'euronews-es',
    name: 'Euronews Español',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Euronews_2016_logo.svg/300px-Euronews_2016_logo.svg.png',
    url: 'https://euronews-euronews-spanish-1-es.samsung.wurl.com/manifest/playlist.m3u8',
    category: 'Noticias',
    country: 'En Español'
  },
  {
    id: 'dw-espanol',
    name: 'DW Español',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_logo.svg/300px-Deutsche_Welle_logo.svg.png',
    url: 'https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8',
    category: 'Noticias',
    country: 'En Español'
  }
];
