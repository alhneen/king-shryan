const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Telegram-Bot-Api-Secret-Token"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (path === "/health") {
      return json({ status: "ok", service: "KING SHRYAN LIBRARY API" });
    }

    if (path === "/api/songs" && request.method === "GET") {
      try {
        const result = await env.DB.prepare(
          "SELECT id, title, artist, created_at FROM songs ORDER BY created_at DESC"
        ).all();

        const songs = (result.results || []).map(song => ({
          ...song,
          url: `${url.origin}/audio/${encodeURIComponent(song.id)}`
        }));

        return json({ songs });
      } catch (error) {
        return json({ error: "Database not configured" }, 503);
      }
    }

    if (path.startsWith("/audio/") && request.method === "GET") {
      try {
        const id = decodeURIComponent(path.slice(7));

        const song = await env.DB.prepare(
          "SELECT r2_key FROM songs WHERE id = ?"
        ).bind(id).first();

        if (!song) return json({ error: "Song not found" }, 404);

        const file = await env.AUDIO_BUCKET.get(song.r2_key);
        if (!file) return json({ error: "Audio file not found" }, 404);

        return new Response(file.body, {
          headers: {
            ...cors,
            "Content-Type": "audio/mpeg",
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600"
          }
        });
      } catch (error) {
        return json({ error: "Audio service unavailable" }, 503);
      }
    }

    if (path === "/telegram/webhook" && request.method === "POST") {
      const token = request.headers.get(
        "X-Telegram-Bot-Api-Secret-Token"
      );

      if (!env.TELEGRAM_WEBHOOK_SECRET ||
          token !== env.TELEGRAM_WEBHOOK_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }

      return json({
        status: "pending",
        message: "Telegram upload setup is not configured yet"
      }, 503);
    }

    return json({ error: "Not found" }, 404);
  }
};
