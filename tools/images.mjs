// Generates the derived images, using headless Chrome (no npm deps):
//   public/og/fruit.png   1200x630 Open Graph card (game icon + title, DM Sans)
//   public/favicon.ico    public/favicon-32.png wrapped in an ICO container
// The icons (public/icons/*.svg, public/favicon*.{svg,png}) come from the
// design handoff and are committed as-is.
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
function shot(name, w, h, html) {
  const page = join(work, name + ".html");
  const out = join(work, name + ".png");
  writeFileSync(page, html);
  execFileSync(chrome, [
    "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--virtual-time-budget=5000", `--window-size=${w},${h}`, `--screenshot=${out}`,
    pathToFileURL(page).href,
  ], { stdio: "ignore" });
  return readFileSync(out);
}

// Open Graph cards, one per game.
const games = [{ slug: "fruit", icon: "name-a-fruit", title: "Name a fruit", ground: "#FDF5E4" }];
mkdirSync(join(PUB, "og"), { recursive: true });
for (const g of games) {
  const svg = readFileSync(join(PUB, "icons", g.icon + ".svg"), "utf8");
  const fontUrl = pathToFileURL(join(PUB, "fonts", "dm-sans.woff2")).href;
  const png = shot("og-" + g.slug, 1200, 630, `<meta charset="utf-8">
<style>@font-face{font-family:"DM Sans";src:url(${fontUrl}) format("woff2");font-weight:400 600;font-style:normal}
html,body{margin:0;height:100%;overflow:hidden}
body{background:${g.ground};color:#2A211A;font-family:"DM Sans",system-ui,sans-serif;display:flex;align-items:center;padding:0 110px;gap:70px}
.t{font-size:112px;font-weight:600;letter-spacing:-.035em;line-height:1.02;margin:0}
.t b{font-weight:inherit;color:#E4572E}.s{font-size:34px;color:#8A7B6E;margin:22px 0 0}</style>
<body><img src="data:image/svg+xml,${encodeURIComponent(svg)}" width="300" height="300">
<div><p class="t">${g.title}<b>.</b></p><p class="s">tomfoolery.games</p></div>`);
  writeFileSync(join(PUB, "og", g.slug + ".png"), png);
}

// favicon.ico for browsers and tools that request it by convention.
const png32 = readFileSync(join(PUB, "favicon-32.png"));
const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4); // reserved, type=icon, count
ico[6] = 32; ico[7] = 32; ico[8] = 0; ico[9] = 0;                          // w, h, palette, reserved
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);                       // planes, bpp
ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18);            // size, offset
writeFileSync(join(PUB, "favicon.ico"), Buffer.concat([ico, png32]));

rmSync(work, { recursive: true, force: true });
console.log("wrote og/*.png, favicon.ico");
