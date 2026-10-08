/**
 * TEMp — theme screenshot generator
 * ---------------------------------------------------------------------------
 * Renders every theme listed in `pages.txt` as a static demo page (the Go
 * template placeholders are filled with sample data) and photographs it with
 * headless Chrome / Edge. Remote app icons are given time to arrive, so a
 * screenshot never ends up with a blank tile in the download section.
 *
 * Usage
 *   node screenshots/make-screenshots.mjs                 # every theme, default mode
 *   node screenshots/make-screenshots.mjs modern          # one theme
 *   node screenshots/make-screenshots.mjs modern --day    # force day mode
 *   node screenshots/make-screenshots.mjs speed --night   # force night mode
 *
 * For each theme it writes two files:
 *   screenshots/<theme>.png       full page — linked from the README
 *   screenshots/<theme>-top.png   crop that stops between two cards, shown inline
 *
 * Flags
 *   --width=<css px>   viewport width           (default 430, phone)
 *   --scale=<n>        device pixel ratio       (default 2 = retina)
 *   --out=<file.png>   write one image to this path instead of the pair above
 *   --day | --night    call the theme's own applyTheme() before shooting
 *   --clip=<css px>    cut the image after exactly N css pixels
 *   --clip-auto=<px>   cut at the bottom edge of the last card/panel that fits
 *                      inside <px> (default 1400 for the -top crop)
 *
 * Requires Node 22+ (built-in WebSocket) and a local Chrome or Edge. Set
 * CHROME_PATH if the browser lives somewhere unusual.
 *
 * Note: themes are Go templates for the 3x-ui "Senai" subscription page. The
 * screenshots use dummy data — no real panel is involved, and themes that draw
 * history (electronics samples the quota counter into localStorage) get a seeded
 * sample history so their chart is not photographed empty.
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import os from "node:os";

/* ------------------------------------------------------------------ sample data
   Filled into the Go template so the page renders without a panel. */
const nowSec = Math.floor(Date.now() / 1000);
const SAMPLE = {
  email: "user@example.com",
  subUrl: "https://panel.example.com/sub/abc123XYZ",
  enabled: true,
  isOnline: true,
  expire: nowSec + 17 * 24 * 60 * 60, // 17 days left → needles point somewhere useful
  totalByte: 21474836480,             // 20 GB
  downloadByte: 4294967296,           // 4 GB
  uploadByte: 1073741824,             // 1 GB
  total: "20.00GB",
  used: "5.00GB",
  remained: "15.00GB",
  download: "4.00GB",
  upload: "1.00GB",
  links: [
    "vless://11111111-2222-3333-4444-555555555555@195.201.0.1:443?security=reality&sni=www.google.com&type=tcp#Germany-01",
    "vmess://eyJ2IjoiMiIsInBzIjoiR2VybWFueS0wMiIsImFkZCI6IjE5NS4yMDEuMC4yIiwicG9ydCI6IjQ0MyJ9",
    "trojan://pass1234@195.201.0.3:443?security=tls&sni=cdn.example.com#Germany-03",
  ],
};

/* ------------------------------------------------------------------ sample state
   A few themes draw history the visitor has to build up over time (the
   electronics theme samples the panel counter into localStorage). For the
   screenshot that history is seeded with sample samples that grow from zero to
   the SAMPLE usage above over the last 30 days, so the chart shows a real
   window instead of an empty first visit. Keyed by theme name. */
const SAMPLE_STATE = {
  electronics: `(() => {
    const total = ${SAMPLE.downloadByte + SAMPLE.uploadByte};   // ends exactly at the sample usage
    const steps = 30 * 288;                                     // 30 days of 5-minute samples
    const now = Date.now();
    /* a believable rhythm: quiet overnight, busy at noon and in the evening,
       lighter on the weekend, so day/week/month bars are not all identical */
    const weekendFactor = [1.06, 0.98, 1.0, 1.02, 1.12, 0.86, 0.78]; // Sun … Sat
    const weight = (hour, dow) => weekendFactor[dow] *
      (0.35 + 0.65 * Math.exp(-((hour - 21) * (hour - 21)) / 18) +
              0.18 * Math.exp(-((hour - 13) * (hour - 13)) / 20));
    let weightSum = 0;
    const weights = [];
    for (let i = 0; i <= steps; i++) {
      const at = new Date(now - (steps - i) * 5 * 60000);
      weights.push(weight(at.getHours(), at.getDay()));
      weightSum += weights[i];
    }
    const perUnit = total / weightSum;
    let acc = 0;
    const samples = [];
    for (let i = 0; i <= steps; i++) {
      acc += weights[i] * perUnit;
      samples.push({ t: now - (steps - i) * 5 * 60000, used: Math.round(acc) });
    }
    try { localStorage.setItem("temp.electronics.usage.v1", JSON.stringify(samples)); } catch (error) {}
    if (typeof renderCharts === "function") renderCharts();
  })()`,
};

