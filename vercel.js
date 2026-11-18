const ALLOWED_HOSTS = [
  "danbooru.donmai.us",
  "cdn.donmai.us",
  "safebooru.org",
  "yande.re",
  "files.yande.re",
];
const RELAY_KEY = "";

export default async function handler(req, res) {
  const url = new URL(req.url, "https://relay.local");
  if (RELAY_KEY && url.searchParams.get("key") !== RELAY_KEY) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const target = url.searchParams.get("url");
  if (!target) {
    res.status(400).json({ error: "missing url param" });
    return;
  }

  let t;
  try {
    t = new URL(target);
  } catch {
    res.status(400).json({ error: "invalid url" });
    return;
  }
  const allowed = t.protocol === "https:" && ALLOWED_HOSTS.some(
    (h) => t.hostname === h || t.hostname.endsWith("." + h)
  );
  if (!allowed) {
    res.status(403).json({ error: "host not allowed: " + t.hostname });
    return;
  }

  try {
    const resp = await fetch(t.toString(), {
      headers: {
        "User-Agent": "scan-artist-relay/1.0 (Danbooru API relay)",
        "Accept": "application/json,image/avif,image/webp,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    const body = Buffer.from(await resp.arrayBuffer());
    res.setHeader("content-type", resp.headers.get("content-type") || "application/octet-stream");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("cache-control", "public, max-age=300");
    res.status(resp.status).send(body);
  } catch (err) {
    res.status(502).json({ error: String(err && err.message ? err.message : err) });
  }
}