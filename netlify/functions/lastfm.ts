import type { Handler } from '@netlify/functions';

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '';

export const handler: Handler = async (event) => {
  const user = event.queryStringParameters?.user;

  if (!user) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing user parameter' }),
    };
  }

  if (!LASTFM_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server API key not configured' }),
    };
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch from Last.fm' }),
    };
  }
};