/* ------------------------------------------------------------------ template → static HTML */
function renderStatic(tpl, s) {
  let out = tpl.replace(
    /\{\{\s*range\s+\$index,\s*\$link\s*:=\s*\.links\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g,
    (_m, body) =>
      s.links
        .map((link, i) =>
          body.replace(/\{\{\s*\$link\s*\}\}/g, link).replace(/\{\{\s*\$index\s*\}\}/g, String(i))
        )
        .join("")
  );
  out = out
    .replace(/\{\{\s*\.subUrl\s*\|\s*urlquery\s*\}\}/g, encodeURIComponent(s.subUrl))
    .replace(/\{\{\s*\.subUrl\s*\}\}/g, s.subUrl)
    .replace(/\{\{\s*index\s+\.emails\s+0\s*\}\}/g, s.email)
    .replace(/\{\{\s*\.enabled\s*\}\}/g, String(s.enabled))
    .replace(/\{\{\s*\.isOnline\s*\}\}/g, String(s.isOnline))
    .replace(/\{\{\s*\.expire\s*\}\}/g, String(s.expire))
    .replace(/\{\{\s*\.totalByte\s*\}\}/g, String(s.totalByte))
    .replace(/\{\{\s*\.downloadByte\s*\}\}/g, String(s.downloadByte))
    .replace(/\{\{\s*\.uploadByte\s*\}\}/g, String(s.uploadByte))
    .replace(/\{\{\s*\.total\s*\}\}/g, s.total)
    .replace(/\{\{\s*\.used\s*\}\}/g, s.used)
    .replace(/\{\{\s*\.remained\s*\}\}/g, s.remained)
    .replace(/\{\{\s*\.download\s*\}\}/g, s.download)
    .replace(/\{\{\s*\.upload\s*\}\}/g, s.upload);

  const left = out.match(/\{\{[^}]*\}\}/g);
  if (left) throw new Error("unsubstituted template placeholders: " + left.join(", "));
  return out;
}

/* ------------------------------------------------------------------ chrome / CDP */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error("no Chrome/Edge found — set CHROME_PATH");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools(port, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return res.json();
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome devtools endpoint never came up");
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  const waiters = [];
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].method === msg.method) {
          waiters[i].resolve(msg.params);
          waiters.splice(i, 1);
        }
      }
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  const waitFor = (method, timeout = 30000) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeout);
      waiters.push({
        method,
        resolve: (p) => {
          clearTimeout(t);
          resolve(p);
        },
      });
    });
  return { send, waitFor };
}

/*
 * App icons are remote (GitHub raw, Apple's CDN) and lazy-loaded, so scroll the
 * page to trigger them and wait until every <img> really has pixels — retrying
 * the ones that timed out instead of letting a placeholder land in a screenshot.
 */
async function settlePage(send) {
  const expr = `(async () => {
    /* ignore deliberate empty placeholders, e.g. the per-config QR <img src=""> */
    const all = () => [...document.images].filter(img => (img.getAttribute('src') || '').trim() !== '');
    all().forEach(img => { try { img.loading = 'eager'; } catch (e) {} });
    const step = window.innerHeight || 800;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 100));
      }
    }
    window.scrollTo(0, 0);
    const started = Date.now();
    let retries = 0;
    while (Date.now() - started < 12000) {
      const pending = all().filter(img => !img.complete || img.naturalWidth === 0);
      if (!pending.length) break;
      if (Date.now() - started > 5000 && retries < 2) {
        const failed = pending.filter(img => img.complete);
        if (failed.length) {
          failed.forEach(img => { img.src = img.src; });
          retries++;
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }
    const imgs = all();
    return { total: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length };
  })()`;
  try {
    const out = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    return out?.result?.value ?? { total: 0, loaded: 0 };
  } catch {
    return { total: 0, loaded: 0 }; // never fail a shot over slow third-party icons
  }
}

/* Bottom edges of top-level blocks, so a crop can stop between two cards. */
async function sectionBottoms(send) {
  const expr = `(() => {
    const nodes = [...document.querySelectorAll('.card, .hud-card, .panel, .container > section, footer')];
    return nodes.map(n => Math.ceil(n.getBoundingClientRect().bottom + window.scrollY)).filter(b => b > 0);
  })()`;
  const out = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return out?.result?.value ?? [];
}

