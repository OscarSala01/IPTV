import { VodItem } from '../types';

export const VOD_CATALOG: VodItem[] = [
  // 🎬 Películas
  {
    id: 'vod_1',
    title: 'Night of the Living Dead',
    poster: 'https://m.media-amazon.com/images/M/MV5BMmJiNWNmOWQtOWNmNy00ZmE4LThjMDEtNDhjZDM5ZGM4OGQ5XkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
    url: 'https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4',
    category: 'Terror / Clásico',
    year: '1968',
    duration: '1h 36m',
    synopsis: 'Un grupo de personas se refugia en una granja aislada mientras los muertos resucitan como zombies devoradores de carne humana.',
    type: 'movie'
  },
  {
    id: 'vod_2',
    title: 'Charade (Charada)',
    poster: 'https://m.media-amazon.com/images/M/MV5BN2UyMmRhOTctY2VlYi00ODU2LWFiZDUtOTliYTg4ZGYzMDkwXkEyXkFqcGc@._V1_.jpg',
    url: 'https://archive.org/download/Charade1963_201605/Charade.1963.720p.mkv',
    category: 'Misterio / Suspenso',
    year: '1963',
    duration: '1h 53m',
    synopsis: 'Regina Lampert (Audrey Hepburn) regresa a París para descubrir que su marido ha sido asesinado y que varios hombres reclaman una fortuna escondida.',
    type: 'movie'
  },
  {
    id: 'vod_3',
    title: 'Sita Sings the Blues',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTBmZDI1YzktN2U2YS00NTI3LWE5YTgtMzY0N2E2YmFhZjEyXkEyXkFqcGc@._V1_.jpg',
    url: 'https://archive.org/download/Sita_Sings_the_Blues/Sita_Sings_the_Blues_720p.mp4',
    category: 'Animación / Musical',
    year: '2008',
    duration: '1h 22m',
    synopsis: 'Una divertida y conmovedora fábula animada que une la épica del Ramayana con la música blues clásica de los años 20.',
    type: 'movie'
  },
  {
    id: 'vod_4',
    title: 'The General (El Maquinista de la General)',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA4NjM5MzUyNF5BMl5BanBnXkFtZTgwNTU0OTQ1MDE@._V1_.jpg',
    url: 'https://archive.org/download/TheGeneral1926/TheGeneral.mp4',
    category: 'Comedia / Clásico',
    year: '1926',
    duration: '1h 18m',
    synopsis: 'Buster Keaton protagoniza esta obra maestra del cine cómico, persiguiendo su locomotora secuestrada a través de líneas enemigas.',
    type: 'movie'
  },
  {
    id: 'vod_5',
    title: 'Big Buck Bunny 4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    category: 'Animación / Infantil',
    year: '2008',
    duration: '10m',
    synopsis: 'Un conejo gigante de corazón noble decide darle una lección a tres traviesos roedores del bosque.',
    type: 'movie'
  },
  {
    id: 'vod_6',
    title: 'Tears of Steel (Sci-Fi)',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    category: 'Ciencia Ficción',
    year: '2012',
    duration: '12m',
    synopsis: 'En un futuro distópico de Ámsterdam, un grupo de científicos y combatientes intentan rescatar el mundo de robots destructores.',
    type: 'movie'
  },

  // 🍿 Series
  {
    id: 'ser_1',
    title: 'Sherlock Holmes (Serie Clásica)',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA4ZDBlMTUtOGU0OC00Y2E3LWJlM2EtMDU2YWM0NjE0YjgxXkEyXkFqcGc@._V1_.jpg',
    url: 'https://archive.org/download/SherlockHolmes1954Ep01/SH1954Ep01.mp4',
    category: 'Misterio / Detectives',
    year: '1954',
    duration: 'Temporada 1',
    synopsis: 'Las legendarias aventuras del detective más famoso de Londres resolviendo los casos más intrigantes de Baker Street.',
    type: 'series'
  },
  {
    id: 'ser_2',
    title: 'Flash Gordon Conquers the Universe',
    poster: 'https://m.media-amazon.com/images/M/MV5BYTU4YTY2MmYtMzk2Mi00MTM1LThmOTYtMGYxOWVkZTZiOGI3XkEyXkFqcGc@._V1_.jpg',
    url: 'https://archive.org/download/FlashGordonConquersTheUniverseChapter1/FlashGordonConquersTheUniverseChapter1.mp4',
    category: 'Aventura / Ciencia Ficción',
    year: '1940',
    duration: 'Episodios Clásicos',
    synopsis: 'Flash Gordon viaja al planeta Mongo para detener la plaga mortal esparcida por el despiadado emperador Ming.',
    type: 'series'
  },
  {
    id: 'ser_3',
    title: 'Cosmos: Un Viaje Personal (Homenaje)',
    poster: 'https://m.media-amazon.com/images/M/MV5BYjFlYzIxMzItZTZiMC00OWY0LWI3ODctYmIwNGE3NzY2OGZhXkEyXkFqcGc@._V1_.jpg',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    category: 'Documental / Espacio',
    year: '2022',
    duration: '24/7 En Vivo',
    synopsis: 'Emisión continua con imágenes astronómicas y exploraciones del universo comentadas en alta definición.',
    type: 'series'
  }
];
