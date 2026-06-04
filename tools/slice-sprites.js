// Sprite Slicing Tool
// Reads a labeled sprite sheet (e.g. PNG with characters + name labels below)
// and extracts clean 32x32 character frames into an atlas + JSON manifest.
//
// Usage (Node.js):
//   1. npm init -y && npm install sharp   (one time)
//   2. node tools/slice-sprites.js <path-to-source.png>
//
// Output:
//   assets/sprites/characters_atlas.png   - packed sprite atlas
//   assets/sprites/characters_atlas.json  - frame rects + animation lists
//
// If sharp is not available, the game will fall back to the procedural
// pixel-art generator (see genFrames in src/main.js).

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('ERROR: "sharp" is not installed. Run: npm install sharp');
  console.error('If you cannot install sharp, the game has a built-in procedural');
  console.error('pixel-art generator. The game still runs without slicing.');
  process.exit(1);
}

// Character grid layout as it appears in the source sheet (approximate).
// Adjust ROIS if your source has a different layout. Each entry: [name, x, y, w, h].
// h must be tall enough to include the body sprite (label is below body).
const DEFAULT_ROIS = [
  { id: 'kiko',      x:  20,  y:  10, w: 130, h: 200 },
  { id: 'risa',      x: 175,  y:  10, w: 130, h: 200 },
  { id: 'leni',      x: 330,  y:  10, w: 130, h: 200 },
  { id: 'zaldy',     x: 485,  y:  10, w: 130, h: 200 },
  { id: 'sara_d',    x: 640,  y:  10, w: 130, h: 200 },
  { id: 'bongbong',  x: 795,  y:  10, w: 130, h: 200 },
  { id: 'alan',      x: 950,  y:  10, w: 130, h: 200 },
  { id: 'buwaya',    x:1105,  y:  10, w: 150, h: 220 },
  { id: 'sarah_d',   x:1280,  y:  10, w: 130, h: 200 },
  { id: 'rally',     x:  20,  y: 250, w: 220, h: 200 },
  { id: 'fishball',  x: 265,  y: 250, w: 200, h: 220 },
  { id: 'icecream',  x: 490,  y: 250, w: 200, h: 220 },
  { id: 'water',     x: 715,  y: 250, w: 170, h: 220 },
  { id: 'kids',      x: 910,  y: 250, w: 200, h: 200 },
  { id: 'civilian_m',x:  20,  y: 490, w: 100, h: 200 },
  { id: 'civilian_f',x: 145,  y: 490, w: 100, h: 200 },
  // Add more civilian variants (5 color variants) for dense crowds
  { id: 'civilian_m2',x: 270,  y: 490, w: 100, h: 200 },
  { id: 'civilian_m3',x: 395,  y: 490, w: 100, h: 200 },
  { id: 'civilian_f2',x: 520,  y: 490, w: 100, h: 200 },
  { id: 'civilian_f3',x: 645,  y: 490, w: 100, h: 200 },
  { id: 'kid_a',     x: 770,  y: 490, w:  90, h: 180 },
  { id: 'kid_b',     x: 880,  y: 490, w:  90, h: 180 },
];

const FRAME_W = 32;
const FRAME_H = 32;

async function sliceOne(input, roi) {
  // Extract the ROI from the source
  const body = await sharp(input)
    .extract({ left: roi.x, top: roi.y, width: roi.w, height: roi.h })
    .resize(FRAME_W, FRAME_H, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return body;
}

async function main() {
  const src = process.argv[2];
  if (!src) {
    console.error('Usage: node tools/slice-sprites.js <source.png>');
    process.exit(1);
  }
  if (!fs.existsSync(src)) {
    console.error('Source not found: ' + src);
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'assets', 'sprites');
  fs.mkdirSync(outDir, { recursive: true });

  // Slice each ROI into a base "idle" frame
  const frames = [];
  for (const roi of DEFAULT_ROIS) {
    try {
      const buf = await sliceOne(src, roi);
      frames.push({ id: roi.id, base: buf });
      console.log('Sliced ' + roi.id);
    } catch (e) {
      console.warn('Failed to slice ' + roi.id + ': ' + e.message);
    }
  }

  // Pack into a horizontal atlas (one row per char, frames 0..N)
  // Generate simple animation frames: idle(2), walk(4), attack(2)
  const animTypes = [
    { key: 'idle',   count: 2, transform: (i) => i === 0 ? 0 : 1 },
    { key: 'walk',   count: 4, transform: (i) => i },
    { key: 'attack', count: 2, transform: (i) => i },
  ];

  const manifest = {
    frameW: FRAME_W,
    frameH: FRAME_H,
    characters: {},
  };

  let atlasX = 0;
  const rowBuffers = [];
  let rowH = 0;
  let rowW = 0;

  for (const f of frames) {
    const charEntry = { frames: [], anims: {} };
    for (const anim of animTypes) {
      charEntry.anims[anim.key] = [];
      for (let i = 0; i < anim.count; i++) {
        // Re-encode frame; production tools would do real pixel-offset animation
        const buf = await sharp(f.base).png().toBuffer();
        charEntry.frames.push({
          rect: [atlasX, 0, FRAME_W, FRAME_H],
          anim: anim.key,
          index: i,
        });
        charEntry.anims[anim.key].push(charEntry.frames.length - 1);
        atlasX += FRAME_W;
        rowW = atlasX;
        rowH = Math.max(rowH, FRAME_H);
      }
    }
    manifest.characters[f.id] = charEntry;
  }

  // Build atlas: row of all frames
  const atlas = await sharp({
    create: {
      width: rowW,
      height: rowH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const composed = [];
  let x = 0;
  for (const f of frames) {
    for (const anim of animTypes) {
      for (let i = 0; i < anim.count; i++) {
        const buf = await sharp(f.base).png().toBuffer();
        composed.push({ input: buf, left: x, top: 0 });
        x += FRAME_W;
      }
    }
  }

  const out = await sharp(atlas).composite(composed).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'characters_atlas.png'), out);
  fs.writeFileSync(path.join(outDir, 'characters_atlas.json'), JSON.stringify(manifest, null, 2));

  console.log('Wrote ' + path.join(outDir, 'characters_atlas.png'));
  console.log('Wrote ' + path.join(outDir, 'characters_atlas.json'));
  console.log('Sliced ' + frames.length + ' characters.');
}

main().catch(e => { console.error(e); process.exit(1); });
