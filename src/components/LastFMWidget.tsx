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
  const validArt = albumArt && !albumArt.includes('noimage') ? albumArt : null;
  const nowPlaying = track?.['@attr']?.nowplaying === 'true';
  const albumName = track?.album?.['#text'];

  if (loading || error) {
    return (
      <div className="widget-container flex items-center justify-center h-22">
        <span className="status-label">{error || 'Initializing...'}</span>
      </div>
    );
  }

  return (
    <div
      className={`widget-container ${nowPlaying ? 'is-playing' : ''}`}
      aria-live="polite"
    >
      {validArt && (
        <div
          className="ambient-glow"
          style={{ backgroundImage: `url(${validArt})` }}
          aria-hidden="true"
        />
      )}

      <div className={`accent-bar ${nowPlaying ? 'accent-bar--active' : ''}`} aria-hidden="true" />

      <div className="widget-inner">
        <div className="art-wrapper">
          <div className={`art-frame ${nowPlaying ? 'art-frame--playing' : ''}`}>
            {validArt ? (
              <img
                src={validArt}
                alt={`${track?.name} — ${track?.artist['#text']}`}
                className="art-img"
              />
            ) : (
              <div className="art-placeholder">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                  <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="track-info">
          <div className="track-label-row">
            {nowPlaying ? (
              <>
                <div className="bars-indicator" aria-hidden="true">
                  <span className="bar bar-1" />
                  <span className="bar bar-2" />
                  <span className="bar bar-3" />
                </div>
                <span className="status-label">Now Playing</span>
              </>
            ) : (
              <span className="status-label">Last Played</span>
            )}
          </div>

          <h2 className="track-name" title={track?.name}>
            {track?.name || 'Nothing'}
          </h2>

          <p className="track-artist" title={track?.artist['#text']}>
            {track?.artist['#text'] || 'Unknown Artist'}
            {albumName && (
              <span className="track-album"> · {albumName}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}