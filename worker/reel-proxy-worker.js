// ============================================================
//  REEL — Watchmode proxy (Cloudflare Worker)
//  Keeps your API key server-side and adds the CORS headers
//  that Watchmode doesn't send, so your browser app can read it.
// ============================================================
//
//  SETUP (one time):
//  1. Create a free Cloudflare account at dash.cloudflare.com
//  2. Workers & Pages -> Create -> Worker -> name it "reel-proxy" -> Deploy
//  3. Edit code -> paste this whole file -> Deploy
//  4. Settings -> Variables and Secrets -> add a SECRET:
//        Name:  WATCHMODE_KEY
//        Value: <your Watchmode API key>
//     (Using a Secret means the key is never visible in the code.)
//  5. Copy your Worker URL, e.g. https://reel-proxy.<you>.workers.dev
//     Put that URL into the app's PROXY constant.
//
//  Lock it to your site (optional but recommended): set ALLOWED_ORIGIN
//  below to your GitHub Pages origin so only your app can use the proxy.
// ============================================================

const ALLOWED_ORIGIN = "https://gambati.github.io"; // e.g. "https://gambati.github.io" to lock it down

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const allow = ALLOWED_ORIGIN === "*" ? origin : ALLOWED_ORIGIN;

    const cors = {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const key = env.WATCHMODE_KEY;
    if (!key) {
      return json({ error: "Worker missing WATCHMODE_KEY secret" }, 500, cors);
    }

    // Pull the query the app sends (genres, regions, source_types, etc.)
    const inUrl = new URL(request.url);
    const params = inUrl.searchParams;

    // Build the real Watchmode call, injecting the key server-side.
    const wm = new URL("https://api.watchmode.com/v1/list-titles/");
    wm.searchParams.set("apiKey", key);
    for (const [k, v] of params) {
      if (k !== "apiKey") wm.searchParams.set(k, v); // never let caller override key
    }

    try {
      // Step 1: get the list of matching titles (1 call, cached 30 min).
      const listRes = await fetch(wm.toString(), {
        cf: { cacheTtl: 1800, cacheEverything: true },
      });
      if (!listRes.ok) {
        const t = await listRes.text();
        return json({ error: "list-fail", status: listRes.status, detail: t }, listRes.status, cors);
      }
      const listJson = await listRes.json();
      const baseList = (listJson.titles || listJson.results || []).slice(0, 12);

      // Step 2: enrich each title with poster + overview + rating.
      // Cached 24h per title, so repeat loads are nearly free.
      const enriched = await Promise.all(
        baseList.map(async (t) => {
          try {
            const dUrl = `https://api.watchmode.com/v1/title/${t.id}/details/?apiKey=${key}`;
            const dRes = await fetch(dUrl, {
              cf: { cacheTtl: 86400, cacheEverything: true },
            });
            if (!dRes.ok) return base(t);
            const d = await dRes.json();
            return {
              title: d.title || t.title,
              year: d.year || t.year || "",
              poster: d.poster || d.posterLarge || null,
              backdrop: d.backdrop || null,
              overview: d.plot_overview || "",
              user_rating: d.user_rating || null,
              critic_score: d.critic_score || null,
              tmdb_id: d.tmdb_id || t.tmdb_id || null,
            };
          } catch (_) {
            return base(t);
          }
        })
      );

      return json({ titles: enriched, total: listJson.total_results || enriched.length }, 200, cors);
    } catch (e) {
      return json({ error: "upstream-fail", detail: String(e) }, 502, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Fallback shape when a title's detail fetch fails — keeps the app working.
function base(t) {
  return {
    title: t.title,
    year: t.year || "",
    poster: null,
    backdrop: null,
    overview: "",
    user_rating: null,
    critic_score: null,
    tmdb_id: t.tmdb_id || null,
  };
}
