export interface LastFmImage {
  size: 'small' | 'medium' | 'large' | 'extralarge';
  '#text': string;
}

export interface LastFmTrack {
  artist: { '#text': string; mbid?: string };
  name: string;
  url: string;
  image: LastFmImage[];
  '@attr'?: { nowplaying: 'true' | 'false' };
}

export interface LastFmRecentTracksResponse {
  recenttracks: {
    track: LastFmTrack[];
    '@attr': {
      user: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
  error?: number;
  message?: string;
}