# Reel — Free + Legal Movie Assistant

A personal, mood-based movie picker. Choose a mood and Reel shows movies that are
currently **free or ad-supported in your region** (default: India), each with a poster,
rating, short plot, and a link to confirm where it streams. Installs to your phone like
an app.

**Live app:** https://gambati.github.io/reel-movies/

---

## How it works

```
Your phone / browser  →  Cloudflare Worker  →  Watchmode API  →  back to you
        (this repo)         (holds the key)      (live data)
```

- The **front-end** (this repo) is served as a static site by GitHub Pages.
- A **Cloudflare Worker** acts as a backend proxy: it holds the Watchmode API key
  (as a secret), adds the CORS headers the browser needs, and caches results.
- **Watchmode** provides the live free/ad-supported availability, posters, and overviews.
- Each title links out to **JustWatch** to confirm current streaming options.

The API key never lives in this repo or on the phone — only as a Cloudflare secret.

---

## Files

| File | Role | Served by GitHub Pages? |
|------|------|:---:|
| `index.html` | The whole app — UI, mood logic, poster grid | ✅ Yes |
| `manifest.webmanifest` | Makes it installable (name, icon, full-screen) | ✅ Yes |
| `sw.js` | Service worker — offline support | ✅ Yes |
| `worker/reel-proxy-worker.js` | Backend proxy **source code, for reference only** | ❌ No — runs on Cloudflare |

> **Note:** `worker/reel-proxy-worker.js` is kept here only as a backup of the Worker's
> source. GitHub Pages does **not** run it. The live Worker is deployed separately on
> Cloudflare. If you edit it, you must re-paste it into the Cloudflare Worker editor and
> redeploy for the change to take effect.

---

## Features

- **Mood picks** — five moods (Action/Thrills, Funny, Scary, Feel-good/Cozy, Mind-bending), each mapped to genres.
- **Movies / TV Shows toggle** — switch between free movies and free series for the same mood and region.
- **🎲 Surprise me** — picks a random mood, loads it live, and highlights one random title.
- **♥ My List** — save titles with the heart button on any poster; view them in the My List panel. Saved locally on the device (no cross-device sync).
- **Region switch** — India by default; switchable to US / UK / CA / AU.
- **Live availability** — each title links to JustWatch to confirm where it streams now.
- **Curated fallback** — if live data can't load, a built-in list shows instead, with the reason in the note line, so it's never blank.

---

## Updating

- **Change how the app looks/behaves** → edit `index.html`, commit, wait ~1 min for
  Pages to rebuild. Fully close & reopen the app on your phone to clear the cache.
- **Change how data is fetched** (posters, regions, quota behavior) → edit the Worker
  code in the Cloudflare dashboard and click Deploy. No repo change needed.

---

## Setup, maintenance & troubleshooting

Full step-by-step instructions — rebuilding from scratch, installing on iPhone, rotating
the API key, quota notes, and a troubleshooting table — are in the **Reel Setup &
Maintenance Guide** (the `.docx` kept with this project).

---

## Notes

- Everything Reel surfaces is **free and legal** — ad-supported, public-domain, or
  library-based. No piracy anywhere in the system.
- Default region is **India (IN)**; switchable in-app to US / UK / CA / AU.
- If live data ever fails, the app falls back to a curated list so it's never blank.
