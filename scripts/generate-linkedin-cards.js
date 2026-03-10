const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const cacheDir = path.join(projectRoot, ".cache");
fs.mkdirSync(cacheDir, { recursive: true });
process.env.XDG_CACHE_HOME = cacheDir;

const sharp = require("sharp");

const WIDTH = 1080;
const HEIGHT = 1350;
const CONFIG_PATH = path.join(__dirname, "..", "content", "linkedin-cards.json");

function parseArgs(argv) {
  const args = { slug: null, outDir: null };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--slug" && argv[index + 1]) {
      args.slug = argv[index + 1];
      index += 1;
    } else if (value === "--out-dir" && argv[index + 1]) {
      args.outDir = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text, maxChars, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxChars));
      current = word.slice(maxChars);
    }

    if (lines.length === maxLines) {
      return lines;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\.*$/, "") + "...";
  }

  return lines;
}

function buildText(lines, x, y, lineHeight, className) {
  return lines
    .map((line, index) => {
      const dy = y + index * lineHeight;
      return `<text x="${x}" y="${dy}" class="${className}">${escapeXml(line)}</text>`;
    })
    .join("");
}

function buildSvg(card) {
  const titleLines = wrapText(card.title, 24, 4);
  const summaryLines = wrapText(card.summary, 42, 4);
  const route = card.route.replace(/\/$/, "");
  const { bg, bgAccent, primary, secondary, muted, pillBg } = card.palette;

  return `
<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="1080" y2="1350" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="#ffffff" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="160" y1="120" x2="920" y2="1260" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${bgAccent}" stop-opacity="0.10" />
    </linearGradient>
    <filter id="shadow" x="120" y="80" width="840" height="1190" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
    <style>
      .eyebrow { font: 700 30px 'Arial'; letter-spacing: 2px; text-transform: uppercase; fill: ${primary}; }
      .kicker { font: 700 26px 'Arial'; letter-spacing: 2px; text-transform: uppercase; fill: ${primary}; }
      .title { font: 700 86px 'Arial'; letter-spacing: -2px; fill: ${secondary}; }
      .summary { font: 400 36px 'Arial'; fill: ${muted}; }
      .footer-label { font: 700 28px 'Arial'; letter-spacing: 1.8px; text-transform: uppercase; fill: ${primary}; }
      .footer-value { font: 700 30px 'Courier New'; fill: ${secondary}; }
      .reading { font: 700 28px 'Arial'; fill: ${secondary}; }
      .brand { font: 700 28px 'Arial'; letter-spacing: 2px; text-transform: uppercase; fill: #ffffff; }
      .brand-sub { font: 400 24px 'Arial'; fill: rgba(255,255,255,0.72); }
      .ghost { font: 700 220px 'Arial'; letter-spacing: -8px; fill: ${primary}; fill-opacity: 0.08; }
    </style>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGradient)" />
  <circle cx="920" cy="180" r="180" fill="${bgAccent}" fill-opacity="0.18" />
  <circle cx="160" cy="1180" r="230" fill="${primary}" fill-opacity="0.08" />
  <rect x="90" y="84" width="900" height="1180" rx="42" fill="url(#accentGradient)" />

  <g filter="url(#shadow)">
    <rect x="110" y="110" width="860" height="1130" rx="42" fill="#ffffff" fill-opacity="0.82" />
    <rect x="110" y="110" width="860" height="1130" rx="42" stroke="rgba(15,23,42,0.08)" />
  </g>

  <rect x="154" y="156" width="280" height="58" rx="29" fill="${pillBg}" />
  <text x="186" y="194" class="eyebrow">${escapeXml(card.eyebrow)}</text>

  <rect x="760" y="160" width="154" height="42" rx="21" fill="${secondary}" fill-opacity="0.08" />
  <text x="792" y="188" class="kicker">${escapeXml(card.kicker)}</text>

  ${buildText(titleLines, 160, 330, 92, "title")}
  ${buildText(summaryLines, 160, 760, 52, "summary")}

  <text x="618" y="1110" class="ghost">${escapeXml(card.kicker.slice(0, 3).toUpperCase())}</text>

  <rect x="160" y="1036" width="760" height="3" rx="2" fill="${primary}" fill-opacity="0.2" />

  <text x="160" y="1098" class="footer-label">Resumo para LinkedIn</text>
  <text x="160" y="1146" class="footer-value">${escapeXml(route)}</text>
  <text x="160" y="1194" class="reading">${escapeXml(card.readingTime)}</text>

  <rect x="160" y="1216" width="760" height="1" fill="rgba(15,23,42,0.08)" />

  <rect x="160" y="1238" width="308" height="64" rx="24" fill="${secondary}" />
  <text x="192" y="1276" class="brand">Safrinha Analytics</text>
  <text x="488" y="1278" class="brand-sub">card 4:5 para publicacao</text>
</svg>`;
}

async function generateCard(card, outputDir) {
  const svg = buildSvg(card);
  const outputPath = path.join(outputDir, `${card.slug}.png`);

  await sharp(Buffer.from(svg, "utf8"))
    .png()
    .toFile(outputPath);

  return outputPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const outputDir = path.resolve(process.cwd(), args.outDir || config.outputDir);
  const cards = args.slug
    ? config.cards.filter((card) => card.slug === args.slug)
    : config.cards;

  if (cards.length === 0) {
    console.error("Nenhum card encontrado para os argumentos informados.");
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const card of cards) {
    const filePath = await generateCard(card, outputDir);
    console.log(`Gerado: ${path.relative(process.cwd(), filePath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
