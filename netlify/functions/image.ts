import type { Handler, HandlerEvent } from '@netlify/functions';
import type { LastFmRecentTracksResponse, LastFmTrack } from '../../src/types/lastfm';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';

export const handler: Handler = async (event: HandlerEvent) => {
  const user = event.queryStringParameters?.user;
  const theme = (event.queryStringParameters?.theme || 'light') as 'light' | 'dark' | 'catppuccin';

  const errorHeaders: Record<string, string> = {
    'Content-Type': 'image/svg+xml',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  const successHeaders: Record<string, string> = {
    'Content-Type': 'image/svg+xml',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=15, s-maxage=15',
  };

  const errorSvg = (msg: string) => `
    <svg width="320" height="88" viewBox="0 0 320 88" xmlns="http://www.w3.org/2000/svg">
      <rect width="320" height="88" rx="14" fill="#111" />
      <text x="16" y="48" font-family="monospace" font-size="11" fill="#555">${msg}</text>
    </svg>`.trim();

  if (!user) return { statusCode: 400, headers: errorHeaders, body: errorSvg('ERR: missing ?user=') };
  if (!LASTFM_API_KEY) return { statusCode: 500, headers: errorHeaders, body: errorSvg('ERR: API key missing') };

  try {
    const apiUrl = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
    const response = await fetch(apiUrl);
    const data: LastFmRecentTracksResponse = await response.json();

    const track: LastFmTrack | undefined = data.recenttracks?.track?.[0];
    if (!track) throw new Error('No track data');

    const isPlaying = track['@attr']?.nowplaying === 'true';

    const xml = (s: string) => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c));

    const trackName = xml(track.name);
    const artistName = xml(track.artist['#text']);
    const albumName = xml(track.album?.['#text'] || '');
    const coverUrl = track.image.find(i => i.size === 'extralarge')?.['#text'] || '';

    const themes = {
      light: { card: '#ffffff', border: 'rgba(0,0,0,0.06)', text: '#111111', muted: '#666666', faint: '#999999', accent: '#000000' },
      dark: { card: '#121212', border: 'rgba(255,255,255,0.08)', text: '#eeeeee', muted: '#999999', faint: '#555555', accent: '#ffffff' },
      catppuccin: { card: '#1e1e2e', border: 'rgba(203,166,247,0.15)', text: '#cdd6f4', muted: '#a6adc8', faint: '#6c7086', accent: '#cba6f7' }
    };
    const t = themes[theme] || themes.light;

    let base64Art = '';
    if (coverUrl && !coverUrl.includes('noimage')) {
      try {
        const imgRes = await fetch(coverUrl);
        const buf = await imgRes.arrayBuffer();
        base64Art = `data:${imgRes.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(buf).toString('base64')}`;
      } catch (e) { /* fallback to placeholder */ }
    }

    const trunc = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + '…' : s;
    const artistLine = albumName ? `${trunc(artistName, 20)} • ${trunc(albumName, 18)}` : trunc(artistName, 38);

    const labelX = isPlaying ? 116 : 96;

    const bars = isPlaying ? `
    <g transform="translate(96, 22)">
      <rect x="0" width="2" rx="1" fill="${t.accent}"><animate attributeName="height" values="3;8;3" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="5;0;5" dur="0.7s" repeatCount="indefinite"/></rect>
      <rect x="4" width="2" rx="1" fill="${t.accent}"><animate attributeName="height" values="3;8;3" dur="0.9s" begin="0.1s" repeatCount="indefinite"/><animate attributeName="y" values="5;0;5" dur="0.9s" begin="0.1s" repeatCount="indefinite"/></rect>
      <rect x="8" width="2" rx="1" fill="${t.accent}"><animate attributeName="height" values="3;8;3" dur="0.6s" begin="0.2s" repeatCount="indefinite"/><animate attributeName="y" values="5;0;5" dur="0.6s" begin="0.2s" repeatCount="indefinite"/></rect>
    </g>` : '';

   const svg = `
      <svg width="320" height="88" viewBox="0 0 320 88" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="card-clip"><rect width="320" height="88" rx="14"/></clipPath>
        <clipPath id="art-clip"><rect x="14" y="14" width="60" height="60" rx="8"/></clipPath>
        <style>
          .lbl { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; fill: ${t.faint}; letter-spacing: .08em; text-transform: uppercase; }
          .name { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 700; fill: ${t.text}; }
          .sub  { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 500; fill: ${t.muted}; }
        </style>
      </defs>

      <rect width="320" height="88" rx="14" fill="${t.card}" stroke="${t.border}" stroke-width="1"/>

      <rect x="0" y="28" width="3" height="32" rx="1.5" fill="${isPlaying ? t.accent : t.faint}" opacity="${isPlaying ? 1 : 0.25}"/>

      <rect x="14" y="14" width="60" height="60" rx="8" fill="${t.faint}" opacity="0.12"/>
      ${base64Art
        ? `<image href="${base64Art}" x="14" y="14" width="60" height="60" clip-path="url(#art-clip)" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="44" cy="44" r="10" stroke="${t.faint}" stroke-width="1.5" fill="none" opacity="0.25"/>
          <circle cx="44" cy="44" r="4"  stroke="${t.faint}" stroke-width="1.5" fill="none" opacity="0.25"/>`
      }

      ${bars}
      <text x="${labelX}" y="30" class="lbl">${isPlaying ? 'Now Playing' : 'Last Session'}</text>

      <text x="96" y="52" class="name">${trunc(trackName, 36)}</text>
      <text x="96" y="68" class="sub">${artistLine}</text>

      </svg>`.trim();
    return { statusCode: 200, headers: successHeaders, body: svg };
  } catch (err) {
    return { statusCode: 500, headers: errorHeaders, body: errorSvg('Internal Server Error') };
  }
};