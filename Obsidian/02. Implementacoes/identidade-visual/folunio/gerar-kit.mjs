import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Reutiliza exatamente os vetores apresentados no artifact. Sem chamadas de rede.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const require = createRequire(import.meta.url);
const store = path.join(root, 'node_modules/.pnpm');
const sharpPackage = (await fs.readdir(store)).find(name => name.startsWith('sharp@'));
if (!sharpPackage) throw new Error('sharp não encontrado nas dependências locais do Next.js.');
const sharp = require(path.join(store, sharpPackage, 'node_modules/sharp'));
const html = await fs.readFile(path.join(here, 'index.html'), 'utf8');
const source = html.match(/<script id="brand-engine">([\s\S]*?)<\/script>/)?.[1];
if (!source) throw new Error('Motor vetorial ausente no artifact.');
const context = vm.createContext({});
vm.runInContext(source, context);
const B = context.FolunioBrand;
const assets = path.join(here, 'assets');
let count = 0;

async function write(dir, name, data) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), data);
  count++;
}

async function png(svg, width, height) {
  return sharp(Buffer.from(svg)).resize(width, height).png().toBuffer();
}

function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const base = 6 + index * 16;
    header[base] = size === 256 ? 0 : size;
    header[base + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, base + 4);
    header.writeUInt16LE(32, base + 6);
    header.writeUInt32LE(data.length, base + 8);
    header.writeUInt32LE(offset, base + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(image => image.data)]);
}

for (const concept of B.concepts) {
  const dir = path.join(assets, concept.id);
  for (const theme of Object.keys(B.themes)) {
    await write(dir, `logo-${theme}.svg`, B.logo({ variant: concept.id, theme }));
    await write(dir, `logo-compacto-${theme}.svg`, B.logo({ variant: concept.id, theme, compact: true }));
  }
  for (const [name, color] of [['preto', '#151515'], ['branco', '#ffffff']]) {
    await write(dir, `logo-${name}.svg`, B.logo({ variant: concept.id, mono: color }));
  }
  await write(dir, 'logo-noturno.png', await png(B.logo({ variant: concept.id, theme: 'noturno' }), 2500, 480));
  const faviconImages = [];
  for (const size of [16, 32, 48, 128, 192, 512]) {
    const svg = B.icon({ variant: concept.id, size });
    const data = await png(svg, size, size);
    await write(dir, `icon-${size}.svg`, svg);
    await write(dir, `icon-${size}.png`, data);
    const metadata = await sharp(data).metadata();
    if (metadata.width !== size || metadata.height !== size || metadata.format !== 'png') {
      throw new Error(`Ícone inválido: ${concept.id}/${size}`);
    }
    if (size <= 48) faviconImages.push({ size, data });
  }
  await write(dir, 'favicon.ico', ico(faviconImages));
  await write(dir, 'avatar-1024.png', await png(B.icon({ variant: concept.id, size: 1024 }), 1024, 1024));
  await write(dir, 'social-1200x630.svg', B.social(concept.id));
  await write(dir, 'social-1200x630.png', await png(B.social(concept.id), 1200, 630));
  await write(dir, 'manifest.fragment.json', JSON.stringify({
    icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
    action: { default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  }, null, 2) + '\n');
}

// Contato visual para inspeção sem depender de ferramentas de automação.
const rows = B.concepts.map((c, i) => {
  const mark = B.logo({ variant: c.id }).replace('<svg ', `<svg x="65" y="${90 + i * 225}" width="790" height="152" `);
  const icon = B.icon({ variant: c.id, size: 128 }).replace('<svg ', `<svg x="955" y="${106 + i * 225}" `);
  return `<text x="65" y="${72 + i * 225}" font-family="Segoe UI,Arial,sans-serif" font-size="18" fill="#5c574e">${c.tag} — ${c.name.replaceAll('&', '&amp;')}</text>${mark}${icon}`;
}).join('');
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><rect width="1200" height="760" fill="#faf7f2"/>${rows}</svg>`;
await write(here, 'comparacao.png', await png(sheet, 1200, 760));
console.log(`${count} arquivos gerados; dimensões de todos os ícones PNG conferidas.`);