async function screenshot(htmlPath, outPng, { width, scale, day, clipHeight, autoClip, seedState }) {
  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = join(os.tmpdir(), `temp-shot-${Date.now()}-${port}`);
  const child = spawn(
    findChrome(),
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--force-color-profile=srgb",
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${port}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let ws;
  try {
    await waitForDevtools(port);
    const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
    const target = await res.json();
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve);
      ws.addEventListener("error", reject);
    });
    const { send, waitFor } = cdp(ws);
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: scale,
      mobile: true,
    });
    const loaded = waitFor("Page.loadEventFired");
    await send("Page.navigate", { url: pathToFileURL(htmlPath).href });
    await loaded;
    if (typeof day === "boolean") {
      await send("Runtime.evaluate", { expression: `applyTheme(${day})` });
    }
    await sleep(2500); // let clocks and gauge needles settle
    if (seedState) {
      try {
        await send("Runtime.evaluate", { expression: seedState, awaitPromise: false });
        await sleep(300);
      } catch {}
    }
    /* Freeze every animation right where it is before shooting: a spinning coin
       or a blinking value would otherwise be caught mid-frame (thin sliver,
       half-faded digits). Themes already support this state through their
       prefers-reduced-motion rules. */
    await send("Runtime.evaluate", {
      expression: `(() => {
        const style = document.createElement('style');
        style.textContent = '*, *::before, *::after { animation: none !important; animation-delay: 0s !important; }';
        document.head.appendChild(style);
      })()`,
    });
    await sleep(200);
    const images = await settlePage(send);
    await sleep(400);

    const metrics = await send("Page.getLayoutMetrics");
    const size = metrics.cssContentSize ?? metrics.contentSize;
    let height = clipHeight ?? Math.ceil(size.height);
    if (autoClip) {
      const cuts = (await sectionBottoms(send)).filter((b) => b <= autoClip).sort((a, b) => a - b);
      height = cuts.length ? cuts[cuts.length - 1] + 16 : autoClip;
    }
    height = Math.min(height, 16000);
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    const buf = Buffer.from(shot.data, "base64");
    mkdirSync(dirname(outPng), { recursive: true });
    writeFileSync(outPng, buf);
    return { width, height, bytes: buf.length, images };
  } finally {
    try {
      ws?.close();
    } catch {}
    child.kill();
    await sleep(300);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
}

/* ------------------------------------------------------------------ main */
const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
);
const themeArg = args.find((a) => !a.startsWith("--"));

/** repo root = nearest ancestor holding pages.txt */
function findRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "pages.txt"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("pages.txt not found — run this script from inside the TEMp repo");
}

const root = findRoot();
const themes = themeArg
  ? [themeArg]
  : readFileSync(join(root, "pages.txt"), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

const width = Number(flags.width ?? 430);
const scale = Number(flags.scale ?? 2);
const day = flags.day ? true : flags.night ? false : undefined;

/* Per-theme ceiling for the inline -top crop: the image is cut just after the
   last block that ends within this many css pixels. Themes whose hero section
   is shorter (electronics = switches + clock + the two dials) get a tighter
   crop so the README thumbnail stays readable. */
const TOP_CLIP = { electronics: 760 };

let failed = 0;
for (const theme of themes) {
  const tplPath = join(root, "pages", theme, "index.html");
  if (!existsSync(tplPath)) {
    console.error(`✗ ${theme}: ${tplPath} is missing`);
    failed++;
    continue;
  }
  const html = renderStatic(readFileSync(tplPath, "utf8"), SAMPLE);
  const demoPath = join(os.tmpdir(), `temp-demo-${theme}-${Date.now()}.html`);
  writeFileSync(demoPath, html, "utf8");
  /* full page + inline README crop — unless the caller asked for one exact image */
  const shots = flags.out
    ? [{ out: String(flags.out), clipHeight: flags.clip, autoClip: flags["clip-auto"] }]
    : [
        { out: join(root, "screenshots", `${theme}.png`) },
        {
          out: join(root, "screenshots", `${theme}-top.png`),
          autoClip: flags["clip-auto"] ? Number(flags["clip-auto"]) : (TOP_CLIP[theme] ?? 1400),
        },
      ];

  for (const shot of shots) {
    try {
      const info = await screenshot(demoPath, resolve(shot.out), {
        width,
        scale,
        day,
        clipHeight: shot.clipHeight ? Number(shot.clipHeight) : undefined,
        autoClip: shot.autoClip ? Number(shot.autoClip) : undefined,
        seedState: SAMPLE_STATE[theme],
      });
      console.log(
        `✓ ${theme} → ${resolve(shot.out)}  (${info.width}px wide, ${info.height}px tall, ` +
          `${(info.bytes / 1024).toFixed(0)} KB, images ${info.images.loaded}/${info.images.total})`
      );
    } catch (error) {
      console.error(`✗ ${theme}: ${error.message}`);
      failed++;
    }
  }
  try {
    rmSync(demoPath, { force: true });
  } catch {}
}
process.exit(failed ? 1 : 0);
