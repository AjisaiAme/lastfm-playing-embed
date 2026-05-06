# Lastfm Playing Embed

Display a user's most recent last.fm activity to embed on `readme.md` with a dynamic SVG status card. Deployed via Netlify.
## Usage
To embed on your `readme.md`
```md
[![ALT TEXT](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=LASTFM_USERNAME&theme=THEME)](https://www.last.fm/user/LASTFM_USERNAME)
```

## Parameters
| Param         | Example                                                               | Description                                        |
| ------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| user          | `user=ajisai46`                                                       | Fetch user's last.fm info **(required)**           |
| theme         | `theme=light` **(default)**  <br>`theme=dark`  <br>`theme=catppuccin` | Theme of the card. Examples below. **(optional)**  |

---
## Examples

```
[![Last.fm Now Playing](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=ajisai46)](https://www.last.fm/user/ajisai46)
```

[![Last.fm Now Playing](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=ajisai46)](https://www.last.fm/user/ajisai46)

```
[![Last.fm Now Playing](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=ajisai46&theme=dark)](https://www.last.fm/user/ajisai46)
```

[![Last.fm Now Playing](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=ajisai46&theme=dark)](https://www.last.fm/user/ajisai46)

```
[![Last.fm Now Playing](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=ajisai46&theme=catppuccin)](https://www.last.fm/user/ajisai46)
```

[![Last.fm Now Playing](https://lastfm-playing-embed.netlify.app/.netlify/functions/image?user=ajisai46&theme=catppuccin)](https://www.last.fm/user/ajisai46)

---
## Deploying on Netlify
Deploying your own project requires your own last.fm API key in a `.env`. [Get an API account](https://www.last.fm/api#getting-started).

### Local
1. Clone the repo
```
git clone https://github.com/AjisaiAme/lastfm-playing-embed.git
```
1. Install dependencies
```
npm install
```
1. Create `.env` containing the following variables
```
PUBLIC_LASTFM_USER=your_username

LASTFM_API_KEY=your_api_key
```
1. Run development server
```
# local
npm run dev
# netlify
netlify dev
```

The app will run at [http://localhost:4321](http://localhost:4321) on your browser and [http://localhost:8888](http://localhost:8888) for Netlify.
