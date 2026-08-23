/**
 * verify_greeting_photo_layout.js
 * Confirms Personal Greeting reserves text around the photo and never paints over it.
 * Uses installed Edge via Playwright executablePath.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(__dirname, "screenshots");
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const LONG = "Happy Birthday, Atul! May this day bring you good health, happiness, and a wonderful year ahead!";
const SHORT = "Happy Birthday, Atul!";

function detectEdge() {
  for (const p of EDGE_PATHS) if (fs.existsSync(p)) return p;
  throw new Error("Installed Edge not found");
}

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      const filePath = path.join(ROOT, urlPath.replace(/\//g, path.sep));
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("not found"); return; }
        const ext = path.extname(filePath).toLowerCase();
        const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webmanifest": "application/manifest+json" };
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, url: "http://127.0.0.1:" + server.address().port + "/index.html" });
    });
  });
}

(async () => {
  const EDGE = detectEdge();
  const { server, url } = await startServer();
  console.log("LOCAL", url);
  const browser = await chromium.launch({ headless: false, executablePath: EDGE, args: ["--no-first-run"] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await ctx.newPage();
  const errs = [];
  const skip = [/ServiceWorker/i, /null.*origin/i, /Failed to load resource/i];
  page.on("pageerror", e => { if (!skip.some(r => r.test(e.message))) { errs.push(e.message); console.log("PAGE ERR", e.message); } });
  page.on("console", m => { if (m.type() === "error" && !skip.some(r => r.test(m.text()))) { errs.push(m.text()); console.log("CONSOLE ERR", m.text()); } });

  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1600);

  const hasPlanner = await page.evaluate(() => typeof planGreetingPhotoText === "function");
  console.log("planGreetingPhotoText", hasPlanner);

  await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 1200;
    const x = c.getContext("2d");
    x.fillStyle = "#E11D48";
    x.fillRect(0, 0, 400, 1200);
    x.fillStyle = "#22D3EE";
    x.fillRect(0, 420, 400, 360);
    x.fillStyle = "#111827";
    x.font = "bold 48px system-ui";
    x.fillText("PHOTO", 70, 620);
    const img = new Image();
    img.src = c.toDataURL("image/png");
    return new Promise(resolve => {
      img.onload = () => {
        gPhoto = img;
        gPhotoId = "verify-photo";
        resolve();
      };
    });
  });

  const cases = [
    { design: "VIP Family", style: "large", message: LONG },
    { design: "VIP Family", style: "small", message: LONG },
    { design: "VIP Family", style: "circle", message: LONG },
    { design: "VIP Family", style: "large", message: SHORT },
    { design: "Executive Blue", style: "large", message: LONG }
  ];

  const results = [];
  for (const t of cases) {
    const info = await page.evaluate(([design, style, message]) => {
      $("gDesignMode").value = "manual";
      $("gDesign").value = design;
      $("gPhotoStyle").value = style;
      $("gOccasion").value = "Birthday";
      $("gName").value = "Atul";
      $("gTitleEn").value = "Happy Birthday Atul";
      $("gMessageEn").value = message;
      $("gDate").value = "2024-08-23";
      if ($("signature")) $("signature").value = "Dr. Atul";
      gRender();
      const panel = { x: 70, y: 55, w: 940, h: 895 };
      const plan = planGreetingPhotoText(design, style, true, panel);
      const photoRect = plan.photo ? { x: plan.photo.px, y: plan.photo.py, w: plan.photo.pw, h: plan.photo.ph } : null;
      const msgBox = { x: plan.text.x, y: plan.text.y, w: plan.text.w, h: Math.max(40, plan.text.maxBottom - plan.text.y) };
      const overlap = !!(photoRect && gRectsOverlap(photoRect, { x: plan.text.x, y: plan.text.y, w: plan.text.w, h: plan.text.maxBottom - plan.text.y }, 15));
      const c = document.getElementById("gPoster");
      const cx = c.getContext("2d");
      const left = cx.getImageData(220, 430, 1, 1).data;
      const right = photoRect ? cx.getImageData(Math.round(photoRect.x + photoRect.w / 2), Math.round(photoRect.y + photoRect.h / 2), 1, 1).data : null;
      return {
        design, style,
        planner: typeof planGreetingPhotoText === "function",
        styleUsed: plan.styleUsed,
        warning: plan.warning,
        textBox: plan.text,
        photoRect,
        overlap,
        status: (document.getElementById("gStatus") || {}).textContent,
        canvas: { w: c.width, h: c.height },
        leftSample: [left[0], left[1], left[2]],
        rightSample: right ? [right[0], right[1], right[2]] : null
      };
    }, [t.design, t.style, t.message]);

    const issues = [];
    if (!info.planner) issues.push("planner missing");
    if (info.canvas.w !== 1080 || info.canvas.h !== 1350) issues.push("canvas " + info.canvas.w + "x" + info.canvas.h);
    if (info.overlap) issues.push("text box overlaps photo");
    if (!info.photoRect) issues.push("photo hidden");
    const label = (t.design.replace(/\s+/g, "_") + "_" + t.style + "_" + (t.message === SHORT ? "short" : "long")).toLowerCase();
    const png = await page.evaluate(() => document.getElementById("gPoster").toDataURL("image/png"));
    fs.writeFileSync(path.join(SHOTS, "greet_" + label + ".png"), Buffer.from(png.split(",")[1], "base64"));
    console.log("\n--- " + label + " ---");
    console.log(JSON.stringify({ styleUsed: info.styleUsed, warning: info.warning, overlap: info.overlap, textBox: info.textBox, photoRect: info.photoRect, status: info.status, leftSample: info.leftSample, rightSample: info.rightSample }, null, 2));
    console.log(issues.length ? "FAIL " + issues.join("; ") : "PASS");
    results.push({ label, issues, info });
  }

  console.log("\n=== SUMMARY ===");
  let all = true;
  for (const r of results) {
    if (r.issues.length) all = false;
    console.log((r.issues.length ? "FAIL" : "PASS") + "  " + r.label + (r.issues.length ? "  " + r.issues.join("; ") : ""));
  }
  console.log("JS errors", errs.length, errs);
  if (errs.length) all = false;
  await browser.close();
  server.close();
  process.exit(all ? 0 : 1);
})().catch(err => { console.error(err); process.exit(1); });
