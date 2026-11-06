// aesth.cc backend: visitor counter + guestbook. Runs on Cloudflare Workers with one KV namespace bound as KV.
//
//   POST /hit            count one visit, returns { count }
//   GET  /count          returns { count }
//   GET  /notes?page=N   returns { notes: [{ name, body, at }], total, more }
//   POST /notes          body { name, body, hp } -> { ok } (hp is a honeypot field, must be empty)

const ORIGINS = ["https://aesth.cc", "https://www.aesth.cc", "https://aaesth.github.io", "http://localhost:8765"];
const PAGE = 20;
const MAX_NOTES = 1000;
const MAX_BODY = 500;
const MAX_NAME = 24;
const COOLDOWN = 60; // seconds between notes from one IP

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(req.url);
    try {
      if (url.pathname === "/count" && req.method === "GET") {
        return json({ count: Number(await env.KV.get("count")) || 0 });
      }

      if (url.pathname === "/hit" && req.method === "POST") {
        const count = (Number(await env.KV.get("count")) || 0) + 1;
        await env.KV.put("count", String(count));
        return json({ count });
      }

      if (url.pathname === "/notes" && req.method === "GET") {
        const notes = JSON.parse((await env.KV.get("notes")) || "[]");
        const page = Math.max(0, parseInt(url.searchParams.get("page") || "0", 10) || 0);
        const slice = notes.slice(page * PAGE, page * PAGE + PAGE);
        return json({ notes: slice, total: notes.length, more: notes.length > (page + 1) * PAGE });
      }

      if (url.pathname === "/notes" && req.method === "POST") {
        if (!ORIGINS.includes(origin)) return json({ error: "bad origin" }, 403);
        const data = await req.json().catch(() => null);
        if (!data || typeof data.body !== "string") return json({ error: "bad request" }, 400);
        if (data.hp) return json({ ok: true }); // bot filled the hidden field, pretend it worked

        const body = data.body.replace(/\r/g, "").trim().slice(0, MAX_BODY);
        const name = (typeof data.name === "string" ? data.name : "").trim().slice(0, MAX_NAME) || "anon";
        if (!body) return json({ error: "note is empty" }, 400);

        const ip = req.headers.get("CF-Connecting-IP") || "unknown";
        const key = "rl:" + (await sha256(ip));
        if (await env.KV.get(key)) return json({ error: "slow down, try again in a minute" }, 429);
        await env.KV.put(key, "1", { expirationTtl: COOLDOWN });

        const notes = JSON.parse((await env.KV.get("notes")) || "[]");
        notes.unshift({ name, body, at: Date.now() });
        await env.KV.put("notes", JSON.stringify(notes.slice(0, MAX_NOTES)));
        return json({ ok: true });
      }

      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: "server error" }, 500);
    }
  },
};

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
