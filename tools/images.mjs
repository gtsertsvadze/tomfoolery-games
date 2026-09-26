// Generates every image the site ships, using headless Chrome (no npm deps):
//   public/og/fruit.png         1200x630 Open Graph card (real emoji + title)
//   public/apple-touch-icon.png 180x180 (full-bleed; iOS rounds it itself)
//   public/favicon.ico          32x32 PNG wrapped in an ICO container
// public/favicon.svg is the hand-drawn source for the icons.
// Run from the repo root:  node tools/images.mjs   (set CHROME=path to override)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const PUB = join(ROOT, "public");
const CANDIDATES = [
  process.env.CHROME,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chrome = CANDIDATES.find((p) => { try { readFileSync(p); return true; } catch { return false; } });
if (!chrome) throw new Error("Chrome not found; set CHROME=/path/to/chrome");

const work = mkdtempSync(join(tmpdir(), "tf-img-"));
function shot(name, w, h, html, transparent) {
  const page = join(work, name + ".html");
  const out = join(work, name + ".png");
  writeFileSync(page, html);
  execFileSync(chrome, [
    "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1",
    transparent ? "--default-background-color=00000000" : "--default-background-color=ffffffff",
    `--window-size=${w},${h}`, `--screenshot=${out}`, pathToFileURL(page).href,
  ], { stdio: "ignore" });
  return readFileSync(out);
}
const base = `<meta charset="utf-8"><style>html,body{margin:0;height:100%;overflow:hidden}
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:grid;place-items:center}</style>`;

// Open Graph cards, one per game.
const games = [{ slug: "fruit", emoji: "🍎", title: "Name a Fruit" }];
mkdirSync(join(PUB, "og"), { recursive: true });
for (const g of games) {
  const png = shot("og-" + g.slug, 1200, 630, `${base}<body><div style="text-align:center">
    <div style="font-size:250px;line-height:1">${g.emoji}</div>
    <div style="font-size:92px;font-weight:700;letter-spacing:-.03em;margin-top:8px">${g.title}</div>
    <div style="font-size:34px;color:#777;margin-top:18px">tomfoolery.games</div></div>`);
  writeFileSync(join(PUB, "og", g.slug + ".png"), png);
}

// Icons from the SVG, pinned top-left because Chrome won't shrink its window
// below ~500px; the screenshot is still cropped to the requested size.
// The touch icon is full-bleed (no rounded corners; iOS masks it).
const svg = readFileSync(join(PUB, "favicon.svg"), "utf8");
const icon = (size, src) => shot("icon-" + size, size, size,
  `${base}<body><img src="data:image/svg+xml,${encodeURIComponent(src)}" width="${size}" height="${size}" style="position:fixed;left:0;top:0">`, true);
writeFileSync(join(PUB, "apple-touch-icon.png"), icon(180, svg.replace('rx="14"', 'rx="0"')));

const png32 = icon(32, svg);
const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); // reserved, type=icon, count
ico[6] = 32; ico[7] = 32; ico[8] = 0; ico[9] = 0;                          // w, h, palette, reserved
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);                       // planes, bpp
ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18);            // size, offset
writeFileSync(join(PUB, "favicon.ico"), Buffer.concat([ico, png32]));

rmSync(work, { recursive: true, force: true });
console.log("wrote og/*.png, apple-touch-icon.png, favicon.ico");
