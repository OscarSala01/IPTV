import { PlaylistSource, PLAYLIST_SOURCES } from '../data/sources';

export interface ApiCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ApiCountry {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}

export interface ApiSourcesResult {
  featuredSources: PlaylistSource[];
  allCountries: PlaylistSource[];
  allCategories: PlaylistSource[];
}

const CACHE_KEY = 'rinrin_api_sources_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const CATEGORY_ICONS: Record<string, string> = {
  sports: '⚽',
  movies: '🎬',
  animation: '🦊',
  series: '📺',
  news: '📰',
  music: '🎵',
  documentary: '🦁',
  comedy: '😄',
  kids: '👶',
  entertainment: '🍿',
  cooking: '🍳',
  science: '🔬',
  outdoor: '🌲',
  classic: '🎞️',
  culture: '🎭',
  education: '📚',
  travel: '✈️',
  auto: '🏎️',
  relax: '🧘',
  weather: '⛅',
  family: '👨‍👩‍👧',
  business: '💼',
  lifestyle: '✨',
  general: '📡'
};

const CATEGORY_NAMES_ES: Record<string, string> = {
  sports: 'Deportes',
  movies: 'Películas TV',
  animation: 'Animación',
  series: 'Series TV',
  news: 'Noticias',
  music: 'Música',
  documentary: 'Documentales',
  comedy: 'Comedia',
  kids: 'Infantil',
  entertainment: 'Entretenimiento',
  cooking: 'Cocina',
  science: 'Ciencia y Tec',
  outdoor: 'Naturaleza',
  classic: 'Cine Clásico',
  culture: 'Cultura',
  education: 'Educación',
  travel: 'Viajes',
  auto: 'Motores / Autos',
  relax: 'Relax & Paisajes',
  weather: 'Clima',
  family: 'Familiar',
  business: 'Negocios',
  lifestyle: 'Estilo de Vida',
  general: 'General'
};

// Países destacados en orden de prioridad para la barra principal
const FEATURED_COUNTRY_CODES = ['ec', 'co', 'mx', 'ar', 'pe', 'cl', 'es', 'uy', 'bo', 'py', 've', 'us', 'br', 'it', 'uk'];

class IptvApiService {
  /**
   * Obtiene la lista dinámica de países y categorías desde la API oficial de iptv-org
   * Utiliza caché en localStorage (24h) para carga instantánea
   */
  public async getSources(): Promise<ApiSourcesResult> {
    // 1. Intentar cargar desde caché local
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS && data) {
          // Actualizar en segundo plano si la caché tiene más de 12 horas
          if (Date.now() - timestamp > 12 * 60 * 60 * 1000) {
            this.fetchFromApi().then((fresh) => this.saveToCache(fresh)).catch(() => {});
          }
          return data;
        }
      }
    } catch (e) {
      console.warn('Error leyendo caché de API IPTV:', e);
    }

    // 2. Si no hay caché o expiró, consultar la API oficial
    try {
      const freshData = await this.fetchFromApi();
      this.saveToCache(freshData);
      return freshData;
    } catch (err) {
      console.warn('Error consultando API de iptv-org, usando fuentes predeterminadas:', err);
      return {
        featuredSources: PLAYLIST_SOURCES,
        allCountries: PLAYLIST_SOURCES.filter((s) => s.type === 'country'),
        allCategories: PLAYLIST_SOURCES.filter((s) => s.type === 'category')
      };
    }
  }

  private async fetchFromApi(): Promise<ApiSourcesResult> {
    const [catsRes, countriesRes] = await Promise.all([
      fetch('https://iptv-org.github.io/api/categories.json'),
      fetch('https://iptv-org.github.io/api/countries.json')
    ]);

    if (!catsRes.ok || !countriesRes.ok) {
      throw new Error('Error al conectar con la API de iptv-org');
    }

    const categoriesRaw: ApiCategory[] = await catsRes.json();
    const countriesRaw: ApiCountry[] = await countriesRes.json();

    // 1. Procesar Categorías (excluir contenido adulto 'xxx')
    const allCategories: PlaylistSource[] = categoriesRaw
      .filter((cat) => cat.id && cat.id.toLowerCase() !== 'xxx')
      .map((cat) => {
        const id = cat.id.toLowerCase();
        return {
          id: `cat-${id}`,
          name: CATEGORY_NAMES_ES[id] || cat.name,
          icon: CATEGORY_ICONS[id] || '📺',
          url: `https://iptv-org.github.io/iptv/categories/${id}.m3u`,
          type: 'category' as const
        };
      });

    // 2. Procesar Países
    const allCountries: PlaylistSource[] = countriesRaw.map((c) => {
      const code = c.code.toLowerCase();
      return {
        id: `country-${code}`,
        name: c.name,
        icon: c.flag || '🌐',
        url: `https://iptv-org.github.io/iptv/countries/${code}.m3u`,
        type: 'country' as const
      };
    });

    // 3. Crear lista destacada para la barra horizontal principal
    // Incluye países hispanohablantes clave + principales categorías
    const featuredCountries: PlaylistSource[] = [];
    for (const code of FEATURED_COUNTRY_CODES) {
      const found = allCountries.find((c) => c.id === `country-${code}`);
      if (found) {
        featuredCountries.push(found);
      }
    }

    // Categorías destacadas
    const featuredCategoryIds = ['sports', 'movies', 'animation', 'series', 'kids', 'music', 'news', 'comedy', 'documentary', 'cooking'];
    const featuredCategories = allCategories.filter((cat) =>
      featuredCategoryIds.includes(cat.id.replace('cat-', ''))
    );

    // Añadir fuente especial "En Español"
    const spanishSource: PlaylistSource = {
      id: 'lang-spa',
      name: 'En Español',
      icon: '🗣️',
      url: 'https://iptv-org.github.io/iptv/languages/spa.m3u',
      type: 'category'
    };

    const featuredSources: PlaylistSource[] = [
      ...featuredCountries,
      spanishSource,
      ...featuredCategories
    ];

    return {
      featuredSources,
      allCountries,
      allCategories
    };
  }

  private saveToCache(data: ApiSourcesResult) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          data
        })
      );
    } catch (e) {
      console.warn('Error guardando caché de API IPTV:', e);
    }
  }
}

export const iptvApiService = new IptvApiService();
