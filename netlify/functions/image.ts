import type { Handler, HandlerEvent } from '@netlify/functions';
import type { LastFmRecentTracksResponse, LastFmTrack } from '../../src/types/lastfm';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';

export const handler: Handler = async (event: HandlerEvent) => {
  const user  = event.queryStringParameters?.user;
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

    const xml = (s: string) =>
      s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c));

    const trackName  = xml(track.name);
    const artistName = xml(track.artist['#text']);
    const albumName  = xml(track.album?.['#text'] || '');
    const coverUrl   = track.image.find(i => i.size === 'extralarge')?.['#text'] || '';

    const themes = {
      light:      { card: '#ffffff', border: 'rgba(0,0,0,0.06)',       text: '#111111', muted: '#666666', faint: '#999999', accent: '#000000' },
      dark:       { card: '#121212', border: 'rgba(255,255,255,0.08)', text: '#eeeeee', muted: '#999999', faint: '#555555', accent: '#ffffff' },
      catppuccin: { card: '#1e1e2e', border: 'rgba(203,166,247,0.15)', text: '#cdd6f4', muted: '#a6adc8', faint: '#6c7086', accent: '#cba6f7' },
    };
    const t = themes[theme] || themes.light;

    let base64Art = '';
    if (coverUrl && !coverUrl.includes('noimage')) {
      try {
        const imgRes = await fetch(coverUrl);
        const buf    = await imgRes.arrayBuffer();
        base64Art    = `data:${imgRes.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(buf).toString('base64')}`;
      } catch (_) {}
    }

    const artistLine = albumName
      ? `${artistName} • ${albumName}`
      : artistName;

    // scroll constants 
    const GAP_PX     = 48;   // fixed gap between the two text copies
    const PX_PER_SEC = 40;   // scroll speed (px/s)
    const PAUSE_SEC  = 2.5;  // minimum hold before each loop

    const CHAR_WIDTH_NAME = 7.2;  
    const CHAR_WIDTH_SUB  = 6.1;  
    const CLIP_W = 210;          

    const titlePx = Math.round(trackName.length  * CHAR_WIDTH_NAME);
    const subPx   = Math.round(artistLine.length * CHAR_WIDTH_SUB);

    const titleScrolls = titlePx > CLIP_W;
    const subScrolls   = subPx   > CLIP_W;

    const scrollSecTitle = titleScrolls ? (titlePx + GAP_PX) / PX_PER_SEC : 0;
    const scrollSecSub   = subScrolls   ? (subPx   + GAP_PX) / PX_PER_SEC : 0;

    const cycleSec = +(Math.max(
      scrollSecTitle + PAUSE_SEC,
      scrollSecSub   + PAUSE_SEC,
      PAUSE_SEC
    )).toFixed(3);

    const pauseFrac = +((PAUSE_SEC / cycleSec) * 100).toFixed(3);

    const makeScroll = (
      textPx:    number,
      className: string,
      animName:  string,
      startX:    number,
    ) => {
      const loopDist    = textPx + GAP_PX;
      const scrollSec   = loopDist / PX_PER_SEC;
      const scrollFrac  = +((scrollSec / cycleSec) * 100).toFixed(3);
      const scrollEnd   = +(pauseFrac + scrollFrac).toFixed(3);

      const css = `
        @keyframes ${animName} {
          0%             { transform: translateX(0); }
          ${pauseFrac}%  { transform: translateX(0); }
          ${scrollEnd}%  { transform: translateX(-${loopDist}px); }
          100%           { transform: translateX(-${loopDist}px); }
        }
        .${className} {
          animation: ${animName} ${cycleSec}s linear infinite;
          animation-fill-mode: backwards;
        }`;

      const tspan = (content: string) =>
        `<tspan x="${startX}">${content}</tspan>` +
        `<tspan x="${startX + loopDist}">${content}</tspan>`;

      return { css, tspan };
    };

    let scrollCss = '';

    const titleScroll = titleScrolls
      ? makeScroll(titlePx, 'scroll-title', 'scroll-title-kf', 96)
      : null;
    if (titleScroll) scrollCss += titleScroll.css;

    const subScroll = subScrolls
      ? makeScroll(subPx, 'scroll-sub', 'scroll-sub-kf', 96)
      : null;
    if (subScroll) scrollCss += subScroll.css;

    const labelX = isPlaying ? 116 : 96;

    const bars = isPlaying ? `
      <g transform="translate(96, 22)">
        <rect x="0" width="2" rx="1" fill="${t.accent}"><animate attributeName="height" values="3;8;3" dur="0.7s" repeatCount="indefinite"/><animate attributeName="y" values="5;0;5" dur="0.7s" repeatCount="indefinite"/></rect>
        <rect x="4" width="2" rx="1" fill="${t.accent}"><animate attributeName="height" values="3;8;3" dur="0.9s" begin="0.1s" repeatCount="indefinite"/><animate attributeName="y" values="5;0;5" dur="0.9s" begin="0.1s" repeatCount="indefinite"/></rect>
        <rect x="8" width="2" rx="1" fill="${t.accent}"><animate attributeName="height" values="3;8;3" dur="0.6s" begin="0.2s" repeatCount="indefinite"/><animate attributeName="y" values="5;0;5" dur="0.6s" begin="0.2s" repeatCount="indefinite"/></rect>
      </g>` : '';

          const titleEl = titleScrolls && titleScroll
            ? `<g clip-path="url(#title-clip)">
        <text y="52" class="name scroll-title">${titleScroll.tspan(trackName)}</text>
      </g>`
            : `<g clip-path="url(#title-clip)">
        <text x="96" y="52" class="name">${trackName}</text>
      </g>`;

          const subEl = subScrolls && subScroll
            ? `<g clip-path="url(#sub-clip)">
        <text y="68" class="sub scroll-sub">${subScroll.tspan(artistLine)}</text>
      </g>`
            : `<g clip-path="url(#sub-clip)">
        <text x="96" y="68" class="sub">${artistLine}</text>
      </g>`;

          const svg = `
      <svg width="320" height="88" viewBox="0 0 320 88" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="art-clip"><rect x="14" y="14" width="60" height="60" rx="8"/></clipPath>
        <clipPath id="title-clip"><rect x="96" y="36" width="${CLIP_W}" height="22"/></clipPath>
        <clipPath id="sub-clip"><rect x="96" y="56" width="${CLIP_W}" height="16"/></clipPath>
        <style>
          .lbl  { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: 9px; font-weight: 700; fill: ${t.faint}; letter-spacing: .08em; text-transform: uppercase; }
          .name { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; font-weight: 700; fill: ${t.text}; }
          .sub  { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 500; fill: ${t.muted}; }
          ${scrollCss}
        </style>
      </defs>

      <rect width="320" height="88" rx="14" fill="${t.card}" stroke="${t.border}" stroke-width="1"/>

      <rect x="0" y="28" width="3" height="32" rx="1.5" fill="${isPlaying ? t.accent : t.faint}" opacity="${isPlaying ? 1 : 0.25}"/>

      <rect x="14" y="14" width="60" height="60" rx="8" fill="${t.faint}" opacity="0.12"/>
      ${base64Art
        ? `<image href="${base64Art}" x="14" y="14" width="60" height="60" clip-path="url(#art-clip)" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="44" cy="44" r="10" stroke="${t.faint}" stroke-width="1.5" fill="none" opacity="0.25"/>
      <circle cx="44" cy="44" r="4" stroke="${t.faint}" stroke-width="1.5" fill="none" opacity="0.25"/>`
      }

      ${bars}
      <text x="${labelX}" y="30" class="lbl">${isPlaying ? 'Now Playing' : 'Last Session'}</text>

      ${titleEl}

      ${subEl}

      </svg>`.trim();
    return { statusCode: 200, headers: successHeaders, body: svg };
  } catch (err) {
    return { statusCode: 500, headers: errorHeaders, body: errorSvg('Internal Server Error') };
  }
};