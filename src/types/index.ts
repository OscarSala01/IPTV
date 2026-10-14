export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  country: string;
  isFavorite?: boolean;
}

export interface VodItem {
  id: string;
  title: string;
  poster: string;
  banner?: string;
  url: string;
  category: string;
  year?: string;
  synopsis: string;
  duration?: string;
  type: 'movie' | 'series';
}

export type ActiveTab = 'live' | 'movies' | 'series' | 'favorites';
