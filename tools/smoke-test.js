// Smoke test: verify main.js is syntactically valid and
// define-only checks pass (no Babylon needed).

const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');

// 0. Vendor files exist
const vendorDir = path.join(__dirname, '..', 'vendor', 'babylon');
const babylonFile = path.join(vendorDir, 'babylon.js');
const guiFile = path.join(vendorDir, 'gui.min.js');
if (fs.existsSync(babylonFile)) {
  const kb = (fs.statSync(babylonFile).size / 1024).toFixed(1);
  console.log(`[OK] vendor/babylon/babylon.js exists (${kb} KB)`);
} else {
  console.error('[FAIL] vendor/babylon/babylon.js missing. Run: npm run download');
}
if (fs.existsSync(guiFile)) {
  const kb = (fs.statSync(guiFile).size / 1024).toFixed(1);
  console.log(`[OK] vendor/babylon/gui.min.js exists (${kb} KB)`);
} else {
  console.error('[FAIL] vendor/babylon/gui.min.js missing. Run: npm run download');
}

// 1. Syntax check
try {
  new Function(code);
  console.log('[OK] Syntax is valid');
} catch (e) {
  console.error('[FAIL] Syntax error:', e.message);
  process.exit(1);
}

// 2. Top-level structure check
const checks = [
  { regex: /class\s+Game\s*{/, label: 'class Game defined' },
  { regex: /class\s+InputManager\s*{/, label: 'class InputManager defined' },
  { regex: /class\s+AudioManager\s*{/, label: 'class AudioManager defined' },
  { regex: /const\s+CHARACTER_DEFS\s*=/, label: 'CHARACTER_DEFS defined' },
  { regex: /const\s+SHOP_ITEMS\s*=/, label: 'SHOP_ITEMS defined' },
  { regex: /const\s+ZONES\s*=/, label: 'ZONES defined' },
  { regex: /const\s+NPC_DIALOGUES\s*=/, label: 'NPC_DIALOGUES defined' },
  { regex: /const\s+DROP_ITEMS\s*=/, label: 'DROP_ITEMS defined' },
];

let allOk = true;
for (const c of checks) {
  if (c.regex.test(code)) console.log('[OK]', c.label);
  else { console.error('[FAIL]', c.label); allOk = false; }
}

// 3. Required characters (object keys can be unquoted)
const requiredChars = [
  'kiko', 'risa', 'leni',
  'zaldy', 'sara_d', 'bongbong', 'alan', 'sarah_d', 'buwaya',
  'rally', 'fishball', 'icecream', 'water', 'kids',
  'civilian_m', 'civilian_f', 'civ_m_b', 'civ_m_c', 'civ_m_d',
  'civ_f_b', 'civ_f_c', 'civ_f_d', 'kid_b', 'kid_c',
];
for (const c of requiredChars) {
  const re = new RegExp(`(^|[\\s,{])${c}\\s*:`);
  if (re.test(code)) console.log('[OK] Character:', c);
  else { console.error('[FAIL] Missing character:', c); allOk = false; }
}

// 4. Required zones
const requiredZones = ['manila', 'baguio', 'quiapo', 'visayas', 'mindanao'];
for (const z of requiredZones) {
  if (code.includes(`${z}:`) || code.includes(`'${z}'`)) console.log('[OK] Zone:', z);
  else { console.error('[FAIL] Missing zone:', z); allOk = false; }
}

// 5. Required methods
const requiredMethods = [
  'setupScene', 'generateAllSprites', 'drawCharacter', 'genFrames',
  'createEntityMesh', 'createMenu', 'showZoneSelect', 'loadZone',
  'spawnPlayer', 'spawnEnemies', 'spawnNpcs', 'spawnDenseCrowd', 'spawnProp',
  'spawnDroppedItem', 'clearWorld', 'startGame', 'createHud', 'showIntro',
  'updateHud', 'update', 'switchChar', 'doMeleeAttack', 'doInteract',
  'showDialogue', 'showShop', 'buyItem', 'updateEnemies', 'updateNpcs',
  'updateProjectiles', 'updateDroppedItems', 'showGameOver', 'run'
];
for (const m of requiredMethods) {
  if (code.includes(`${m}(`)) console.log('[OK] Method:', m);
  else { console.error('[FAIL] Missing method:', m); allOk = false; }
}

// 6. Item count
const itemMatches = code.match(/^\s*(\w+):\s*{[^}]*name:/gm);
console.log('[INFO] Found', itemMatches ? itemMatches.length : 0, 'items in shop');

console.log(allOk ? '\n=== ALL CHECKS PASSED ===' : '\n=== SOME CHECKS FAILED ===');
process.exit(allOk ? 0 : 1);
