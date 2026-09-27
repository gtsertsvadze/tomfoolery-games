import { matchFruit } from "./fruits";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const MAX_INPUT = 40;
// Basic per-IP rate limit (best-effort, per-isolate): 10 POSTs per minute.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP")?.split(",")[0].trim() ||
    req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_MAX;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getTotal(db: D1Database): Promise<number> {
  const row = await db
    .prepare("SELECT COALESCE(SUM(count), 0) AS total FROM fruit_counts")
    .first<{ total: number }>();
  return row?.total ?? 0;
}

async function getRarest(
  db: D1Database,
  day: string,
  total: number,
): Promise<{ fruit: string; count: number; rarerThan: number }[]> {
  const res = await db
    .prepare(
      "SELECT d.fruit AS fruit, c.count AS count FROM fruit_daily d JOIN fruit_counts c ON c.fruit = d.fruit WHERE d.day = ? ORDER BY c.count ASC, d.fruit ASC LIMIT 5",
    )
    .bind(day)
    .all<{ fruit: string; count: number }>();
  return (res.results ?? []).map((row) => ({
    fruit: row.fruit,
    count: row.count,
    rarerThan:
      total > 0 ? Math.round(((total - row.count) / total) * 1000) / 10 : 0,
  }));
}

async function handleAnswer(req: Request, env: Env): Promise<Response> {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return json({ ok: false, error: "Slow down — one fruit at a time." }, 429);
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Send JSON with an answer." }, 400);
  }
  const answer =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).answer
      : undefined;
  if (typeof answer !== "string" || !answer.trim()) {
    return json({ ok: false, error: "Type a fruit first." }, 400);
  }
  if (Array.from(answer.trim()).length > MAX_INPUT) {
    return json({ ok: false, error: "Keep it under 40 characters." }, 400);
  }

  const matched = matchFruit(answer);
  if (!matched) {
    return json({
      ok: false,
      code: "unknown",
      error: "Not a fruit we know. Bold, though.",
    });
  }
  if (matched === "apple") {
    return json({
      ok: false,
      code: "apple",
      error: "Apple doesn't count. Read the sign.",
    });
  }

  const day = todayUTC();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO fruit_counts (fruit, count) VALUES (?, 1) ON CONFLICT (fruit) DO UPDATE SET count = count + 1",
    ).bind(matched),
    env.DB.prepare(
      "INSERT INTO fruit_daily (fruit, day, count) VALUES (?, ?, 1) ON CONFLICT (fruit, day) DO UPDATE SET count = count + 1",
    ).bind(matched, day),
  ]);
  const countRow = await env.DB.prepare(
    "SELECT count FROM fruit_counts WHERE fruit = ?",
  )
    .bind(matched)
    .first<{ count: number }>();
  const count = countRow?.count ?? 1;
  const total = await getTotal(env.DB);
  const rarerThan =
    total > 0 ? Math.round(((total - count) / total) * 1000) / 10 : 0;
  const rarest = await getRarest(env.DB, day, total);

  return json({
    ok: true,
    fruit: matched,
    count,
    total,
    rarerThan,
    rarest,
  });
}

async function handleRarest(_req: Request, env: Env): Promise<Response> {
  const day = todayUTC();
  const total = await getTotal(env.DB);
  const rarest = await getRarest(env.DB, day, total);
  return json({ ok: true, total, rarest });
}

function staticPath(pathname: string): string {
  if (pathname === "/") return "/index.html";
  const last = pathname.split("/").pop() ?? "";
  if (!last.includes(".")) {
    return pathname.endsWith("/")
      ? `${pathname}index.html`
      : `${pathname}/index.html`;
  }
  return pathname;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/api/fruit/answer") {
      return handleAnswer(req, env);
    }
    if (req.method === "GET" && url.pathname === "/api/fruit/rarest") {
      return handleRarest(req, env);
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Not found", { status: 404 });
    }
    const assetUrl = new URL(req.url);
    assetUrl.pathname = staticPath(url.pathname);
    return env.ASSETS.fetch(new Request(assetUrl, req));
  },
};
