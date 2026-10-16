import { Channel } from '../types';

export class M3uParserService {
  private static cache: Map<string, Channel[]> = new Map();

  /**
   * Descarga y parsea una lista M3U dada su URL
   */
  static async fetchAndParse(url: string, categoryName: string): Promise<Channel[]> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Comprobar caché en localStorage (guardado 12 horas)
    const cacheKey = `m3u_${url}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(`${cacheKey}_time`);
    const now = Date.now();

    if (cachedData && cachedTime && (now - parseInt(cachedTime)) < 12 * 60 * 60 * 1000) {
      try {
        const parsed = JSON.parse(cachedData) as Channel[];
        this.cache.set(url, parsed);
        return parsed;
      } catch (e) {
        console.warn('Error leyendo caché:', e);
      }
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const text = await response.text();
      const channels = this.parseM3u(text, categoryName);

      // Guardar en memoria y en localStorage
      this.cache.set(url, channels);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(channels.slice(0, 300))); // Guardar los primeros 300 para no saturar storage
        localStorage.setItem(`${cacheKey}_time`, now.toString());
      } catch (storageErr) {
        console.warn('No se pudo guardar en localStorage (cuota llena)');
      }

      return channels;
    } catch (err) {
      console.error(`Error descargando M3U desde ${url}:`, err);
      return [];
    }
  }

  /**
   * Parser sintáctico rápido de listas M3U / M3U8
   */
  static parseM3u(content: string, defaultCategory: string): Channel[] {
    const channels: Channel[] = [];
    const lines = content.split(/\r?\n/);

    let currentName: string | null = null;
    let currentLogo: string = '';
    let currentGroup: string = defaultCategory;
    let channelIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        // Extraer nombre del canal (después de la última coma)
        const commaIdx = line.lastIndexOf(',');
        if (commaIdx !== -1) {
          currentName = line.substring(commaIdx + 1).trim();
        }

        // Sanitizar y validar logo: solo admitir URLs http/https legítimas
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        const rawLogo = logoMatch ? logoMatch[1].trim() : '';
        currentLogo = (rawLogo.startsWith('https://') || rawLogo.startsWith('http://')) ? rawLogo : '';

        // Extraer grupo: group-title="..."
        const groupMatch = line.match(/group-title="([^"]*)"/i);
        currentGroup = groupMatch && groupMatch[1] ? groupMatch[1].trim() : defaultCategory;
      } else if (line.length > 0 && !line.startsWith('#')) {
        // Validar que sea una URL de stream válida y no un esquema peligroso (ej: javascript:)
        const isSafeUrl = line.startsWith('https://') || line.startsWith('http://');

        if (currentName && isSafeUrl) {
          // Sanitizar nombre para evitar inyección de código
          const cleanName = currentName.replace(/[<>]/g, '').trim();

          channels.push({
            id: `ch_${channelIndex++}`,
            name: cleanName,
            logo: currentLogo,
            url: line,
            category: currentGroup.replace(/[<>]/g, ''),
            country: defaultCategory
          });
        }
        currentName = null;
        currentLogo = '';
        currentGroup = defaultCategory;
      }
    }

    return channels;
  }
}
