"use client";

import { useEffect, useState } from 'react';
import type { LastFmRecentTracksResponse, LastFmTrack } from '../types/lastfm';

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const USER = params.get('user') || import.meta.env.PUBLIC_LASTFM_USER || '';
const API_KEY_PARAM = params.get('apikey') || import.meta.env.PUBLIC_LASTFM_API_KEY || '';
const USE_PROXY = params.get('proxy') !== 'false';
const REFRESH_INTERVAL = parseInt(params.get('interval') || '15000', 10);
const SHOW_ART = params.get('art') !== 'false';
const THEME = params.get('theme') || 'light';

export default function LastFmWidget() {
  const [track, setTrack] = useState<LastFmTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (THEME !== 'light') {
      document.documentElement.className = `theme-${THEME}`;
    }
  }, []);

  const fetchRecent = async (abortSignal?: AbortSignal) => {
    if (!USER) {
      setError('Missing Username');
      setLoading(false);
      return;
    }
    try {
      const apiUrl = (USE_PROXY && !API_KEY_PARAM) 
        ? `/.netlify/functions/lastfm?user=${USER}`
        : `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USER}&api_key=${API_KEY_PARAM}&format=json&limit=1`;

      const response = await fetch(apiUrl, { signal: abortSignal });
      const data: LastFmRecentTracksResponse = await response.json();
      if (data.error) throw new Error(data.message);
      setTrack(data.recenttracks.track?.[0] || null);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchRecent(controller.signal);
    const interval = setInterval(() => fetchRecent(), REFRESH_INTERVAL);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  const albumArt = SHOW_ART && track?.image.find(i => i.size === 'extralarge')?.['#text'];
  const nowPlaying = track?.['@attr']?.nowplaying === 'true';

  if (loading || error) {
    return (
      <div className="widget-container flex items-center justify-center h-24 text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">
        {error || 'Initializing...'}
      </div>
    );
  }

  return (
    <div 
      className={`widget-container group ${nowPlaying ? 'is-playing' : ''}`}
      aria-live="polite"
    >
      {/* Ambient Glow: Using mix-blend-mode for better integration */}
      {albumArt && (
        <div 
          className="absolute inset-0 z-0 opacity-30 scale-150 blur-[80px] saturate-200 pointer-events-none transition-opacity duration-1000"
          style={{ backgroundImage: `url(${albumArt})`, backgroundSize: 'cover' }}
          aria-hidden="true"
        />
      )}
      
      <div className="relative z-10 flex gap-4 items-center">
        {/* Album Art with decorative border */}
        <div className="relative shrink-0 w-16 h-16 select-none">
          <div className="w-full h-full rounded-md overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10">
            {albumArt && !albumArt.includes('noimage') ? (
              <img src={albumArt} alt={`Album cover for ${track?.name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-(--text-main) opacity-5 flex items-center justify-center">
                <div className="w-5 h-5 border border-(--text-main) rounded-full opacity-20" />
              </div>
            )}
          </div>
          
          {nowPlaying && (
            <div 
              className="absolute -bottom-1 -right-1 flex gap-0.5 items-end h-5 px-1.5 py-1 bg-(--card-bg) backdrop-blur-md rounded-sm border border-(--card-border)"
              title="Now Playing"
            >
              <div className="v-bar animate-v1 bg-(--accent)"></div>
              <div className="v-bar animate-v2 bg-(--accent)"></div>
              <div className="v-bar animate-v3 bg-(--accent)"></div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-(--text-muted)">
              {nowPlaying ? 'Streaming Now' : 'Last Played'}
            </span>
          </div>
          
          <h2 className="text-md font-bold truncate text-(--text-main) leading-tight">
            {track?.name || 'Silence'}
          </h2>
          <p className="text-[11px] text-(--text-muted) truncate font-medium mt-0.5">
            {track?.artist['#text'] || 'Unknown Artist'}
          </p>
        </div>
      </div>
    </div>
  );
}