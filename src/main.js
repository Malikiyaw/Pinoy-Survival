/* ============================================================
   PINOY SURVIVAL
   3D 32x32 pixel-art survival adventure in the Philippines
   Built with Babylon.js (vendored locally) - no build step required
   ============================================================ */

const $L = document.getElementById('loading');
const $B = document.getElementById('loadBar');
const $M = document.getElementById('loadMsg');
const $H = document.getElementById('loadHint');

function hideLoading() {
  if ($B) $B.style.width = '100%';
  if ($L) {
    $L.style.transition = 'opacity 0.3s';
    $L.style.opacity = '0';
    setTimeout(() => { if ($L) $L.classList.add('gone'); }, 400);
  }
}
function showError(msg, hint) {
  if ($M) $M.textContent = msg;
  if (hint && $H) $H.textContent = hint;
  if ($B) { $B.style.background = '#ff3333'; $B.style.width = '100%'; }
  console.error(msg);
}

if (typeof BABYLON === 'undefined') {
  showError('Failed to load Babylon.js.',
    'Make sure vendor/babylon/babylon.js and vendor/babylon/gui.min.js exist. Try running: npm run download');
  throw new Error('Babylon.js not loaded');
}

// WebGL check
(function() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) {
      showError('WebGL is not available in your browser.',
        'Try a different browser, enable hardware acceleration, or update your graphics drivers.');
      throw new Error('No WebGL');
    }
  } catch (e) {
    showError('WebGL initialization failed.', 'See console for details.');
    throw e;
  }
})();

const { Engine, Scene, Vector3, Color3, Color4, MeshBuilder, StandardMaterial,
  DynamicTexture, HemisphericLight, DirectionalLight, FollowCamera, BillboardMode } = BABYLON;
const _G = BABYLON.GUI || BABYLON;
const { AdvancedDynamicTexture, TextBlock, Rectangle, Control, StackPanel, Button, Ellipse } = _G;

/* ============================================================
   CHARACTER DEFINITIONS
   Each character has: stats, colors, intro line, animation offsets, taunts
   ============================================================ */
const CHARACTER_DEFS = {
  // === PLAYABLE ===
  kiko:      { name: 'Kiko Pangilinan',     role: 'playable', w: 48, h: 72, speed: 5,   hp: 120,
               special: 'Senate Speech',     specialCost: 30, specialType: 'aoe',
               intro: 'Bato bato sa langit, tamaan ay huwag magagalit!',
               palette: { skin:0xF5C9A0, hair:0x3A2A1A, shirt:0xF5F5DC, shirt2:0xFFFFFF, pants:0x1A1A3A, shoes:0x1A1A1A, accent:0x2C2C2C },
               hairStyle: 'short' },
  risa:      { name: 'Risa Hontiveros',     role: 'playable', w: 48, h: 72, speed: 6,   hp: 95,
               special: 'Committee Hearing', specialCost: 20, specialType: 'ranged',
               intro: 'Makinig tayo sa boses ng bayan.',
               palette: { skin:0xF0C8A0, hair:0x2A1A0A, shirt:0xCC3333, shirt2:0x8B0000, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0xFFFFFF },
               hairStyle: 'long' },
  leni:      { name: 'Leni Robredo',        role: 'playable', w: 48, h: 72, speed: 5,   hp: 110,
               special: 'Community Service', specialCost: 25, specialType: 'heal',
               intro: 'Ang buhay ay serbisyo, hindi pansariling interes.',
               palette: { skin:0xF5C9A0, hair:0x4A2A1A, shirt:0xFFD700, shirt2:0xDAA520, pants:0xFFFFFF, shoes:0x1A1A1A, accent:0x2C2C2C },
               hairStyle: 'bob' },

  // === ENEMIES ===
  zaldy:     { name: 'Zaldy Co',            role: 'enemy', w: 48, h: 72, hp: 80,  speed: 3,   dmg: 8,  aggro: 12, atkRange: 1.5, coins: 15,
               taunt: 'Wala akong pakialam sa inyo, basta ang budget... ibigay lang.',
               palette: { skin:0xE8B888, hair:0x1A1A1A, shirt:0x2C2C2C, shirt2:0x1A1A1A, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0x444444 },
               hairStyle: 'short' },
  sara_d:    { name: 'Sara Duterte',        role: 'enemy', w: 48, h: 72, hp: 100, speed: 4,   dmg: 12, aggro: 15, atkRange: 1.8, coins: 20,
               taunt: 'Walang masama sa kahit anong paraan.',
               palette: { skin:0xF0C8A0, hair:0x2A1A0A, shirt:0x2E7D32, shirt2:0x1B5E20, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0xFFFFFF },
               hairStyle: 'long' },
  bongbong:  { name: 'Bongbong Marcos',     role: 'enemy', w: 48, h: 72, hp: 120, speed: 2.5, dmg: 15, aggro: 10, atkRange: 2.0, coins: 25,
               taunt: 'Hindi naman ako nangako ng tapat, pero... bakit hindi?',
               palette: { skin:0xE8B888, hair:0x1A1A1A, shirt:0xF5F5DC, shirt2:0xDAA520, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0x888888 },
               hairStyle: 'short' },
  alan:      { name: 'Alan Peter Cayetano', role: 'enemy', w: 48, h: 72, hp: 90,  speed: 3.5, dmg: 10, aggro: 14, atkRange: 8.0, coins: 18, ranged:true,
               taunt: 'Baka naman pwede... isang request lang.',
               palette: { skin:0xE8B888, hair:0x1A1A1A, shirt:0x808080, shirt2:0x505050, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF },
               hairStyle: 'short' },
  sarah_d:   { name: 'Sarah Discaya',       role: 'enemy', w: 48, h: 72, hp: 70,  speed: 4.5, dmg: 6,  aggro: 16, atkRange: 1.2, coins: 12,
               taunt: 'Bahay? Marami akong bahay.',
               palette: { skin:0xF5C9A0, hair:0x1A0A00, shirt:0x1A237E, shirt2:0x0D1B5E, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF },
               hairStyle: 'long' },
  buwaya:    { name: 'Buwaya',              role: 'enemy', w: 56, h: 72, hp: 150, speed: 2,   dmg: 20, aggro: 8,  atkRange: 2.5, coins: 30, aquatic:true,
               taunt: '... *rawr* ...',
               palette: { skin:0x3B7A3B, hair:0x1A3A1A, shirt:0x3B7A3B, shirt2:0x2A5A2A, pants:0x1A3A1A, shoes:0x1A3A1A, accent:0x000000 },
               hairStyle: 'none', isBuwaya: true },

  // === NPCS (VENDORS + CIVILIANS) ===
  rally:     { name: 'Rally Crowd',         role: 'npc',   w: 80, h: 64,
               palette: { skin:0xE8B888, hair:0x1A1A1A, shirt:0xFF4444, shirt2:0x8B0000, pants:0x4444FF, shoes:0x1A1A1A, accent:0xFFFFFF } },
  fishball:  { name: 'Fishball Vendor',     role: 'npc',   w: 64, h: 64,
               palette: { skin:0xE8B888, hair:0x1A1A1A, shirt:0xD2B48C, shirt2:0xA0826D, pants:0x8B4513, shoes:0x1A1A1A, accent:0x2C2C2C } },
  icecream:  { name: 'Ice Cream Seller',    role: 'npc',   w: 64, h: 64,
               palette: { skin:0xF5C9A0, hair:0x2A1A0A, shirt:0xFFB6C1, shirt2:0xFF69B4, pants:0x4169E1, shoes:0x1A1A1A, accent:0xFFFFFF } },
  water:     { name: 'Water Seller',        role: 'npc',   w: 48, h: 64,
               palette: { skin:0xE8B888, hair:0x1A1A1A, shirt:0x87CEEB, shirt2:0x4682B4, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kids:      { name: 'Kids Playing',        role: 'npc',   w: 64, h: 48,
               palette: { skin:0xF5C9A0, hair:0x1A1A0A, shirt:0xFFA500, shirt2:0x0000FF, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civilian_m:{ name: 'Kuya',                role: 'npc',   w: 40, h: 64,
               palette: { skin:0xE8B888, hair:0x1A1A0A, shirt:0x90EE90, shirt2:0x228B22, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civilian_f:{ name: 'Ate',                 role: 'npc',   w: 40, h: 64,
               palette: { skin:0xF5C9A0, hair:0x2A1A0A, shirt:0xFFB6C1, shirt2:0xFF1493, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },

  // === CIVILIAN VARIANTS (for crowd density) ===
  civ_m_b:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xE8B888, hair:0x1A1A0A, shirt:0x4169E1, shirt2:0x1E40AF, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_c:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xC9956A, hair:0x0A0A0A, shirt:0xFF6347, shirt2:0xB22222, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_d:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xF5C9A0, hair:0x3A2A1A, shirt:0xDAA520, shirt2:0xB8860B, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_b:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xE8B888, hair:0x1A0A00, shirt:0x9370DB, shirt2:0x6A0DAD, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_c:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xF5C9A0, hair:0x4A2A1A, shirt:0x00CED1, shirt2:0x008B8B, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_d:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xC9956A, hair:0x2A1A0A, shirt:0xFFA500, shirt2:0xFF8C00, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_b:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xF5C9A0, hair:0x1A1A0A, shirt:0xFF6347, shirt2:0xFF0000, pants:0x1E40AF, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_c:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xE8B888, hair:0x2A1A0A, shirt:0xFFD700, shirt2:0xFFA500, pants:0x228B22, shoes:0x1A1A1A, accent:0xFFFFFF } },

  // === ADDITIONAL CIVILIAN VARIANTS (expanded crowd diversity) ===
  civ_m_e:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xD2B48C, hair:0x1A1A1A, shirt:0x20B2AA, shirt2:0x008B8B, pants:0x2F4F4F, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_f:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xE8B888, hair:0x3A2A1A, shirt:0x6495ED, shirt2:0x4169E1, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_g:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xC9956A, hair:0x0A0A0A, shirt:0x98FB98, shirt2:0x228B22, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_h:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xF5C9A0, hair:0x4A2A1A, shirt:0xFF4500, shirt2:0xB22222, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_i:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xE8B888, hair:0x2A1A0A, shirt:0x87CEEB, shirt2:0x4682B4, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_m_j:   { name: 'Kuya',  role: 'npc', w: 40, h: 64, palette: { skin:0xD2B48C, hair:0x1A1A0A, shirt:0xDDA0DD, shirt2:0xBA55D3, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_e:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xF5C9A0, hair:0x1A0A00, shirt:0xFF69B4, shirt2:0xFF1493, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_f:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xE8B888, hair:0x3A2A1A, shirt:0x00BFFF, shirt2:0x1E90FF, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_g:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xC9956A, hair:0x2A1A0A, shirt:0x98FB98, shirt2:0x228B22, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_h:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xF5C9A0, hair:0x4A2A1A, shirt:0xFFA07A, shirt2:0xFA8072, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_i:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xE8B888, hair:0x1A1A0A, shirt:0xE6E6FA, shirt2:0xD8BFD8, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  civ_f_j:   { name: 'Ate',   role: 'npc', w: 40, h: 64, palette: { skin:0xD2B48C, hair:0x0A0A0A, shirt:0xF0E68C, shirt2:0xEEE8AA, pants:0x2C2C2C, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_d:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xE8B888, hair:0x1A1A0A, shirt:0x00CED1, shirt2:0x008B8B, pants:0xFF4500, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_e:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xF5C9A0, hair:0x3A2A1A, shirt:0x9370DB, shirt2:0x6A0DAD, pants:0x228B22, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_f:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xC9956A, hair:0x0A0A0A, shirt:0xFFD700, shirt2:0xFFA500, pants:0x1E40AF, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_g:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xE8B888, hair:0x2A1A0A, shirt:0xFF6347, shirt2:0xFF0000, pants:0x00CED1, shoes:0x1A1A1A, accent:0xFFFFFF } },
  kid_h:     { name: 'Bata',  role: 'npc', w: 32, h: 48, palette: { skin:0xF5C9A0, hair:0x4A2A1A, shirt:0x98FB98, shirt2:0x228B22, pants:0xFF8C00, shoes:0x1A1A1A, accent:0xFFFFFF } },
};

/* ============================================================
   NPC DIALOGUES (Tagalog / Filipino mix)
   ============================================================ */
const NPC_DIALOGUES = {
  fishball: [
    { speaker: 'Fishball Vendor', text: 'Kain ka, pre! Mainit pa ang fishball! Piso lang bawat stick!' },
    { speaker: 'Fishball Vendor', text: 'Gusto mo rin ng taho? Sarap nito, mainit-init pa!' },
    { speaker: 'Fishball Vendor', text: 'Fishball! Kwek-kwek! Tusok-tusok! Halika, bili ka!' },
  ],
  icecream: [
    { speaker: 'Ice Cream Seller', text: 'Sorbetes! Chocolate, cheese, o ube? Mainit ang panahon!' },
    { speaker: 'Ice Cream Seller', text: 'Halo-halo rin meron! Pampalamig sa init!' },
    { speaker: 'Ice Cream Seller', text: 'Sorbetes! Pampalamig sa tag-araw, pre!' },
  ],
  water: [
    { speaker: 'Water Seller', text: 'Tubig! Limang piso lang! Mainit ang panahon, pre!' },
    { speaker: 'Water Seller', text: 'Buko juice rin meron! Fresh from the coconut!' },
    { speaker: 'Water Seller', text: 'Tubig! Tubig! Limang piso lang!' },
  ],
  rally: [
    { speaker: 'Protester', text: 'HUSTISYA! HUSTISYA!' },
    { speaker: 'Protester', text: 'Tama na! Sobra na! Palitan na!' },
    { speaker: 'Protester', text: 'Bayani ng bayan, huwag mong kalimutan!' },
  ],
  kids: [
    { speaker: 'Kid', text: 'Taya! Ikaw ang taya!' },
    { speaker: 'Kid', text: 'Ang bilis ko, huli niyo ako!' },
    { speaker: 'Kid', text: 'Tara, maglaro tayo sa kanto!' },
  ],
  civilian_m: [
    { speaker: 'Kuya', text: 'Ingat kayo, mainit ang panahon ngayon.' },
    { speaker: 'Kuya', text: 'Saan ka galing, pre?' },
    { speaker: 'Kuya', text: 'Mag-ingat sa daan, maraming pasaway.' },
    { speaker: 'Kuya', text: 'Kape muna tayo bago magtrabaho.' },
  ],
  civilian_f: [
    { speaker: 'Ate', text: 'Saan ka galing? Ingat ka, madami na naman nagkakagulo.' },
    { speaker: 'Ate', text: 'Tara, palengke tayo mamaya.' },
    { speaker: 'Ate', text: 'Mayroon ka bang maipapahiram? Kailangan ko ng pamasahe.' },
  ],
  civ_m_b: [{ speaker: 'Kuya', text: 'Sarap ng hangin ngayon, ano?' }],
  civ_m_c: [{ speaker: 'Kuya', text: 'Uy, kababayan! Tagasaan ka?' }],
  civ_m_d: [{ speaker: 'Kuya', text: 'Mabuhay! Pilipino tayo, di ba?' }],
  civ_f_b: [{ speaker: 'Ate', text: 'Mabait naman ang hitsura mo, teh.' }],
  civ_f_c: [{ speaker: 'Ate', text: 'Bago ka dumaan, may lechon ako, gusto mo?' }],
  civ_f_d: [{ speaker: 'Ate', text: 'Tara, sabay tayo umuwi.' }],
  kid_b: [{ speaker: 'Bata', text: 'Ate/Kuya, pabili naman ng sorbetes!' }],
  kid_c: [{ speaker: 'Bata', text: 'Tara, maghabulan tayo sa park!' }],
};

/* ============================================================
   SHOP ITEMS (25+)
   ============================================================ */
const SHOP_ITEMS = {
  // === FOOD ===
  fishball:     { name: 'Fishball (Stick)', desc: 'Mainit na fishball',          effect: 'hunger',  value: 20,  price: 5,  vendor: 'fishball' },
  taho:         { name: 'Taho',            desc: 'Mainit na taho',              effect: 'hunger',  value: 15,  price: 5,  vendor: 'fishball' },
  kwek_kwek:    { name: 'Kwek-Kwek',       desc: 'Orange quail eggs',           effect: 'hunger',  value: 18,  price: 8,  vendor: 'fishball' },
  balut:        { name: 'Balut',           desc: 'Duck embryo (for the brave)', effect: 'hunger',  value: 30,  price: 15, vendor: 'fishball' },
  icecream:     { name: 'Sorbetes',        desc: 'Ice cream!',                  effect: 'hunger',  value: 10,  price: 8,  vendor: 'icecream' },
  halo_halo:    { name: 'Halo-Halo',       desc: 'Pampalamig!',                 effect: 'hunger',  value: 25,  price: 15, vendor: 'icecream' },
  lechon:       { name: 'Lechon Kawali',   desc: 'Crispy!',                     effect: 'hunger',  value: 50,  price: 20, vendor: 'icecream' },
  adobo:        { name: 'Adobo Rice',      desc: 'Classic viand',               effect: 'hunger',  value: 40,  price: 15, vendor: 'icecream' },
  sisig:        { name: 'Sisig',           desc: 'Sizzling pork sisig',         effect: 'hunger',  value: 35,  price: 18, vendor: 'icecream' },
  sinigang:     { name: 'Sinigang',        desc: 'Sour soup',                   effect: 'hunger',  value: 35,  price: 15, vendor: 'icecream' },
  pancit:       { name: 'Pancit Canton',   desc: 'Pancit canton',               effect: 'hunger',  value: 30,  price: 12, vendor: 'icecream' },
  lumpia:       { name: 'Lumpia',          desc: 'Crispy spring rolls',         effect: 'hunger',  value: 25,  price: 10, vendor: 'icecream' },
  // === DRINKS ===
  water_bottle: { name: 'Water Bottle',    desc: 'Tubig!',                      effect: 'thirst',  value: 30,  price: 3,  vendor: 'water' },
  buko_juice:   { name: 'Buko Juice',      desc: 'Fresh coconut!',              effect: 'thirst',  value: 25,  price: 5,  vendor: 'water' },
  sago:         { name: 'Sago\'t Gulaman', desc: 'Tapioca + jelly drink',       effect: 'thirst',  value: 22,  price: 8,  vendor: 'water' },
  softdrink:    { name: 'Softdrink',       desc: 'Cold soda',                   effect: 'thirst',  value: 20,  price: 10, vendor: 'water' },
  beer:         { name: 'San Miguel',      desc: 'Beer (adults only)',          effect: 'thirst',  value: 25,  price: 35, vendor: 'water' },
  // === STAMINA ===
  energy_drink: { name: 'Energy Drink',    desc: '+Stamina',                    effect: 'stamina', value: 50,  price: 10, vendor: 'fishball' },
  coffee:       { name: 'Kape Barako',     desc: 'Strong coffee',               effect: 'stamina', value: 30,  price: 8,  vendor: 'water' },
  banana:       { name: 'Saging',          desc: 'Banana energy',               effect: 'stamina', value: 20,  price: 5,  vendor: 'water' },
  // === HEALING ===
  medkit:       { name: 'First Aid Kit',   desc: '+Health',                     effect: 'health',  value: 30,  price: 25, vendor: 'icecream' },
  ginger_tea:   { name: 'Salabat',         desc: 'Ginger tea',                  effect: 'health',  value: 15,  price: 8,  vendor: 'water' },
  lagundi:      { name: 'Lagundi',         desc: 'Herbal cough cure',           effect: 'health',  value: 20,  price: 10, vendor: 'water' },
  // === WEAPONS / TOOLS ===
  tsinelas:     { name: 'Tsinelas',        desc: 'Throw at enemies!',           effect: 'damage',  value: 12,  price: 8,  vendor: 'fishball' },
  balaraw:      { name: 'Balaraw',         desc: 'Slingshot (ranged)',          effect: 'damage',  value: 18,  price: 25, vendor: 'icecream' },
  rock:         { name: 'Bato',            desc: 'Throw a rock',                effect: 'damage',  value: 8,   price: 1,  vendor: 'water' },

  // === ADDITIONAL FOOD ===
  goto:         { name: 'Goto',            desc: 'Congee with tripe',           effect: 'hunger',  value: 35,  price: 12, vendor: 'icecream' },
  mami:         { name: 'Mami',            desc: 'Noodle soup',                 effect: 'hunger',  value: 30,  price: 10, vendor: 'icecream' },
  tocino:       { name: 'Tocino',          desc: 'Sweet cured pork',            effect: 'hunger',  value: 40,  price: 15, vendor: 'icecream' },
  longganisa:   { name: 'Longganisa',      desc: 'Filipino sausage',            effect: 'hunger',  value: 35,  price: 12, vendor: 'icecream' },
  chicharon:    { name: 'Chicharon',       desc: 'Crispy pork rinds',           effect: 'hunger',  value: 25,  price: 8,  vendor: 'fishball' },
  puto:         { name: 'Puto',            desc: 'Steamed rice cake',           effect: 'hunger',  value: 20,  price: 5,  vendor: 'fishball' },
  kakanin:      { name: 'Kakanin',         desc: 'Assorted rice cakes',         effect: 'hunger',  value: 30,  price: 10, vendor: 'icecream' },

  // === ADDITIONAL DRINKS ===
  calamansi:    { name: 'Calamansi Juice', desc: 'Filipino lemon juice',        effect: 'thirst',  value: 25,  price: 5,  vendor: 'water' },
  mango_shake:  { name: 'Mango Shake',     desc: 'Sweet mango smoothie',        effect: 'thirst',  value: 30,  price: 12, vendor: 'water' },
  pineapple:    { name: 'Pineapple Juice', desc: 'Fresh pineapple',             effect: 'thirst',  value: 25,  price: 8,  vendor: 'water' },
  coconut_water:{ name: 'Buko Water',      desc: 'Fresh coconut water',         effect: 'thirst',  value: 35,  price: 10, vendor: 'water' },

  // === ADDITIONAL STAMINA ===
  sports_drink: { name: 'Sports Drink',    desc: 'Electrolytes',                effect: 'stamina', value: 60,  price: 15, vendor: 'fishball' },
  chocolate:    { name: 'Chocolate',       desc: 'Dark chocolate boost',        effect: 'stamina', value: 25,  price: 8,  vendor: 'water' },

  // === ADDITIONAL HEALING ===
  antibiotics:  { name: 'Antibiotics',     desc: 'Strong medicine',             effect: 'health',  value: 50,  price: 40, vendor: 'icecream' },
  vitamins:     { name: 'Vitamins',        desc: 'Daily vitamins',              effect: 'health',  value: 20,  price: 15, vendor: 'water' },
  painkiller:   { name: 'Painkiller',      desc: 'Relieves pain',               effect: 'health',  value: 25,  price: 12, vendor: 'icecream' },

  // === ADDITIONAL WEAPONS / TOOLS ===
  slipper:      { name: 'Slipper',         desc: 'Heavy flip-flop throw',       effect: 'damage',  value: 15,  price: 5,  vendor: 'fishball' },
  umbrella:     { name: 'Payong',          desc: 'Defensive umbrella',          effect: 'damage',  value: 10,  price: 8,  vendor: 'water' },
  flashlight:   { name: 'Flashlight',      desc: 'Blinds enemies briefly',      effect: 'damage',  value: 5,   price: 12, vendor: 'icecream' },
  whistle:      { name: 'Whistle',         desc: 'Distracts enemies',           effect: 'damage',  value: 3,   price: 3,  vendor: 'fishball' },
};

/* ============================================================
   ENEMY DROP ITEMS (satirical; no real-world claims)
   ============================================================ */
const DROP_ITEMS = {
  pork:    { name: 'Pork Barrel',     desc: 'A suspicious bag of coins',         coins: 50 },
  bill:    { name: 'Fake Bill',       desc: 'A useless piece of paper',          coins: 0  },
  bag:     { name: 'Dirt Bag',        desc: 'Smells suspicious',                 coins: 0  },
  watch:   { name: 'Luxury Watch',    desc: 'Worth some coins',                  coins: 30 },
  house:   { name: 'Mini-House Key',  desc: 'A small souvenir key',              coins: 20 },
  rice:    { name: 'Bigas Sack',      desc: 'A sack of rice',                    coins: 15 },
  ballot:  { name: 'Old Ballot',      desc: 'A faded ballot',                    coins: 5  },
  flag:    { name: 'Rally Flag',      desc: 'A tattered flag',                   coins: 10 },
};

/* ============================================================
   ZONES (Luzon: Manila, Baguio, Quiapo + locked)
   ============================================================ */
const ZONES = {
  manila: {
    name: 'Manila', desc: 'Kabisera ng Pilipinas', w: 120, h: 120, ground: 0x555555,
    fogColor: 0x14142a, fogDensity: 0.012, ambientTint: 0xFFF1D0, sunIntensity: 0.55,
    landmarks: ['Rizal Park', 'Intramuros', 'LRT Line', 'BGC Towers', 'Manila Bay', 'Ermita', 'Malate', 'Paco', 'Sampaloc', 'Tondo'],
    enemies: [
      { id: 'zaldy',    x: 15,  z: 10 },
      { id: 'zaldy',    x: -20, z: 20 },
      { id: 'sara_d',   x: 25,  z: -15 },
      { id: 'alan',     x: -25, z: -12 },
      { id: 'sarah_d',  x: 10,  z: 25 },
      { id: 'bongbong', x: -5,  z: -30 },
      { id: 'zaldy',    x: 30,  z: 30 },
      { id: 'sara_d',   x: -30, z: -25 },
      { id: 'alan',     x: 20,  z: 20 },
      { id: 'sarah_d',  x: -35, z: 15 },
      { id: 'bongbong', x: 35,  z: -20 },
    ],
    npcs: [
      { id: 'fishball', x: -8,  z: 2 },
      { id: 'icecream', x: 5,   z: 10 },
      { id: 'water',    x: -15, z: -10 },
      { id: 'rally',    x: 0,   z: -20 },
      { id: 'kids',     x: 10,  z: -5 },
      { id: 'civilian_m',x: -5, z: 12 },
      { id: 'civilian_f',x: 15, z: 5 },
      { id: 'civilian_m',x: -25,z: 8 },
      { id: 'icecream', x: 25,  z: 18 },
      { id: 'water',    x: -30, z: -18 },
      { id: 'fishball', x: 30,  z: -10 },
      { id: 'rally',    x: -15, z: 25 },
      { id: 'kids',     x: 20,  z: -20 },
      { id: 'civilian_f',x: -20, z: -15 },
      { id: 'civilian_m',x: 10, z: 30 },
      { id: 'water',    x: 35,  z: 25 },
      { id: 'icecream', x: -35, z: -20 },
      { id: 'fishball', x: 0,   z: 35 },
      { id: 'rally',    x: 40,  z: 0 },
      { id: 'kids',     x: -40, z: 10 },
    ],
    buildings: [
      { x: -30, z: -30, w: 6, h: 4, d: 6, c: 0x8B7355, type: 'house' },
      { x: 30,  z: 30,  w: 7, h: 5, d: 6, c: 0xA0522D, type: 'mall' },
      { x: -12, z: 8,   w: 5, h: 3, d: 5, c: 0xDAA520, type: 'house' },
      { x: 12,  z: -12, w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: 0,   z: 0,   w: 10, h: 4, d: 10, c: 0xB22222, type: 'plaza' },
      { x: -20, z: 22,  w: 5, h: 3, d: 5, c: 0x8B4513, type: 'house' },
      { x: 22,  z: -22, w: 5, h: 3, d: 5, c: 0xD2691E, type: 'house' },
      { x: 0,   z: -35, w: 12, h: 6, d: 5, c: 0x4A4A8A, type: 'mall' },
      { x: -40, z: 0,   w: 8, h: 4, d: 8, c: 0x8B7355, type: 'church' },
      { x: 40,  z: 0,   w: 10, h: 5, d: 8, c: 0x696969, type: 'mall' },
      { x: 0,   z: 40,  w: 8, h: 3, d: 8, c: 0xD2B48C, type: 'market' },
      { x: -35, z: -35, w: 6, h: 3, d: 6, c: 0xBC8F8F, type: 'house' },
      { x: 35,  z: 35,  w: 6, h: 4, d: 6, c: 0xCD853F, type: 'house' },
      { x: -45, z: 20,  w: 8, h: 3, d: 6, c: 0x8B4513, type: 'school' },
      { x: 45,  z: -20, w: 8, h: 4, d: 8, c: 0x708090, type: 'hospital' },
      { x: 0,   z: -50, w: 10, h: 5, d: 10, c: 0x4A4A8A, type: 'mall' },
      { x: -50, z: -10, w: 6, h: 3, d: 6, c: 0xDAA520, type: 'restaurant' },
      { x: 50,  z: 10,  w: 7, h: 4, d: 7, c: 0x8B7355, type: 'hotel' },
    ],
    trees: [
      { x: -35, z: 0 }, { x: 35, z: -15 }, { x: -15, z: 35 },
      { x: 20, z: -20 }, { x: -40, z: -30 }, { x: 40, z: 40 },
      { x: 0, z: 15 }, { x: -10, z: -35 },
      { x: 25, z: 25 }, { x: -25, z: -25 },
      { x: 45, z: 0 }, { x: -45, z: 0 },
      { x: 0, z: 45 }, { x: 0, z: -45 },
      { x: -30, z: 30 }, { x: 30, z: -30 },
      { x: -50, z: 30 }, { x: 50, z: -30 },
      { x: -55, z: -20 }, { x: 55, z: 20 },
    ],
    props: [
      { type: 'jeepney', x: 8, z: 8 }, { type: 'jeepney', x: -10, z: -5 },
      { type: 'lamppost', x: 15, z: 0 }, { type: 'lamppost', x: -15, z: 0 },
      { type: 'lrt',     x: 0, z: -15 }, { type: 'fountain', x: 0, z: 8 },
      { type: 'jeepney', x: -20, z: 15 }, { type: 'lamppost', x: 20, z: -10 },
      { type: 'lamppost', x: -25, z: -20 }, { type: 'jeepney', x: 25, z: 20 },
      { type: 'fountain', x: -30, z: 10 }, { type: 'lrt', x: 0, z: 25 },
      { type: 'jeepney', x: 35, z: -15 }, { type: 'lamppost', x: -35, z: 25 },
      { type: 'fountain', x: 15, z: 30 }, { type: 'lrt', x: -20, z: -30 },
    ],
  },

  baguio: {
    name: 'Baguio', desc: 'Summer Capital ng Pilipinas', w: 100, h: 100, ground: 0x2E7D32,
    fogColor: 0x6B7F8E, fogDensity: 0.020, ambientTint: 0xD6E5F2, sunIntensity: 0.4,
    landmarks: ['Burnham Park', 'Session Road', 'Mines View', 'Strawberry Farm', 'Botanical Garden', 'Camp John Hay', 'SM Baguio', 'Panagbenga'],
    enemies: [
      { id: 'bongbong', x: 0,  z: 0 },
      { id: 'zaldy',    x: -15, z: 10 },
      { id: 'sara_d',   x: 15, z: -8 },
      { id: 'sarah_d',  x: -10, z: -15 },
      { id: 'alan',     x: 20, z: 15 },
      { id: 'bongbong', x: -20, z: -20 },
      { id: 'zaldy',    x: 25, z: -25 },
      { id: 'sara_d',   x: -25, z: 25 },
    ],
    npcs: [
      { id: 'fishball', x: -5,  z: 8 },
      { id: 'water',    x: 8,   z: -5 },
      { id: 'kids',     x: 0,   z: 10 },
      { id: 'civilian_m',x: -10, z: -5 },
      { id: 'civilian_f',x: 10,  z: 8 },
      { id: 'icecream', x: 15,  z: 12 },
      { id: 'water',    x: -20, z: 2 },
      { id: 'fishball', x: 20,  z: -10 },
      { id: 'rally',    x: 0,   z: -15 },
      { id: 'kids',     x: -15, z: 15 },
      { id: 'civilian_m',x: 15, z: -15 },
      { id: 'civilian_f',x: -20, z: -20 },
      { id: 'icecream', x: 25,  z: 20 },
      { id: 'water',    x: -25, z: 20 },
      { id: 'fishball', x: 30,  z: 0 },
      { id: 'rally',    x: -30, z: -10 },
      { id: 'kids',     x: 10,  z: 25 },
      { id: 'civilian_m',x: -10, z: 30 },
      { id: 'civilian_f',x: 20, z: -25 },
      { id: 'icecream', x: -30, z: 25 },
    ],
    buildings: [
      { x: -20, z: -20, w: 6, h: 3, d: 6, c: 0x8B4513, type: 'house' },
      { x: 20,  z: 20,  w: 5, h: 3, d: 5, c: 0xA0522D, type: 'house' },
      { x: 0,   z: 15,  w: 7, h: 3, d: 7, c: 0xDAA520, type: 'plaza' },
      { x: 0,   z: -15, w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -30, z: 0,   w: 8, h: 4, d: 8, c: 0x696969, type: 'mall' },
      { x: 30,  z: 0,   w: 6, h: 3, d: 6, c: 0x8B7355, type: 'market' },
      { x: 0,   z: 30,  w: 5, h: 3, d: 5, c: 0xD2B48C, type: 'stall' },
      { x: -15, z: 25,  w: 4, h: 3, d: 4, c: 0xBC8F8F, type: 'house' },
      { x: 15,  z: -25, w: 4, h: 3, d: 4, c: 0xCD853F, type: 'house' },
      { x: -35, z: -15, w: 6, h: 3, d: 6, c: 0x8B4513, type: 'school' },
      { x: 35,  z: 15,  w: 7, h: 4, d: 7, c: 0x708090, type: 'hotel' },
      { x: 0,   z: -30, w: 8, h: 3, d: 8, c: 0x4A4A8A, type: 'mall' },
      { x: -25, z: -30, w: 5, h: 3, d: 5, c: 0xDAA520, type: 'restaurant' },
      { x: 25,  z: 30,  w: 6, h: 3, d: 6, c: 0x8B7355, type: 'house' },
    ],
    trees: [
      { x: -20, z: 8 }, { x: 20, z: -10 }, { x: -8, z: -22 },
      { x: 12, z: 18 }, { x: -25, z: -12 }, { x: 25, z: 12 },
      { x: -30, z: 25 }, { x: 30, z: -25 }, { x: 0, z: 0 },
      { x: -35, z: 0 }, { x: 35, z: 0 },
      { x: 0, z: 35 }, { x: 0, z: -35 },
      { x: -40, z: 20 }, { x: 40, z: -20 },
      { x: -10, z: 40 }, { x: 10, z: -40 },
      { x: -45, z: -25 }, { x: 45, z: 25 },
      { x: -50, z: 10 }, { x: 50, z: -10 },
      { x: -15, z: -45 }, { x: 15, z: 45 },
    ],
    props: [
      { type: 'lamppost', x: 8, z: 0 }, { type: 'lamppost', x: -8, z: 0 },
      { type: 'fountain', x: 0, z: 15 },
      { type: 'lamppost', x: 15, z: 10 }, { type: 'lamppost', x: -15, z: -10 },
      { type: 'fountain', x: 20, z: -15 }, { type: 'lamppost', x: -20, z: 20 },
      { type: 'lamppost', x: 25, z: 25 }, { type: 'fountain', x: -25, z: -25 },
      { type: 'lamppost', x: 30, z: 0 }, { type: 'lamppost', x: -30, z: 0 },
      { type: 'fountain', x: 0, z: 30 }, { type: 'lamppost', x: 0, z: -30 },
    ],
  },

  quiapo: {
    name: 'Quiapo', desc: 'Pusong Maynila - Quiapo Church', w: 110, h: 110, ground: 0x8B7355,
    fogColor: 0x1A1A2E, fogDensity: 0.015, ambientTint: 0xFFE0B2, sunIntensity: 0.5,
    landmarks: ['Quiapo Church', 'Plaza Miranda', 'Black Nazarene Route', 'Hidalgo St', 'Carriedo', 'Escolta', 'Binondo', 'San Nicolas'],
    enemies: [
      { id: 'zaldy',    x: 10,  z: 10 },
      { id: 'sara_d',   x: -15, z: 8 },
      { id: 'sarah_d',  x: 8,   z: -12 },
      { id: 'alan',     x: -10, z: -8 },
      { id: 'bongbong', x: 15,  z: -15 },
      { id: 'zaldy',    x: -20, z: -20 },
      { id: 'sara_d',   x: 25,  z: 20 },
      { id: 'sarah_d',  x: -25, z: 25 },
      { id: 'alan',     x: 20,  z: -25 },
      { id: 'bongbong', x: -30, z: 10 },
    ],
    npcs: [
      { id: 'rally',     x: 0,   z: -12 },
      { id: 'fishball',  x: -5,  z: 3 },
      { id: 'icecream',  x: 8,   z: 5 },
      { id: 'water',     x: -10, z: -5 },
      { id: 'kids',      x: 5,   z: 12 },
      { id: 'civilian_m',x: 12,  z: -3 },
      { id: 'civilian_f',x: -8,  z: 10 },
      { id: 'civilian_m',x: 18,  z: 8 },
      { id: 'icecream',  x: -15, z: 15 },
      { id: 'water',     x: 3,   z: -18 },
      { id: 'fishball',  x: -20, z: -15 },
      { id: 'rally',     x: 25,  z: -10 },
      { id: 'kids',      x: -25, z: 20 },
      { id: 'civilian_f',x: 20,  z: 25 },
      { id: 'civilian_m',x: -30, z: -10 },
      { id: 'water',     x: 30,  z: 15 },
      { id: 'icecream',  x: -35, z: 5 },
      { id: 'fishball',  x: 35,  z: -20 },
      { id: 'rally',     x: -40, z: 20 },
      { id: 'kids',      x: 40,  z: 0 },
    ],
    buildings: [
      { x: 0,  z: 0,   w: 12, h: 6, d: 12, c: 0x8B7355, type: 'church' },
      { x: -22, z: -22, w: 5, h: 3, d: 5, c: 0xA0522D, type: 'house' },
      { x: 22,  z: 22,  w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -10, z: 20,  w: 4, h: 2, d: 4, c: 0xD2B48C, type: 'stall' },
      { x: 15,  z: -20, w: 4, h: 2, d: 4, c: 0xD2B48C, type: 'stall' },
      { x: -30, z: 0,   w: 8, h: 4, d: 8, c: 0x696969, type: 'mall' },
      { x: 30,  z: 0,   w: 6, h: 3, d: 6, c: 0x8B7355, type: 'market' },
      { x: 0,   z: 30,  w: 5, h: 3, d: 5, c: 0xD2B48C, type: 'stall' },
      { x: -15, z: 30,  w: 5, h: 3, d: 5, c: 0xBC8F8F, type: 'house' },
      { x: 15,  z: -30, w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -35, z: -20, w: 6, h: 3, d: 6, c: 0x8B4513, type: 'school' },
      { x: 35,  z: 20,  w: 7, h: 4, d: 7, c: 0x708090, type: 'hotel' },
      { x: 0,   z: -35, w: 8, h: 3, d: 8, c: 0x4A4A8A, type: 'mall' },
      { x: -25, z: -35, w: 5, h: 3, d: 5, c: 0xDAA520, type: 'restaurant' },
      { x: 25,  z: 35,  w: 6, h: 3, d: 6, c: 0x8B7355, type: 'house' },
      { x: -40, z: 30,  w: 8, h: 4, d: 8, c: 0x8B7355, type: 'church' },
      { x: 40,  z: -30, w: 10, h: 5, d: 10, c: 0x696969, type: 'mall' },
      { x: 0,   z: 45,  w: 6, h: 3, d: 6, c: 0xD2B48C, type: 'market' },
    ],
    trees: [
      { x: -25, z: 0 }, { x: 25, z: 0 },
      { x: 0, z: 25 }, { x: 0, z: -25 },
      { x: -20, z: 20 }, { x: 20, z: -20 },
      { x: -35, z: 10 }, { x: 35, z: -10 },
      { x: -10, z: 35 }, { x: 10, z: -35 },
      { x: -40, z: -20 }, { x: 40, z: 20 },
      { x: -45, z: 30 }, { x: 45, z: -30 },
      { x: -30, z: 40 }, { x: 30, z: -40 },
      { x: -50, z: 0 }, { x: 50, z: 0 },
      { x: 0, z: 50 }, { x: 0, z: -50 },
      { x: -55, z: -30 }, { x: 55, z: 30 },
      { x: -20, z: -50 }, { x: 20, z: 50 },
    ],
    props: [
      { type: 'cross',  x: 0, z: 10 },
      { type: 'lamppost', x: 8, z: 0 }, { type: 'lamppost', x: -8, z: 0 },
      { type: 'jeepney', x: 12, z: 8 },
      { type: 'lamppost', x: 20, z: -8 }, { type: 'lamppost', x: -20, z: 8 },
      { type: 'fountain', x: 0, z: 20 },
      { type: 'jeepney', x: -15, z: 20 }, { type: 'lamppost', x: 15, z: -15 },
      { type: 'cross',  x: -30, z: 15 },
      { type: 'lamppost', x: 30, z: 15 }, { type: 'lamppost', x: -30, z: -15 },
      { type: 'fountain', x: 25, z: 25 }, { type: 'jeepney', x: -25, z: -25 },
      { type: 'lamppost', x: 35, z: 0 }, { type: 'lamppost', x: -35, z: 0 },
      { type: 'fountain', x: 0, z: 35 }, { type: 'cross', x: 0, z: -35 },
    ],
  },

  visayas: {
    name: 'Visayas', desc: 'Heart of the Philippines - Cebu, Bohol, Iloilo', w: 110, h: 110, ground: 0x3A7D3A,
    fogColor: 0x2E4A3E, fogDensity: 0.018, ambientTint: 0xE8F5E9, sunIntensity: 0.5,
    landmarks: ['Magellan\'s Cross', 'Chocolate Hills', 'Sinulog Festival', 'Bohol Tarsier', 'Iloilo Esplanade', 'Boracay', 'Cebu City', 'Tagbilaran'],
    enemies: [
      { id: 'zaldy',    x: 10,  z: 10 },
      { id: 'sara_d',   x: -15, z: 8 },
      { id: 'sarah_d',  x: 8,   z: -12 },
      { id: 'alan',     x: -10, z: -8 },
      { id: 'bongbong', x: 15,  z: -15 },
      { id: 'zaldy',    x: -20, z: -20 },
      { id: 'sara_d',   x: 25,  z: 20 },
      { id: 'sarah_d',  x: -25, z: 25 },
      { id: 'alan',     x: 20,  z: -25 },
      { id: 'bongbong', x: -30, z: 10 },
      { id: 'buwaya',   x: 0,   z: 0 },
    ],
    npcs: [
      { id: 'fishball',  x: -5,  z: 3 },
      { id: 'icecream',  x: 8,   z: 5 },
      { id: 'water',     x: -10, z: -5 },
      { id: 'rally',     x: 0,   z: -12 },
      { id: 'kids',      x: 5,   z: 12 },
      { id: 'civilian_m',x: 12,  z: -3 },
      { id: 'civilian_f',x: -8,  z: 10 },
      { id: 'civilian_m',x: 18,  z: 8 },
      { id: 'icecream',  x: -15, z: 15 },
      { id: 'water',     x: 3,   z: -18 },
      { id: 'fishball',  x: -20, z: -15 },
      { id: 'rally',     x: 25,  z: -10 },
      { id: 'kids',      x: -25, z: 20 },
      { id: 'civilian_f',x: 20,  z: 25 },
      { id: 'civilian_m',x: -30, z: -10 },
      { id: 'water',     x: 30,  z: 15 },
      { id: 'icecream',  x: -35, z: 5 },
      { id: 'fishball',  x: 35,  z: -20 },
      { id: 'rally',     x: -40, z: 20 },
      { id: 'kids',      x: 40,  z: 0 },
    ],
    buildings: [
      { x: 0,  z: 0,   w: 10, h: 5, d: 10, c: 0x8B7355, type: 'church' },
      { x: -22, z: -22, w: 5, h: 3, d: 5, c: 0xA0522D, type: 'house' },
      { x: 22,  z: 22,  w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -10, z: 20,  w: 4, h: 2, d: 4, c: 0xD2B48C, type: 'stall' },
      { x: 15,  z: -20, w: 4, h: 2, d: 4, c: 0xD2B48C, type: 'stall' },
      { x: -30, z: 0,   w: 8, h: 4, d: 8, c: 0x696969, type: 'mall' },
      { x: 30,  z: 0,   w: 6, h: 3, d: 6, c: 0x8B7355, type: 'market' },
      { x: 0,   z: 30,  w: 5, h: 3, d: 5, c: 0xD2B48C, type: 'stall' },
      { x: -15, z: 30,  w: 5, h: 3, d: 5, c: 0xBC8F8F, type: 'house' },
      { x: 15,  z: -30, w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -35, z: -20, w: 6, h: 3, d: 6, c: 0x8B4513, type: 'school' },
      { x: 35,  z: 20,  w: 7, h: 4, d: 7, c: 0x708090, type: 'hotel' },
      { x: 0,   z: -35, w: 8, h: 3, d: 8, c: 0x4A4A8A, type: 'mall' },
      { x: -25, z: -35, w: 5, h: 3, d: 5, c: 0xDAA520, type: 'restaurant' },
      { x: 25,  z: 35,  w: 6, h: 3, d: 6, c: 0x8B7355, type: 'house' },
      { x: -40, z: 30,  w: 8, h: 4, d: 8, c: 0x8B7355, type: 'church' },
      { x: 40,  z: -30, w: 10, h: 5, d: 10, c: 0x696969, type: 'mall' },
      { x: 0,   z: 45,  w: 6, h: 3, d: 6, c: 0xD2B48C, type: 'market' },
    ],
    trees: [
      { x: -25, z: 0 }, { x: 25, z: 0 },
      { x: 0, z: 25 }, { x: 0, z: -25 },
      { x: -20, z: 20 }, { x: 20, z: -20 },
      { x: -35, z: 10 }, { x: 35, z: -10 },
      { x: -10, z: 35 }, { x: 10, z: -35 },
      { x: -40, z: -20 }, { x: 40, z: 20 },
      { x: -45, z: 30 }, { x: 45, z: -30 },
      { x: -30, z: 40 }, { x: 30, z: -40 },
      { x: -50, z: 0 }, { x: 50, z: 0 },
      { x: 0, z: 50 }, { x: 0, z: -50 },
      { x: -55, z: -30 }, { x: 55, z: 30 },
      { x: -20, z: -50 }, { x: 20, z: 50 },
    ],
    props: [
      { type: 'lamppost', x: 8, z: 0 }, { type: 'lamppost', x: -8, z: 0 },
      { type: 'fountain', x: 0, z: 15 },
      { type: 'lamppost', x: 15, z: 10 }, { type: 'lamppost', x: -15, z: -10 },
      { type: 'fountain', x: 20, z: -15 }, { type: 'lamppost', x: -20, z: 20 },
      { type: 'lamppost', x: 25, z: 25 }, { type: 'fountain', x: -25, z: -25 },
      { type: 'lamppost', x: 30, z: 0 }, { type: 'lamppost', x: -30, z: 0 },
      { type: 'fountain', x: 0, z: 30 }, { type: 'lamppost', x: 0, z: -30 },
      { type: 'jeepney', x: 10, z: 10 }, { type: 'jeepney', x: -10, z: -10 },
    ],
  },

  mindanao: {
    name: 'Mindanao', desc: 'Land of Promise - Davao, Cotabato, Zamboanga', w: 110, h: 110, ground: 0x4A7D3A,
    fogColor: 0x3A5A3E, fogDensity: 0.018, ambientTint: 0xE8F5E9, sunIntensity: 0.5,
    landmarks: ['Mount Apo', 'Davao Crocodile Park', 'Kadayawan Festival', 'Cotabato City', 'Zamboanga Pink Mosque', 'Maria Cristina Falls', 'Iligan', 'General Santos'],
    enemies: [
      { id: 'zaldy',    x: 10,  z: 10 },
      { id: 'sara_d',   x: -15, z: 8 },
      { id: 'sarah_d',  x: 8,   z: -12 },
      { id: 'alan',     x: -10, z: -8 },
      { id: 'bongbong', x: 15,  z: -15 },
      { id: 'zaldy',    x: -20, z: -20 },
      { id: 'sara_d',   x: 25,  z: 20 },
      { id: 'sarah_d',  x: -25, z: 25 },
      { id: 'alan',     x: 20,  z: -25 },
      { id: 'bongbong', x: -30, z: 10 },
      { id: 'buwaya',   x: 0,   z: 0 },
    ],
    npcs: [
      { id: 'fishball',  x: -5,  z: 3 },
      { id: 'icecream',  x: 8,   z: 5 },
      { id: 'water',     x: -10, z: -5 },
      { id: 'rally',     x: 0,   z: -12 },
      { id: 'kids',      x: 5,   z: 12 },
      { id: 'civilian_m',x: 12,  z: -3 },
      { id: 'civilian_f',x: -8,  z: 10 },
      { id: 'civilian_m',x: 18,  z: 8 },
      { id: 'icecream',  x: -15, z: 15 },
      { id: 'water',     x: 3,   z: -18 },
      { id: 'fishball',  x: -20, z: -15 },
      { id: 'rally',     x: 25,  z: -10 },
      { id: 'kids',      x: -25, z: 20 },
      { id: 'civilian_f',x: 20,  z: 25 },
      { id: 'civilian_m',x: -30, z: -10 },
      { id: 'water',     x: 30,  z: 15 },
      { id: 'icecream',  x: -35, z: 5 },
      { id: 'fishball',  x: 35,  z: -20 },
      { id: 'rally',     x: -40, z: 20 },
      { id: 'kids',      x: 40,  z: 0 },
    ],
    buildings: [
      { x: 0,  z: 0,   w: 10, h: 5, d: 10, c: 0x8B7355, type: 'church' },
      { x: -22, z: -22, w: 5, h: 3, d: 5, c: 0xA0522D, type: 'house' },
      { x: 22,  z: 22,  w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -10, z: 20,  w: 4, h: 2, d: 4, c: 0xD2B48C, type: 'stall' },
      { x: 15,  z: -20, w: 4, h: 2, d: 4, c: 0xD2B48C, type: 'stall' },
      { x: -30, z: 0,   w: 8, h: 4, d: 8, c: 0x696969, type: 'mall' },
      { x: 30,  z: 0,   w: 6, h: 3, d: 6, c: 0x8B7355, type: 'market' },
      { x: 0,   z: 30,  w: 5, h: 3, d: 5, c: 0xD2B48C, type: 'stall' },
      { x: -15, z: 30,  w: 5, h: 3, d: 5, c: 0xBC8F8F, type: 'house' },
      { x: 15,  z: -30, w: 5, h: 3, d: 5, c: 0xCD853F, type: 'house' },
      { x: -35, z: -20, w: 6, h: 3, d: 6, c: 0x8B4513, type: 'school' },
      { x: 35,  z: 20,  w: 7, h: 4, d: 7, c: 0x708090, type: 'hotel' },
      { x: 0,   z: -35, w: 8, h: 3, d: 8, c: 0x4A4A8A, type: 'mall' },
      { x: -25, z: -35, w: 5, h: 3, d: 5, c: 0xDAA520, type: 'restaurant' },
      { x: 25,  z: 35,  w: 6, h: 3, d: 6, c: 0x8B7355, type: 'house' },
      { x: -40, z: 30,  w: 8, h: 4, d: 8, c: 0x8B7355, type: 'church' },
      { x: 40,  z: -30, w: 10, h: 5, d: 10, c: 0x696969, type: 'mall' },
      { x: 0,   z: 45,  w: 6, h: 3, d: 6, c: 0xD2B48C, type: 'market' },
    ],
    trees: [
      { x: -25, z: 0 }, { x: 25, z: 0 },
      { x: 0, z: 25 }, { x: 0, z: -25 },
      { x: -20, z: 20 }, { x: 20, z: -20 },
      { x: -35, z: 10 }, { x: 35, z: -10 },
      { x: -10, z: 35 }, { x: 10, z: -35 },
      { x: -40, z: -20 }, { x: 40, z: 20 },
      { x: -45, z: 30 }, { x: 45, z: -30 },
      { x: -30, z: 40 }, { x: 30, z: -40 },
      { x: -50, z: 0 }, { x: 50, z: 0 },
      { x: 0, z: 50 }, { x: 0, z: -50 },
      { x: -55, z: -30 }, { x: 55, z: 30 },
      { x: -20, z: -50 }, { x: 20, z: 50 },
    ],
    props: [
      { type: 'lamppost', x: 8, z: 0 }, { type: 'lamppost', x: -8, z: 0 },
      { type: 'fountain', x: 0, z: 15 },
      { type: 'lamppost', x: 15, z: 10 }, { type: 'lamppost', x: -15, z: -10 },
      { type: 'fountain', x: 20, z: -15 }, { type: 'lamppost', x: -20, z: 20 },
      { type: 'lamppost', x: 25, z: 25 }, { type: 'fountain', x: -25, z: -25 },
      { type: 'lamppost', x: 30, z: 0 }, { type: 'lamppost', x: -30, z: 0 },
      { type: 'fountain', x: 0, z: 30 }, { type: 'lamppost', x: 0, z: -30 },
      { type: 'jeepney', x: 10, z: 10 }, { type: 'jeepney', x: -10, z: -10 },
    ],
  },
};

/* ============================================================
   GAME CLASS
   ============================================================ */
class Game {
  constructor() {
    this.canvas = document.getElementById('renderCanvas');
    // Ensure canvas has explicit pixel dimensions matching the viewport
    this.resizeCanvas();
    this.engine = new Engine(this.canvas, false, { preserveDrawingBuffer: true, stencil: true, antialias: false });
    // Force a resize now that the engine is created
    this.engine.resize();
    this.scene = new Scene(this.engine);
    this.state = 'menu';
    this.time = 0;
    this.currentZone = 'manila';

    this.input = new InputManager();
    this.audio = new AudioManager();
    this.assets = {};
    this.materials = {};
    this.enemies = [];
    this.npcs = [];
    this.buildings = [];
    this.trees = [];
    this.props = [];
    this.ground = null;
    this.projectiles = [];
    this.droppedItems = [];
    this.particlePool = [];

    this.player = {
      mesh: null, visual: null, health: 100, maxHealth: 100,
      hunger: 100, thirst: 100, stamina: 100, coins: 25,
      speed: 5, facing: 1, attackTimer: 0, invTimer: 0, specialCd: 0,
      charId: 'kiko', animFrame: 0, animTimer: 0, currentAnim: 'idle',
      animPhase: 0, animBobY: 0, introTimer: 0,
    };

    this.setupScene();
    this.generateAllSprites();
    if ($B) $B.style.width = '60%';
    this.menuGui = this.createMenu();
    hideLoading();
  }

  /* ---- SCENE / CAMERA / LIGHTS ---- */
  setupScene() {
    this.engine.setHardwareScalingLevel(2);
    this.scene.clearColor = new Color4(0.05, 0.05, 0.12, 1);
    this.scene.ambientColor = new Color3(0.3, 0.3, 0.35);

    this.camera = new FollowCamera('cam', new Vector3(0, 18, -12), this.scene);
    this.camera.radius = 18;
    this.camera.heightOffset = 14;
    this.camera.rotationOffset = 0;
    this.camera.cameraAcceleration = 0.05;
    this.camera.maxCameraSpeed = 50;

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.9;
    const dir = new DirectionalLight('dir', new Vector3(-1, -2, 1), this.scene);
    dir.intensity = 0.5;

    this.scene.fogMode = Scene.FOGMODE_LINEAR;
    this.scene.fogColor = new Color3(0.08, 0.08, 0.15);
    this.scene.fogStart = 50;
    this.scene.fogEnd = 100;
  }

  /* Make sure the canvas has an actual pixel buffer that matches the viewport */
  resizeCanvas() {
    if (!this.canvas) return;
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  /* ---- SPRITE GENERATION ---- */
  generateAllSprites() {
    for (const [id, def] of Object.entries(CHARACTER_DEFS)) {
      const colors = def.palette || { skin:0xF5C9A0, hair:0x1A1A0A, shirt:0xFF0000, shirt2:0xAA0000, pants:0x1A1A1A, shoes:0x1A1A1A, accent:0xFFFFFF };
      const tex = new DynamicTexture(`tex_${id}`, { width: 32, height: 32 }, this.scene, false);
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, 32, 32);
      this.drawCharacter(ctx, 32, colors, def.hairStyle || 'short', def.isBuwaya);
      tex.update();
      tex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const mat = new StandardMaterial(`mat_${id}`, this.scene);
      mat.diffuseTexture = tex;
      mat.diffuseTexture.hasAlpha = true;
      mat.useAlphaFromDiffuseTexture = true;
      mat.backFaceCulling = false;
      mat.specularColor = Color3.Black();
      mat.emissiveColor = new Color3(0.15, 0.15, 0.15);
      this.materials[id] = mat;
      this.assets[id] = { tex, mat, frames: this.genFrames(id, def, colors) };
    }
  }

  /* Detailed 32x32 pixel art character drawing.
     Uses palette: skin, hair, shirt, shirt2, pants, shoes, accent
     Supports hairStyle: short, long, bob, none
     Supports isBuwaya for the alligator.
  */
  drawCharacter(ctx, size, c, hairStyle, isBuwaya) {
    const px = 2;
    const ox = (size - 8 * px) / 2;
    const oy = (size - 10 * px) / 2;
    const hex = (n) => '#' + (n & 0xFFFFFF).toString(16).padStart(6, '0');
    const shade = (col, factor) => {
      const r = Math.floor(((col >> 16) & 0xFF) * factor);
      const g = Math.floor(((col >> 8) & 0xFF) * factor);
      const b = Math.floor((col & 0xFF) * factor);
      return hex((r << 16) | (g << 8) | b);
    };
    const skin = hex(c.skin);
    const skinShade = shade(c.skin, 0.7);
    const hair = hex(c.hair);
    const hairShade = shade(c.hair, 0.6);
    const shirt = hex(c.shirt);
    const shirtShade = hex(c.shirt2);
    const pants = hex(c.pants);
    const shoes = hex(c.shoes);
    const accent = hex(c.accent);

    if (isBuwaya) {
      // Body (large green)
      ctx.fillStyle = hex(c.shirt);
      ctx.fillRect(ox+px, oy+px*2, px*6, px*5);
      // Head
      ctx.fillRect(ox+px*2, oy+px, px*4, px);
      ctx.fillRect(ox+px*2, oy, px*4, px);
      // Snout
      ctx.fillStyle = hex(c.shirt2);
      ctx.fillRect(ox+px*5, oy+px*2, px*2, px*2);
      // Legs
      ctx.fillStyle = hex(c.shirt);
      ctx.fillRect(ox+px, oy+px*7, px, px*2);
      ctx.fillRect(ox+px*6, oy+px*7, px, px*2);
      // Tail
      ctx.fillStyle = hex(c.shirt2);
      ctx.fillRect(ox+px*6, oy+px*3, px*2, px*2);
      ctx.fillStyle = hex(c.shirt);
      ctx.fillRect(ox+px*7, oy+px*2, px, px);
      // Eyes
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(ox+px*2, oy+px, px, px);
      ctx.fillRect(ox+px*4, oy+px, px, px);
      ctx.fillStyle = '#000';
      ctx.fillRect(ox+px*2, oy+px, 1, 1);
      ctx.fillRect(ox+px*4, oy+px, 1, 1);
      // Teeth
      ctx.fillStyle = '#FFF';
      ctx.fillRect(ox+px*6, oy+px*3, px, 1);
      // Belly shade
      ctx.fillStyle = hex(c.shirt2);
      ctx.fillRect(ox+px*2, oy+px*4, px*4, px*2);
      return;
    }

    // HAIR (back layer)
    if (hairStyle === 'long') {
      ctx.fillStyle = hair;
      ctx.fillRect(ox+px*2, oy, px*4, px*2);
      ctx.fillRect(ox+px*1, oy+px*2, px, px*4);
      ctx.fillRect(ox+px*6, oy+px*2, px, px*4);
    } else if (hairStyle === 'bob') {
      ctx.fillStyle = hair;
      ctx.fillRect(ox+px*2, oy, px*4, px*2);
      ctx.fillRect(ox+px*1, oy+px*2, px, px*3);
      ctx.fillRect(ox+px*6, oy+px*2, px, px*3);
    } else if (hairStyle === 'short') {
      ctx.fillStyle = hair;
      ctx.fillRect(ox+px*2, oy, px*4, px*2);
      ctx.fillStyle = hairShade;
      ctx.fillRect(ox+px*2, oy, px*4, 1);
    } else {
      // bald / cap
      ctx.fillStyle = hair;
      ctx.fillRect(ox+px*2, oy, px*4, px);
    }

    // FACE (skin)
    ctx.fillStyle = skin;
    ctx.fillRect(ox+px*2, oy+px, px*4, px*2);
    // Skin shading
    ctx.fillStyle = skinShade;
    ctx.fillRect(ox+px*2, oy+px*2, px*4, 1);
    ctx.fillRect(ox+px*2, oy+px*1, 1, px*2);
    ctx.fillRect(ox+px*5, oy+px*1, 1, px*2);

    // EYES
    ctx.fillStyle = '#000';
    ctx.fillRect(ox+px*2, oy+px*2, px, 1);
    ctx.fillRect(ox+px*5, oy+px*2, px, 1);

    // MOUTH
    ctx.fillStyle = '#000';
    ctx.fillRect(ox+px*3, oy+px*3, px*2, 1);

    // NECK
    ctx.fillStyle = skinShade;
    ctx.fillRect(ox+px*3, oy+px*3, px*2, 1);

    // SHIRT
    ctx.fillStyle = shirt;
    ctx.fillRect(ox+px*2, oy+px*4, px*4, px*3);
    // Shirt detail / collar
    ctx.fillStyle = shirtShade;
    ctx.fillRect(ox+px*2, oy+px*4, px*4, 1);
    ctx.fillRect(ox+px*2, oy+px*4, 1, px*3);
    ctx.fillRect(ox+px*5, oy+px*4, 1, px*3);
    // Collar V
    ctx.fillStyle = skinShade;
    ctx.fillRect(ox+px*3, oy+px*4, px*2, 1);

    // ARMS (sides of shirt)
    ctx.fillStyle = shirtShade;
    ctx.fillRect(ox+px*1, oy+px*4, px, px*2);
    ctx.fillRect(ox+px*6, oy+px*4, px, px*2);
    // Hands
    ctx.fillStyle = skin;
    ctx.fillRect(ox+px*1, oy+px*6, px, 1);
    ctx.fillRect(ox+px*6, oy+px*6, px, 1);

    // PANTS
    ctx.fillStyle = pants;
    ctx.fillRect(ox+px*2, oy+px*7, px*4, px*2);
    // Pant split
    ctx.fillStyle = shoes;
    ctx.fillRect(ox+px*3, oy+px*7, 1, px*2);
    ctx.fillRect(ox+px*4, oy+px*7, 1, px*2);
    ctx.fillStyle = pants;
    // leg bottoms
    ctx.fillRect(ox+px*2, oy+px*8, px*2, 1);
    ctx.fillRect(ox+px*4, oy+px*8, px*2, 1);

    // SHOES
    ctx.fillStyle = shoes;
    ctx.fillRect(ox+px*1, oy+px*9, px*2, px);
    ctx.fillRect(ox+px*5, oy+px*9, px*2, px);
  }

  /* Generate animation frames per character.
     Uses sub-pixel offsets to give a smooth feel even with 32x32 source.
  */
  genFrames(id, def, colors) {
    const frames = { idle: [], walk: [], attack: [] };
    const animSpec = [
      { key: 'idle',   count: 4, op: (i) => i },                          // breathing
      { key: 'walk',   count: 6, op: (i) => i },                          // step cycle
      { key: 'attack', count: 3, op: (i) => i },                          // swing
    ];
    for (const anim of animSpec) {
      for (let i = 0; i < anim.count; i++) {
        const tex = new DynamicTexture(`${id}_${anim.key}_${i}`, { width: 32, height: 32 }, this.scene, false);
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 32, 32);
        this.drawCharacter(ctx, 32, colors, def.hairStyle || 'short', def.isBuwaya);
        // Apply per-frame tweaks (sub-pixel shifts via small draws)
        if (anim.key === 'idle') {
          // breathing: small chest shift
          if (i % 2 === 0) {
            ctx.fillStyle = '#' + (def.palette?.shirt2 || 0x000000).toString(16).padStart(6, '0');
            ctx.fillRect(8, 12, 16, 1);
          }
        } else if (anim.key === 'walk') {
          // leg swing: darken one foot step
          if (i === 1 || i === 4) {
            ctx.fillStyle = '#' + (def.palette?.shoes || 0x1A1A1A).toString(16).padStart(6, '0');
            ctx.fillRect(4 + (i === 1 ? -2 : 2), 18, 4, 2);
            ctx.fillRect(12 - (i === 1 ? -2 : 2), 18, 4, 2);
          }
        } else if (anim.key === 'attack') {
          // arm extension
          if (i === 1) {
            ctx.fillStyle = '#' + (def.palette?.skin || 0xF5C9A0).toString(16).padStart(6, '0');
            ctx.fillRect(2, 14, 4, 2);
            ctx.fillRect(0, 12, 4, 4);
          }
        }
        tex.update();
        tex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
        frames[anim.key].push(tex);
      }
    }
    return frames;
  }

  /* ---- MESH / ENTITY CREATION ---- */
  createEntityMesh(charId, scale) {
    const def = CHARACTER_DEFS[charId];
    if (!def) return null;
    const w = def.w || 48, h = def.h || 64;
    const body = MeshBuilder.CreateBox(`${charId}_body`, { width: 0.6, height: 1.6, depth: 0.3 }, this.scene);
    body.isPickable = false;
    const sx = (w / 16) * (scale || 1);
    const sy = (h / 16) * (scale || 1);
    const visual = MeshBuilder.CreatePlane(`${charId}_vis`, { width: sx, height: sy }, this.scene);
    visual.billboardMode = BillboardMode.Y;
    visual.material = this.materials[charId];
    visual.parent = body;
    visual.position.y = sy * 0.5;
    return { body, visual };
  }

  /* ---- MENU / GUI ---- */
  createMenu() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('menu', true, this.scene);
    const bg = new Rectangle('menuBg');
    bg.width = '100%'; bg.height = '100%';
    bg.background = 'rgba(0,0,0,0.95)'; bg.thickness = 0;
    gui.addControl(bg);

    const title = new TextBlock('title');
    title.text = 'PINOY SURVIVAL';
    title.color = '#ffcc00'; title.fontSize = '42px';
    title.fontFamily = 'monospace'; title.height = '60px'; title.top = '-150px';
    bg.addControl(title);

    const sub = new TextBlock('sub');
    sub.text = 'Philippine Adventure';
    sub.color = '#ffffff'; sub.fontSize = '18px';
    sub.fontFamily = 'monospace'; sub.height = '30px'; sub.top = '-100px';
    bg.addControl(sub);

    const panel = new StackPanel('mp'); panel.isVertical = true;
    panel.width = '300px'; panel.height = '180px'; panel.top = '0px';
    bg.addControl(panel);

    [['Start Game', () => { this.audio.init(); this.startGame(); }],
     ['Zone Select', () => { this.audio.init(); this.showZoneSelect(gui); }]
    ].forEach(([text, fn]) => {
      const btn = new Rectangle(`btn_${text}`);
      btn.width = '250px'; btn.height = '40px'; btn.background = '#222';
      btn.cornerRadius = 6; btn.thickness = 1; btn.color = '#ffcc00';
      btn.isPointerBlocker = true;
      btn.onPointerUpObservable.add(fn);
      btn.onPointerEnterObservable.add(() => btn.background = '#333');
      btn.onPointerOutObservable.add(() => btn.background = '#222');
      panel.addControl(btn);
      const lbl = new TextBlock(); lbl.text = text;
      lbl.color = '#fff'; lbl.fontSize = '16px'; lbl.fontFamily = 'monospace';
      btn.addControl(lbl);
    });

    const ctrl = new TextBlock('ctrl');
    ctrl.text = 'WASD: Move | SHIFT: Sprint | SPACE: Attack | Q: Special | E: Interact | 1/2/3: Switch | ESC: Pause';
    ctrl.color = '#888'; ctrl.fontSize = '11px'; ctrl.fontFamily = 'monospace';
    ctrl.height = '30px'; ctrl.top = '115px'; ctrl.textWrapping = true; ctrl.width = '560px';
    bg.addControl(ctrl);

    const disc = new TextBlock('disc');
    disc.text = 'This is a fictional game. Any resemblance is used only for identification; no claims are made about real persons.';
    disc.color = '#555'; disc.fontSize = '9px'; disc.fontFamily = 'monospace';
    disc.height = '30px'; disc.top = '150px'; disc.textWrapping = true; disc.width = '560px';
    bg.addControl(disc);

    return gui;
  }

  showZoneSelect(parentGui) {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('zones', true, this.scene);
    const bg = new Rectangle('zb'); bg.width = '100%'; bg.height = '100%';
    bg.background = 'rgba(0,0,0,0.92)'; bg.thickness = 0; gui.addControl(bg);

    const t = new TextBlock(); t.text = 'SELECT ZONE';
    t.color = '#ffcc00'; t.fontSize = '28px'; t.fontFamily = 'monospace';
    t.height = '40px'; t.top = '-180px'; bg.addControl(t);

    const panel = new StackPanel('zp'); panel.isVertical = true;
    panel.width = '420px'; panel.top = '-100px'; bg.addControl(panel);

    Object.entries(ZONES).forEach(([id, z]) => {
      const unlocked = !z.locked;
      const row = new Rectangle(`zr_${id}`);
      row.width = '400px'; row.height = '55px';
      row.background = unlocked ? 'rgba(255,204,0,0.1)' : 'rgba(100,100,100,0.1)';
      row.cornerRadius = 4; row.thickness = 1;
      row.color = unlocked ? '#ffcc00' : '#444';
      row.isPointerBlocker = unlocked;
      if (unlocked) row.onPointerUpObservable.add(() => {
        this.audio.playSfx('confirm');
        this.loadZone(id);
        gui.dispose();
        parentGui.dispose();
        if (!this.hud) this.hud = this.createHud();
        this.state = 'playing';
        this.audio.playMusic(id);
      });
      panel.addControl(row);
      const n = new TextBlock(); n.text = z.name;
      n.color = unlocked ? '#fff' : '#666'; n.fontSize = '16px'; n.fontFamily = 'monospace';
      n.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; n.textLeft = '12px';
      n.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; n.textTop = '8px';
      row.addControl(n);
      const d = new TextBlock(); d.text = z.desc;
      d.color = unlocked ? '#aaa' : '#555'; d.fontSize = '10px'; d.fontFamily = 'monospace';
      d.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; d.textLeft = '12px';
      d.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; d.textTop = '30px';
      row.addControl(d);
      if (!unlocked) {
        const lk = new TextBlock(); lk.text = '[LOCKED]';
        lk.color = '#ff4444'; lk.fontSize = '10px'; lk.fontFamily = 'monospace';
        lk.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; lk.textRight = '12px';
        row.addControl(lk);
      }
    });

    const back = new Rectangle('back'); back.width = '120px'; back.height = '35px';
    back.background = '#333'; back.cornerRadius = 4; back.thickness = 1; back.color = '#888';
    back.top = '20px'; back.isPointerBlocker = true;
    back.onPointerUpObservable.add(() => gui.dispose());
    panel.addControl(back);
    const bl = new TextBlock(); bl.text = 'Back';
    bl.color = '#fff'; bl.fontSize = '14px'; bl.fontFamily = 'monospace';
    back.addControl(bl);
  }

  /* ---- WORLD LOADING ---- */
  loadZone(zoneId) {
    const z = ZONES[zoneId];
    if (!z || z.locked) return;
    this.currentZone = zoneId;
    this.clearWorld();

    // Update fog for zone
    this.scene.fogColor = new Color3(((z.fogColor || 0x14142a) >> 16 & 0xFF) / 255, ((z.fogColor || 0x14142a) >> 8 & 0xFF) / 255, ((z.fogColor || 0x14142a) & 0xFF) / 255);
    this.scene.ambientColor = new Color3(((z.ambientTint || 0xFFFFFF) >> 16 & 0xFF) / 255 * 0.3, ((z.ambientTint || 0xFFFFFF) >> 8 & 0xFF) / 255 * 0.3, ((z.ambientTint || 0xFFFFFF) & 0xFF) / 255 * 0.3);

    // Zone-specific ground tint
    if (zoneId === 'visayas') {
      this.scene.ambientColor = new Color3(0.25, 0.35, 0.25);
    } else if (zoneId === 'mindanao') {
      this.scene.ambientColor = new Color3(0.3, 0.35, 0.25);
    }

    // GROUND
    this.ground = MeshBuilder.CreateGround('ground', { width: z.w, height: z.h, subdivisions: 1 }, this.scene);
    const gmat = new StandardMaterial('gmat', this.scene);
    gmat.specularColor = Color3.Black();
    const ghex = '#' + z.ground.toString(16).padStart(6, '0');
    const dtex = new DynamicTexture('gtex', { width: 64, height: 64 }, this.scene, false);
    const ctx = dtex.getContext();
    ctx.fillStyle = ghex;
    ctx.fillRect(0, 0, 64, 64);
    // noise dots
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.10})`;
      ctx.fillRect(Math.floor(Math.random()*64), Math.floor(Math.random()*64), 1, 1);
    }
    for (let i = 0; i < 100; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
      ctx.fillRect(Math.floor(Math.random()*64), Math.floor(Math.random()*64), 1, 1);
    }
    // road tiles (cross pattern)
    ctx.fillStyle = `rgba(80,80,80,0.6)`;
    ctx.fillRect(0, 30, 64, 4);
    ctx.fillRect(30, 0, 4, 64);
    dtex.update();
    dtex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
    gmat.diffuseTexture = dtex;
    gmat.diffuseTexture.uScale = 10;
    gmat.diffuseTexture.vScale = 10;
    this.ground.material = gmat;

    // BUILDINGS
    (z.buildings || []).forEach(b => {
      const bw = Math.round(b.w), bh = Math.round(b.h), bd = Math.round(b.d);
      const box = MeshBuilder.CreateBox('bld', { width: bw, height: bh, depth: bd }, this.scene);
      box.position = new Vector3(b.x, bh/2, b.z);
      const tw = Math.max(32, Math.round(bw * 8));
      const th = Math.max(32, Math.round(bh * 8));
      const btex = new DynamicTexture('btex', { width: tw, height: th }, this.scene, false);
      const bx = btex.getContext();
      const bhex = '#' + b.c.toString(16).padStart(6, '0');
      bx.fillStyle = bhex;
      bx.fillRect(0, 0, tw, th);
      // Brick pattern
      for (let y = 0; y < th; y += 6) {
        bx.fillStyle = 'rgba(0,0,0,0.15)';
        bx.fillRect(0, y, tw, 1);
      }
      // Windows
      const winSize = 4;
      const gap = Math.max(8, Math.round(tw / Math.max(3, Math.floor(bw / 1.5))));
      for (let wy = Math.round(th * 0.15); wy < th - 6; wy += gap) {
        for (let wx = Math.round(tw * 0.1); wx < tw - 4; wx += gap) {
          bx.fillStyle = '#1a1a2e';
          bx.fillRect(wx, wy, winSize, winSize);
          if (Math.random() > 0.3) {
            bx.fillStyle = '#ffdd44';
            bx.fillRect(wx + 1, wy + 1, 2, 2);
          } else {
            bx.fillStyle = '#666';
            bx.fillRect(wx + 1, wy + 1, 2, 2);
          }
          // window frame
          bx.fillStyle = '#000';
          bx.fillRect(wx - 1, wy, 1, winSize);
          bx.fillRect(wx + winSize, wy, 1, winSize);
        }
      }
      // Door
      bx.fillStyle = '#111';
      bx.fillRect(Math.round(tw*0.4), th - Math.round(bh*1.5), Math.round(tw*0.2), Math.round(bh*1.5));
      bx.fillStyle = '#3a2a1a';
      bx.fillRect(Math.round(tw*0.4) + 1, th - Math.round(bh*1.5) + 1, Math.round(tw*0.2) - 2, Math.round(bh*1.5) - 2);
      bx.fillStyle = '#DAA520';
      bx.fillRect(Math.round(tw*0.4) + Math.round(tw*0.1) - 1, th - Math.round(bh*0.5), 1, 1);
      // Roof line
      bx.fillStyle = 'rgba(0,0,0,0.3)';
      bx.fillRect(0, 0, tw, 2);
      bx.fillRect(0, th - 2, tw, 2);
      btex.update();
      btex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const m = new StandardMaterial('bm', this.scene);
      m.diffuseTexture = btex;
      m.specularColor = Color3.Black();
      m.emissiveColor = new Color3(0.08, 0.08, 0.08);
      box.material = m;
      this.buildings.push(box);

      // Add a roof for certain types
      if (b.type === 'house' || b.type === 'church') {
        const roof = MeshBuilder.CreateCylinder('roof', { diameterTop: 0.1, diameterBottom: Math.max(bw, bd) * 1.1, height: 1.5, tessellation: 4 }, this.scene);
        roof.position = new Vector3(b.x, bh + 0.75, b.z);
        roof.rotation.y = Math.PI / 4;
        const rmat = new StandardMaterial('rm', this.scene);
        rmat.diffuseColor = new Color3(0.4, 0.2, 0.1);
        rmat.specularColor = Color3.Black();
        roof.material = rmat;
        this.buildings.push(roof);
      }
    });

    // TREES
    (z.trees || []).forEach((t, i) => {
      const ttex = new DynamicTexture(`tree_${i}`, { width: 16, height: 24 }, this.scene, false);
      const tc = ttex.getContext();
      tc.clearRect(0, 0, 16, 24);
      tc.fillStyle = '#5c3a1e';
      tc.fillRect(7, 14, 2, 8);
      tc.fillRect(6, 20, 4, 2);
      const greens = ['#2d7a2d','#3a8c3a','#1f6b1f','#4a9a4a'];
      tc.fillStyle = greens[Math.floor(Math.random()*greens.length)];
      tc.fillRect(3, 2, 10, 8);
      tc.fillRect(2, 4, 12, 4);
      tc.fillRect(4, 1, 8, 2);
      tc.fillRect(5, 10, 6, 3);
      tc.fillStyle = greens[Math.floor(Math.random()*greens.length)];
      tc.fillRect(5, 3, 2, 2);
      tc.fillRect(9, 5, 2, 2);
      tc.fillRect(4, 8, 3, 2);
      ttex.update();
      ttex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const plane = MeshBuilder.CreatePlane('tree', { width: 1.5, height: 2.2 }, this.scene);
      plane.position = new Vector3(t.x, 1.1, t.z);
      plane.billboardMode = BillboardMode.Y;
      const tm = new StandardMaterial('tm', this.scene);
      tm.diffuseTexture = ttex;
      tm.diffuseTexture.hasAlpha = true;
      tm.useAlphaFromDiffuseTexture = true;
      tm.backFaceCulling = false;
      tm.specularColor = Color3.Black();
      tm.emissiveColor = new Color3(0.1, 0.15, 0.1);
      plane.material = tm;
      this.trees.push(plane);
    });

    // PROPS (jeepney, lamppost, etc.)
    (z.props || []).forEach(p => this.spawnProp(p));

    this.spawnEnemies(z.enemies || []);
    this.spawnNpcs(z.npcs || []);
    this.spawnDenseCrowd(z);
    this.spawnPlayer();
  }

  /* Spawn generic props (jeepney, lamppost, fountain, etc.) */
  spawnProp(p) {
    if (p.type === 'jeepney') {
      const jeep = MeshBuilder.CreateBox('jeepney', { width: 2.5, height: 1.6, depth: 1.4 }, this.scene);
      jeep.position = new Vector3(p.x, 0.8, p.z);
      const jtex = new DynamicTexture('jtex', { width: 64, height: 32 }, this.scene, false);
      const jx = jtex.getContext();
      // base color (vivid)
      jx.fillStyle = '#FFEB3B';
      jx.fillRect(0, 0, 64, 32);
      jx.fillStyle = '#FF5722';
      jx.fillRect(0, 24, 64, 8);
      jx.fillStyle = '#2196F3';
      jx.fillRect(0, 0, 64, 6);
      jx.fillStyle = '#1A1A1A';
      jx.fillRect(8, 8, 12, 8);   // front window
      jx.fillRect(24, 8, 16, 8);  // side window
      jx.fillRect(44, 8, 12, 8);  // back window
      jx.fillStyle = '#FFF';
      jx.fillRect(0, 18, 64, 1);
      jx.fillStyle = '#000';
      jx.fillRect(0, 19, 64, 1);
      // wheels
      jx.fillStyle = '#000';
      jx.fillRect(8, 26, 4, 4);
      jx.fillRect(52, 26, 4, 4);
      jtex.update();
      jtex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const jm = new StandardMaterial('jm', this.scene);
      jm.diffuseTexture = jtex;
      jm.specularColor = Color3.Black();
      jeep.material = jm;
      this.props.push(jeep);

      // roof rack
      const roof = MeshBuilder.CreateBox('jeep_roof', { width: 2.5, height: 0.05, depth: 1.4 }, this.scene);
      roof.position = new Vector3(p.x, 1.65, p.z);
      const rm = new StandardMaterial('jrm', this.scene);
      rm.diffuseColor = new Color3(0.3, 0.2, 0.1);
      rm.specularColor = Color3.Black();
      roof.material = rm;
      this.props.push(roof);
    } else if (p.type === 'lamppost') {
      const pole = MeshBuilder.CreateBox('lamp_pole', { width: 0.15, height: 3.5, depth: 0.15 }, this.scene);
      pole.position = new Vector3(p.x, 1.75, p.z);
      const pm = new StandardMaterial('pm', this.scene);
      pm.diffuseColor = new Color3(0.2, 0.2, 0.2);
      pm.specularColor = Color3.Black();
      pole.material = pm;
      this.props.push(pole);

      const head = MeshBuilder.CreateBox('lamp_head', { width: 0.5, height: 0.3, depth: 0.5 }, this.scene);
      head.position = new Vector3(p.x, 3.4, p.z);
      const hm = new StandardMaterial('hm', this.scene);
      hm.diffuseColor = new Color3(1, 0.9, 0.5);
      hm.emissiveColor = new Color3(1, 0.9, 0.5);
      hm.specularColor = Color3.Black();
      head.material = hm;
      this.props.push(head);

      const bulb = MeshBuilder.CreateSphere('lamp_bulb', { diameter: 0.4, segments: 6 }, this.scene);
      bulb.position = new Vector3(p.x, 3.2, p.z);
      const bm = new StandardMaterial('bm', this.scene);
      bm.diffuseColor = new Color3(1, 0.95, 0.6);
      bm.emissiveColor = new Color3(1, 0.95, 0.6);
      bm.specularColor = Color3.Black();
      bulb.material = bm;
      this.props.push(bulb);
    } else if (p.type === 'fountain') {
      const base = MeshBuilder.CreateCylinder('fountain_base', { diameter: 3, height: 0.5, tessellation: 12 }, this.scene);
      base.position = new Vector3(p.x, 0.25, p.z);
      const fbm = new StandardMaterial('fbm', this.scene);
      fbm.diffuseColor = new Color3(0.6, 0.6, 0.6);
      fbm.specularColor = Color3.Black();
      base.material = fbm;
      this.props.push(base);

      const water = MeshBuilder.CreateDisc('fountain_water', { radius: 1.3, tessellation: 16 }, this.scene);
      water.position = new Vector3(p.x, 0.5, p.z);
      water.rotation.x = Math.PI / 2;
      const wm = new StandardMaterial('wm', this.scene);
      wm.diffuseColor = new Color3(0.3, 0.6, 0.9);
      wm.emissiveColor = new Color3(0.2, 0.5, 0.8);
      wm.specularColor = Color3.Black();
      water.material = wm;
      this.props.push(water);

      const pillar = MeshBuilder.CreateCylinder('fountain_pillar', { diameter: 0.4, height: 1.5, tessellation: 8 }, this.scene);
      pillar.position = new Vector3(p.x, 1.25, p.z);
      const pim = new StandardMaterial('pim', this.scene);
      pim.diffuseColor = new Color3(0.5, 0.5, 0.5);
      pim.specularColor = Color3.Black();
      pillar.material = pim;
      this.props.push(pillar);
    } else if (p.type === 'lrt') {
      // LRT elevated rail
      const rail = MeshBuilder.CreateBox('lrt_rail', { width: 0.3, height: 4, depth: 30 }, this.scene);
      rail.position = new Vector3(p.x, 2, p.z);
      const rm = new StandardMaterial('lrt_rm', this.scene);
      rm.diffuseColor = new Color3(0.4, 0.4, 0.5);
      rm.specularColor = Color3.Black();
      rail.material = rm;
      this.props.push(rail);
      // supports
      for (let s = -12; s <= 12; s += 6) {
        const support = MeshBuilder.CreateBox('lrt_support', { width: 0.3, height: 2, depth: 0.3 }, this.scene);
        support.position = new Vector3(p.x, 1, p.z + s);
        support.material = rm;
        this.props.push(support);
      }
    } else if (p.type === 'cross') {
      // Quiapo church cross
      const vbar = MeshBuilder.CreateBox('cross_v', { width: 0.4, height: 4, depth: 0.4 }, this.scene);
      vbar.position = new Vector3(p.x, 2, p.z);
      const cvm = new StandardMaterial('cvm', this.scene);
      cvm.diffuseColor = new Color3(0.7, 0.6, 0.2);
      cvm.emissiveColor = new Color3(0.3, 0.25, 0.1);
      vbar.material = cvm;
      this.props.push(vbar);
      const hbar = MeshBuilder.CreateBox('cross_h', { width: 1.5, height: 0.4, depth: 0.4 }, this.scene);
      hbar.position = new Vector3(p.x, 3, p.z);
      hbar.material = cvm;
      this.props.push(hbar);
    }
  }

  /* Spawn a dense crowd of civilians (40-60 per zone) */
  spawnDenseCrowd(z) {
    const civilianIds = ['civilian_m', 'civilian_f', 'civ_m_b', 'civ_m_c', 'civ_m_d', 'civ_f_b', 'civ_f_c', 'civ_f_d', 'kids', 'kid_b', 'kid_c'];
    const half = z.w / 2 - 3;
    const targetCount = 90;
    let attempts = 0;
    let added = 0;
    while (added < targetCount && attempts < 500) {
      attempts++;
      const id = civilianIds[Math.floor(Math.random() * civilianIds.length)];
      const def = CHARACTER_DEFS[id];
      if (!def) continue;
      const x = (Math.random() - 0.5) * (z.w - 6);
      const zPos = (Math.random() - 0.5) * (z.h - 6);
      // Don't spawn too close to enemies
      let tooClose = false;
      for (const e of this.enemies) {
        if (Math.abs(e.mesh.position.x - x) < 3 && Math.abs(e.mesh.position.z - zPos) < 3) { tooClose = true; break; }
      }
      if (tooClose) continue;
      // Don't spawn inside a building
      let insideBuilding = false;
      for (const b of (z.buildings || [])) {
        if (Math.abs(b.x - x) < b.w / 2 + 0.5 && Math.abs(b.z - zPos) < b.d / 2 + 0.5) { insideBuilding = true; break; }
      }
      if (insideBuilding) continue;

      const ent = this.createEntityMesh(id, 0.7);
      ent.body.position = new Vector3(x, 0.9, zPos);
      this.npcs.push({
        mesh: ent.body, visual: ent.visual, id, dialogue: NPC_DIALOGUES[id] || [],
        isCrowd: true, wanderTarget: null, wanderTimer: Math.random() * 5,
        isKid: id.startsWith('kid'),
      });
      added++;
    }
  }

  /* ---- PLAYER / ENEMIES / NPCS ---- */
  spawnPlayer() {
    if (this.player.mesh) this.player.mesh.dispose();
    const { body, visual } = this.createEntityMesh(this.player.charId, 1);
    this.player.mesh = body;
    this.player.visual = visual;
    body.position = new Vector3(0, 1, 0);
    this.camera.lockedTarget = body;
    this.player.health = this.player.maxHealth;
    this.player.hunger = 100;
    this.player.thirst = 100;
    this.player.stamina = 100;
  }

  spawnEnemies(list) {
    this.enemies.forEach(e => e.mesh.dispose());
    this.enemies = [];
    list.forEach(s => {
      const def = CHARACTER_DEFS[s.id];
      if (!def) return;
      const ent = this.createEntityMesh(s.id, 1);
      ent.body.position = new Vector3(s.x, 1, s.z);

      // HP bar (red plane above head)
      const hpBar = MeshBuilder.CreatePlane('hp', { width: 1.2, height: 0.08 }, this.scene);
      hpBar.parent = ent.body; hpBar.position.y = 1.6;
      const hpMat = new StandardMaterial('hpm', this.scene);
      hpMat.diffuseColor = new Color3(1, 0.2, 0.2);
      hpMat.emissiveColor = new Color3(1, 0.2, 0.2);
      hpMat.specularColor = Color3.Black();
      hpBar.material = hpMat;

      // HP bar background (dark)
      const hpBg = MeshBuilder.CreatePlane('hpbg', { width: 1.2, height: 0.08 }, this.scene);
      hpBg.parent = ent.body; hpBg.position.y = 1.6;
      hpBg.position.z = 0.01;
      const hpBgMat = new StandardMaterial('hpbm', this.scene);
      hpBgMat.diffuseColor = new Color3(0.2, 0, 0);
      hpBgMat.emissiveColor = new Color3(0.2, 0, 0);
      hpBgMat.specularColor = Color3.Black();
      hpBg.material = hpBgMat;

      this.enemies.push({
        mesh: ent.body, visual: ent.visual, id: s.id, hp: def.hp, maxHp: def.hp,
        speed: def.speed, dmg: def.dmg, aggro: def.aggro,
        atkRange: def.atkRange, coins: def.coins,
        ranged: !!def.ranged, aquatic: !!def.aquatic,
        state: 'idle', stateTimer: 0, atkCd: 0, spawnPos: ent.body.position.clone(),
        taunt: def.taunt, tauntTimer: 5 + Math.random() * 5,
        hpBar, hpBg, animFrame: 0, animTimer: 0, animState: 'idle',
      });
    });
  }

  spawnNpcs(list) {
    // Note: crowd already prepended; this spawns the named NPCs (vendors, rally)
    list.forEach(s => {
      const def = CHARACTER_DEFS[s.id];
      if (!def) return;
      const ent = this.createEntityMesh(s.id, 1);
      ent.body.position = new Vector3(s.x, 1, s.z);

      // Name label
      const lbl = new DynamicTexture(`nl_${s.id}_${s.x}_${s.z}`, { width: 256, height: 24 }, this.scene, false);
      const lctx = lbl.getContext();
      lctx.clearRect(0, 0, 256, 24);
      lctx.fillStyle = 'rgba(0,0,0,0.6)';
      lctx.fillRect(0, 0, 256, 24);
      lctx.fillStyle = '#fff';
      lctx.font = 'bold 14px monospace';
      lctx.textAlign = 'center';
      lctx.fillText(def.name, 128, 17);
      lbl.update();
      lbl.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const lblMesh = MeshBuilder.CreatePlane('nlm', { width: 2.0, height: 0.22 }, this.scene);
      lblMesh.parent = ent.body; lblMesh.position.y = 1.9;
      const lm = new StandardMaterial('nlm', this.scene);
      lm.diffuseTexture = lbl; lm.diffuseTexture.hasAlpha = true;
      lm.useAlphaFromDiffuseTexture = true; lm.backFaceCulling = false;
      lm.specularColor = Color3.Black();
      lm.emissiveColor = new Color3(0.6, 0.6, 0.6);
      lblMesh.material = lm;

      this.npcs.push({
        mesh: ent.body, visual: ent.visual, id: s.id, dialogue: NPC_DIALOGUES[s.id] || [],
        isCrowd: false, name: def.name, label: lblMesh, animFrame: 0, animTimer: 0, animState: 'idle',
      });
    });
  }

  clearWorld() {
    [this.ground, ...this.buildings, ...this.trees, ...this.props,
     ...this.enemies.map(e => e.mesh), ...this.enemies.flatMap(e => [e.hpBar, e.hpBg].filter(Boolean)),
     ...this.npcs.map(n => n.mesh), ...this.npcs.map(n => n.label).filter(Boolean),
     ...this.projectiles.map(p => p.mesh), ...this.droppedItems.map(d => d.mesh)
    ].forEach(m => { if (m) m.dispose(); });
    this.buildings = []; this.trees = []; this.props = [];
    this.enemies = []; this.npcs = []; this.projectiles = []; this.droppedItems = [];
  }

  /* ---- GAME START / HUD ---- */
  startGame() {
    this.state = 'playing';
    this.menuGui.dispose();
    this.loadZone('manila');
    this.hud = this.createHud();
    this.audio.playMusic('manila');
  }

  createHud() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('hud', true, this.scene);
    const top = new Rectangle('top');
    top.width = '100%'; top.height = '60px';
    top.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    top.background = 'rgba(0,0,0,0.65)'; top.thickness = 0;
    gui.addControl(top);

    const left = new StackPanel('lp'); left.isVertical = true;
    left.width = '260px'; left.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    left.paddingLeft = '10px'; top.addControl(left);

    const bars = {};
    [['HP', '#ff4444', '#440000'], ['Food', '#ff8800', '#442200'],
     ['Water', '#4488ff', '#002244'], ['Stamina', '#44ff44', '#004400']
    ].forEach(([lbl, fc, bc]) => {
      const row = new StackPanel(); row.isVertical = false;
      row.height = '13px'; row.width = '230px'; left.addControl(row);
      const l = new TextBlock(); l.text = lbl; l.color = '#fff';
      l.fontSize = '10px'; l.width = '50px'; l.fontFamily = 'monospace'; row.addControl(l);
      const bg = new Rectangle(); bg.width = '150px'; bg.height = '11px';
      bg.background = bc; bg.cornerRadius = 3; bg.thickness = 0; row.addControl(bg);
      const fill = new Rectangle(); fill.width = '100%'; fill.height = '100%';
      fill.background = fc; fill.cornerRadius = 3; fill.thickness = 0;
      fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; bg.addControl(fill);
      const val = new TextBlock(); val.text = '100'; val.color = '#fff';
      val.fontSize = '9px'; val.width = '30px'; val.fontFamily = 'monospace'; row.addControl(val);
      bars[lbl] = { fill, val };
    });

    const right = new StackPanel('rp'); right.isVertical = true;
    right.width = '180px'; right.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    right.paddingRight = '10px'; top.addControl(right);

    const coinT = new TextBlock(); coinT.text = '₱ 0';
    coinT.color = '#ffcc00'; coinT.fontSize = '18px'; coinT.height = '22px';
    coinT.fontFamily = 'monospace'; right.addControl(coinT);

    const zoneT = new TextBlock(); zoneT.text = 'Manila';
    zoneT.color = '#fff'; zoneT.fontSize = '13px'; zoneT.height = '18px';
    zoneT.fontFamily = 'monospace'; right.addControl(zoneT);

    const charT = new TextBlock(); charT.text = '[1]Kiko [2]Risa [3]Leni';
    charT.color = '#aaa'; charT.fontSize = '11px'; charT.height = '16px';
    charT.fontFamily = 'monospace'; right.addControl(charT);

    // Bottom-center intro prompt
    const introPanel = new Rectangle('introP');
    introPanel.width = '500px'; introPanel.height = '50px';
    introPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    introPanel.background = 'rgba(0,0,0,0.7)';
    introPanel.cornerRadius = 8; introPanel.thickness = 1; introPanel.color = '#ffcc00';
    introPanel.isVisible = false;
    gui.addControl(introPanel);
    const introT = new TextBlock('introT');
    introT.text = ''; introT.color = '#ffcc00'; introT.fontSize = '14px';
    introT.fontFamily = 'monospace';
    introPanel.addControl(introT);

    return { gui, bars, coinT, zoneT, charT, introPanel, introT };
  }

  showIntro(charId) {
    if (!this.hud) return;
    const def = CHARACTER_DEFS[charId];
    if (!def || !def.intro) return;
    this.hud.introT.text = `${def.name}: "${def.intro}"`;
    this.hud.introPanel.isVisible = true;
    this.player.introTimer = 2.5;
  }

  updateHud() {
    if (!this.hud) return;
    const p = this.player;
    const setBar = (name, cur, max) => {
      const b = this.hud.bars[name];
      if (!b) return;
      b.fill.width = `${Math.max(0, Math.min(100, (cur/max)*100))}%`;
      b.val.text = Math.round(cur).toString();
    };
    setBar('HP', p.health, p.maxHealth);
    setBar('Food', p.hunger, 100);
    setBar('Water', p.thirst, 100);
    setBar('Stamina', p.stamina, 100);
    this.hud.coinT.text = `₱ ${p.coins}`;
    this.hud.zoneT.text = ZONES[this.currentZone]?.name || this.currentZone;

    // intro timer
    if (p.introTimer > 0) {
      p.introTimer -= this.engine.getDeltaTime() / 1000;
      if (p.introTimer <= 0 && this.hud.introPanel) {
        this.hud.introPanel.isVisible = false;
      }
    }
  }

  /* ---- MAIN UPDATE LOOP ---- */
  update() {
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.05);
    this.input.update();

    if (this.state === 'menu') {
      if (this.input.justPressed('Enter') || this.input.justPressed('Space')) {
        this.audio.init();
        this.startGame();
      }
      this.scene.render();
      return;
    }

    if (this.state !== 'playing') { this.scene.render(); return; }

    this.time += dt;
    const p = this.player;

    if (this.input.slot1) this.switchChar('kiko');
    if (this.input.slot2) this.switchChar('risa');
    if (this.input.slot3) this.switchChar('leni');

    const mx = this.input.moveX;
    const mz = this.input.moveZ;
    const moving = mx !== 0 || mz !== 0;
    const spd = (this.input.sprint && p.stamina > 0 && moving) ? p.speed * 1.6 : p.speed;
    if (this.input.sprint && moving) p.stamina = Math.max(0, p.stamina - 25 * dt);
    else p.stamina = Math.min(100, p.stamina + 15 * dt);

    if (p.mesh) {
      p.mesh.position.x += mx * spd * dt;
      p.mesh.position.z += mz * spd * dt;
      const halfZone = (ZONES[this.currentZone]?.w || 80) / 2 - 2;
      p.mesh.position.x = Math.max(-halfZone, Math.min(halfZone, p.mesh.position.x));
      p.mesh.position.z = Math.max(-halfZone, Math.min(halfZone, p.mesh.position.z));
      if (mx !== 0) { p.facing = mx > 0 ? 1 : -1; if (p.visual) p.visual.scaling.x = p.facing; }
    }

    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.invTimer = Math.max(0, p.invTimer - dt);
    p.specialCd = Math.max(0, p.specialCd - dt);

    // Smooth sub-pixel animation
    p.animPhase += dt * 6;
    p.animBobY = Math.sin(p.animPhase) * 0.04;
    if (p.visual) p.visual.position.y = (p.visual.parent?.scaling.y || 1) * 1.1 + p.animBobY;

    p.animTimer += dt;
    if (p.animTimer > 0.12) {
      p.animTimer = 0;
      const animType = p.attackTimer > 0 ? 'attack' : moving ? 'walk' : 'idle';
      const frames = this.assets[p.charId]?.frames[animType] || [];
      if (frames.length) {
        p.animFrame = (p.animFrame + 1) % frames.length;
        if (p.visual) p.visual.material.diffuseTexture = frames[p.animFrame];
      }
    }

    if (this.input.attack && p.attackTimer <= 0) {
      p.attackTimer = 0.3;
      this.doMeleeAttack();
    }

    if (this.input.special && p.specialCd <= 0) {
      p.specialCd = 3;
      this.useSpecial();
    }

    if (this.input.interact) this.doInteract();

    this.updateEnemies(dt);
    this.updateNpcs(dt);
    p.hunger = Math.max(0, p.hunger - 0.3 * dt);
    p.thirst = Math.max(0, p.thirst - 0.4 * dt);
    if (p.hunger <= 0 || p.thirst <= 0) p.health = Math.max(0, p.health - 3 * dt);

    this.updateProjectiles(dt);
    this.updateDroppedItems(dt);
    this.updateHud();

    if (p.health <= 0) {
      this.state = 'ended';
      this.showGameOver();
    }

    this.scene.render();
  }

  /* ---- CHARACTER SWITCH (with intro) ---- */
  switchChar(id) {
    if (id === this.player.charId) return;
    const pos = this.player.mesh?.position.clone() || new Vector3(0, 1, 0);
    const hp = this.player.health;
    const maxHp = this.player.maxHealth;
    const hunger = this.player.hunger;
    const thirst = this.player.thirst;
    const stamina = this.player.stamina;
    const coins = this.player.coins;

    if (this.player.mesh) this.player.mesh.dispose();
    this.player.charId = id;
    this.player.speed = CHARACTER_DEFS[id].speed || 5;
    this.player.maxHealth = CHARACTER_DEFS[id].hp || 100;
    this.player.health = Math.min(hp, this.player.maxHealth);
    const { body, visual } = this.createEntityMesh(id, 1);
    this.player.mesh = body;
    this.player.visual = visual;
    body.position = pos;
    this.player.hunger = hunger;
    this.player.thirst = thirst;
    this.player.stamina = stamina;
    this.player.coins = coins;
    this.camera.lockedTarget = body;
    this.audio.playSfx('perk');
    this.showIntro(id);
  }

  /* ---- COMBAT ---- */
  doMeleeAttack() {
    if (!this.player.mesh) return;
    const pos = this.player.mesh.position;
    const f = this.player.facing;
    const range = 2.4;
    const hitPos = pos.add(new Vector3(f * 1.1, 0.8, 0));

    // Slash visual
    const slash = MeshBuilder.CreateDisc('slash', { radius: 0.6, tessellation: 8 }, this.scene);
    slash.position = hitPos.clone();
    slash.billboardMode = 7;
    const sm = new StandardMaterial('sm', this.scene);
    sm.diffuseColor = new Color3(1, 1, 0.8);
    sm.emissiveColor = new Color3(1, 0.9, 0.5);
    sm.specularColor = Color3.Black();
    sm.alpha = 0.8; sm.backFaceCulling = false;
    slash.material = sm;
    let slashLife = 0;
    const slashInterval = setInterval(() => {
      slashLife += 0.05;
      slash.scaling.x = 1 + slashLife * 2;
      slash.scaling.y = 1 + slashLife * 2;
      sm.alpha = Math.max(0, 0.8 - slashLife * 1.5);
      if (slashLife > 0.3) { clearInterval(slashInterval); slash.dispose(); sm.dispose(); }
    }, 50);

    const dmg = 10 + Math.floor(Math.random() * 6);
    this.enemies.forEach(e => {
      if (e.hp <= 0) return;
      if (Vector3.Distance(hitPos, e.mesh.position) < range) {
        e.hp -= dmg;
        this.audio.playSfx('enemy_hit');
        e.mesh.getChildMeshes().forEach(m => {
          if (m.material) m.material.emissiveColor = new Color3(1, 0.3, 0.3);
        });
        setTimeout(() => {
          e.mesh?.getChildMeshes().forEach(m => {
            if (m.material) m.material.emissiveColor = new Color3(0.15, 0.15, 0.15);
          });
        }, 150);
        if (e.hpBar) e.hpBar.scaling.x = Math.max(0.01, e.hp / e.maxHp);
        // Show taunt on first hit
        if (e.taunt && !e.taunted) {
          e.taunted = true;
          this.showDialogue(e.id, e.taunt);
        }
        if (e.hp <= 0) {
          this.player.coins += e.coins;
          this.audio.playSfx('coin');
          this.spawnDroppedItem(e.mesh.position.clone(), e.id);
          setTimeout(() => {
            e.mesh?.dispose();
            e.hpBar?.dispose(); e.hpBg?.dispose();
          }, 300);
        }
      }
    });
  }

  /* ---- SPECIAL ABILITIES ---- */
  useSpecial() {
    if (!this.player.mesh) return;
    const def = CHARACTER_DEFS[this.player.charId];
    if (!def || !def.specialType) return;
    const pos = this.player.mesh.position;

    this.audio.playSfx('perk');
    this.showIntro(this.player.charId);

    if (def.specialType === 'aoe') {
      // Kiko: Senate Speech - AoE damage + stun
      const aoeRange = 8;
      const aoeDmg = 25;
      this.enemies.forEach(e => {
        if (e.hp <= 0) return;
        if (Vector3.Distance(pos, e.mesh.position) < aoeRange) {
          e.hp -= aoeDmg;
          e.state = 'idle';
          e.stateTimer = 0;
          e.taunted = false;
          if (e.hpBar) e.hpBar.scaling.x = Math.max(0.01, e.hp / e.maxHp);
          if (e.hp <= 0) {
            this.player.coins += e.coins;
            this.spawnDroppedItem(e.mesh.position.clone(), e.id);
            setTimeout(() => { e.mesh?.dispose(); e.hpBar?.dispose(); e.hpBg?.dispose(); }, 300);
          }
        }
      });
      // Visual: expanding ring
      const ring = MeshBuilder.CreateTorus('aoe_ring', { diameter: 2, thickness: 0.2, tessellation: 16 }, this.scene);
      ring.position = pos.clone(); ring.position.y = 0.5;
      const rm = new StandardMaterial('rm', this.scene);
      rm.diffuseColor = new Color3(1, 0.9, 0.3);
      rm.emissiveColor = new Color3(1, 0.8, 0.2);
      rm.specularColor = Color3.Black();
      rm.alpha = 0.7; rm.backFaceCulling = false;
      ring.material = rm;
      let ringLife = 0;
      const ringInt = setInterval(() => {
        ringLife += 0.05;
        ring.scaling.x = 1 + ringLife * 4;
        ring.scaling.z = 1 + ringLife * 4;
        rm.alpha = Math.max(0, 0.7 - ringLife * 1.5);
        if (ringLife > 0.5) { clearInterval(ringInt); ring.dispose(); rm.dispose(); }
      }, 50);
    } else if (def.specialType === 'ranged') {
      // Risa: Committee Hearing - long-range projectile
      const dir = this.player.facing > 0 ? new Vector3(1, 0, 0) : new Vector3(-1, 0, 0);
      this.spawnProjectile(pos.clone().add(dir.scale(1)), dir.scale(12), 30, 'player_special');
    } else if (def.specialType === 'heal') {
      // Leni: Community Service - heal self + nearby NPCs
      const healRange = 6;
      const healAmt = 30;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmt);
      this.npcs.forEach(n => {
        if (Vector3.Distance(pos, n.mesh.position) < healRange) {
          // NPCs don't have HP but we can show a heal effect
        }
      });
      // Visual: green burst
      const burst = MeshBuilder.CreateSphere('heal_burst', { diameter: 1.5, segments: 8 }, this.scene);
      burst.position = pos.clone(); burst.position.y = 1;
      const bm = new StandardMaterial('bm', this.scene);
      bm.diffuseColor = new Color3(0.3, 1, 0.3);
      bm.emissiveColor = new Color3(0.2, 0.8, 0.2);
      bm.specularColor = Color3.Black();
      bm.alpha = 0.6; bm.backFaceCulling = false;
      burst.material = bm;
      let burstLife = 0;
      const burstInt = setInterval(() => {
        burstLife += 0.05;
        burst.scaling.x = 1 + burstLife * 3;
        burst.scaling.y = 1 + burstLife * 3;
        burst.scaling.z = 1 + burstLife * 3;
        bm.alpha = Math.max(0, 0.6 - burstLife * 1.2);
        if (burstLife > 0.4) { clearInterval(burstInt); burst.dispose(); bm.dispose(); }
      }, 50);
    }
  }

  spawnDroppedItem(pos, enemyId) {
    const dropKeys = Object.keys(DROP_ITEMS);
    const key = dropKeys[Math.floor(Math.random() * dropKeys.length)];
    const drop = DROP_ITEMS[key];
    if (!drop) return;

    // Create a small plane with the item label
    const tex = new DynamicTexture(`drop_${key}_${this.time}`, { width: 64, height: 32 }, this.scene, false);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 64, 32);
    ctx.fillStyle = 'rgba(255, 200, 50, 0.9)';
    ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(drop.name, 32, 13);
    ctx.font = '7px monospace';
    ctx.fillText(`+${drop.coins} coins`, 32, 25);
    tex.update();
    tex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);

    const mesh = MeshBuilder.CreatePlane('drop', { width: 1.0, height: 0.5 }, this.scene);
    mesh.position = new Vector3(pos.x, 0.6, pos.z);
    mesh.billboardMode = BillboardMode.Y;
    const mat = new StandardMaterial('dropmat', this.scene);
    mat.diffuseTexture = tex;
    mat.diffuseTexture.hasAlpha = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    mat.specularColor = Color3.Black();
    mat.emissiveColor = new Color3(0.4, 0.3, 0.1);
    mesh.material = mat;

    this.droppedItems.push({ mesh, mat, drop, life: 12, age: 0, baseY: 0.6 });
  }

  updateDroppedItems(dt) {
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const d = this.droppedItems[i];
      d.age += dt;
      d.life -= dt;
      // Bob
      d.mesh.position.y = d.baseY + Math.sin(d.age * 3) * 0.1;
      d.mesh.rotation.y += dt * 1.5;
      // Pickup
      if (this.player.mesh && Vector3.Distance(d.mesh.position, this.player.mesh.position) < 1.5) {
        this.player.coins += d.drop.coins;
        this.audio.playSfx('coin');
        d.mesh.dispose(); d.mat.dispose();
        this.droppedItems.splice(i, 1);
        continue;
      }
      if (d.life <= 0) {
        d.mesh.dispose(); d.mat.dispose();
        this.droppedItems.splice(i, 1);
      }
    }
  }

  /* ---- INTERACTION / DIALOGUE / SHOP ---- */
  doInteract() {
    if (!this.player.mesh) return;
    const pp = this.player.mesh.position;
    let closest = null, closestDist = 3.5;
    for (const npc of this.npcs) {
      const dist = Vector3.Distance(pp, npc.mesh.position);
      if (dist < closestDist) { closest = npc; closestDist = dist; }
    }
    if (!closest) return;
    const lines = closest.dialogue;
    if (lines && lines.length) {
      const line = lines[Math.floor(Math.random() * lines.length)];
      this.showDialogue(closest.name || line.speaker, line.text);
      const isVendor = ['fishball', 'icecream', 'water'].includes(closest.id);
      if (isVendor) {
        setTimeout(() => this.showShop(closest.id, CHARACTER_DEFS[closest.id].name), 200);
      }
    }
  }

  showDialogue(speaker, text) {
    if (this.dlgGui) this.dlgGui.dispose();
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('dlg', true, this.scene);
    this.dlgGui = gui;
    const box = new Rectangle('dlgBox');
    box.width = '650px'; box.height = '110px';
    box.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    box.background = 'rgba(0,0,0,0.88)';
    box.cornerRadius = 8; box.thickness = 1; box.color = '#ffcc00';
    box.top = '-20px'; gui.addControl(box);

    const sp = new TextBlock(); sp.text = speaker + ':';
    sp.color = '#ffcc00'; sp.fontSize = '15px'; sp.fontFamily = 'monospace';
    sp.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    sp.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    sp.textLeft = '15px'; sp.textTop = '10px'; sp.width = '620px'; sp.height = '20px';
    box.addControl(sp);

    const dt = new TextBlock(); dt.text = text;
    dt.color = '#fff'; dt.fontSize = '13px'; dt.fontFamily = 'monospace';
    dt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    dt.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    dt.textLeft = '15px'; dt.textTop = '40px'; dt.width = '620px'; dt.height = '50px';
    dt.wordWrap = true; box.addControl(dt);

    const pr = new TextBlock(); pr.text = '[SPACE / ENTER] to close';
    pr.color = '#888'; pr.fontSize = '10px'; pr.fontFamily = 'monospace';
    pr.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    pr.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    pr.textRight = '15px'; pr.textBottom = '5px'; box.addControl(pr);

    const close = () => { gui.dispose(); this.dlgGui = null; };
    const h = (e) => { if (e.code === 'Space' || e.code === 'Enter') { window.removeEventListener('keydown', h); close(); }};
    window.addEventListener('keydown', h);
  }

  showShop(npcId, name) {
    if (this.shopGui) this.shopGui.dispose();
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('shop', true, this.scene);
    this.shopGui = gui;
    const bg = new Rectangle('sb');
    bg.width = '500px'; bg.height = '520px';
    bg.background = 'rgba(0,0,0,0.92)';
    bg.cornerRadius = 10; bg.thickness = 2; bg.color = '#ffcc00';
    gui.addControl(bg);

    const title = new TextBlock(); title.text = `${name}'s Tindahan`;
    title.color = '#ffcc00'; title.fontSize = '22px'; title.fontFamily = 'monospace';
    title.height = '36px'; title.top = '-230px'; bg.addControl(title);

    const coinText = new TextBlock(); coinText.text = `Your coins: ₱${this.player.coins}`;
    coinText.color = '#fff'; coinText.fontSize = '13px'; coinText.fontFamily = 'monospace';
    coinText.height = '20px'; coinText.top = '-200px'; bg.addControl(coinText);

    const panel = new StackPanel('sp'); panel.isVertical = true;
    panel.width = '470px'; panel.height = '380px'; panel.top = '10px'; bg.addControl(panel);

    // Get all items for this vendor
    const items = Object.entries(SHOP_ITEMS).filter(([_, it]) => it.vendor === npcId);

    items.forEach(([itemId, item]) => {
      const row = new Rectangle(); row.width = '460px'; row.height = '48px';
      row.background = 'rgba(255,255,255,0.05)'; row.cornerRadius = 4; row.thickness = 0;
      panel.addControl(row);
      const n = new TextBlock(); n.text = item.name;
      n.color = '#fff'; n.fontSize = '14px'; n.fontFamily = 'monospace';
      n.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; n.textLeft = '10px';
      n.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP; n.textTop = '4px';
      n.width = '280px'; row.addControl(n);
      const d = new TextBlock(); d.text = `${item.desc} - +${item.value}`;
      d.color = '#aaa'; d.fontSize = '10px'; d.fontFamily = 'monospace';
      d.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      d.textLeft = '10px'; d.textTop = '24px'; d.width = '280px'; row.addControl(d);
      const btn = Button.CreateSimpleButton(`buy_${itemId}`, `₱${item.price}`);
      btn.width = '80px'; btn.height = '32px';
      btn.color = this.player.coins >= item.price ? '#0f0' : '#f44';
      btn.background = '#333'; btn.fontSize = '13px'; btn.fontFamily = 'monospace';
      btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      btn.onPointerUpObservable.add(() => this.buyItem(itemId, npcId, name));
      row.addControl(btn);
    });

    const closeBtn = Button.CreateSimpleButton('closeShop', '[X] Close');
    closeBtn.width = '140px'; closeBtn.height = '36px';
    closeBtn.color = '#fff'; closeBtn.background = '#444';
    closeBtn.top = '230px'; closeBtn.fontSize = '13px'; closeBtn.fontFamily = 'monospace';
    closeBtn.onPointerUpObservable.add(() => { gui.dispose(); this.shopGui = null; });
    bg.addControl(closeBtn);
  }

  buyItem(itemId, npcId, name) {
    const item = SHOP_ITEMS[itemId];
    if (!item || this.player.coins < item.price) return;
    this.player.coins -= item.price;
    this.audio.playSfx('buy');
    switch (item.effect) {
      case 'hunger':  this.player.hunger = Math.min(100, this.player.hunger + item.value); break;
      case 'thirst':  this.player.thirst = Math.min(100, this.player.thirst + item.value); break;
      case 'health':  this.player.health = Math.min(this.player.maxHealth, this.player.health + item.value); break;
      case 'stamina': this.player.stamina = Math.min(100, this.player.stamina + item.value); break;
      case 'damage':  /* weapon - not implemented as inventory yet */ break;
    }
    if (this.shopGui) { this.shopGui.dispose(); this.shopGui = null; }
    this.showShop(npcId, name);
  }

  /* ---- ENEMY AI ---- */
  updateEnemies(dt) {
    if (!this.player.mesh) return;
    const pp = this.player.mesh.position;
    this.enemies.forEach(e => {
      if (e.hp <= 0) return;
      e.stateTimer += dt;
      e.atkCd = Math.max(0, e.atkCd - dt);
      e.tauntTimer -= dt;
      const dist = Vector3.Distance(e.mesh.position, pp);

      // State transitions
      if (e.state === 'idle' && dist < e.aggro) e.state = 'chase';
      else if (e.state === 'idle' && e.stateTimer > 3) {
        e.state = 'patrol'; e.stateTimer = 0;
      }
      if (e.state === 'chase' && dist > e.aggro * 1.6) {
        e.state = 'idle'; e.stateTimer = 0; e.taunted = false;
      }

      if (e.state === 'patrol') {
        if (!e.patrolTarget || e.stateTimer > 4) {
          e.patrolTarget = e.spawnPos.add(new Vector3((Math.random()-0.5)*8, 0, (Math.random()-0.5)*8));
          e.stateTimer = 0;
        }
        const dir = e.patrolTarget.subtract(e.mesh.position); dir.y = 0;
        if (dir.length() > 0.5) { dir.normalize(); e.mesh.position.addInPlace(dir.scale(e.speed * 0.5 * dt)); }
        if (dist < e.aggro) { e.state = 'chase'; e.stateTimer = 0; }
      }

      if (e.state === 'chase') {
        const dir = pp.subtract(e.mesh.position); dir.y = 0;
        if (dir.length() > e.atkRange) { dir.normalize(); e.mesh.position.addInPlace(dir.scale(e.speed * dt)); }
        if (dir.x !== 0 && e.visual) e.visual.scaling.x = dir.x > 0 ? 1 : -1;
        if (dist < e.atkRange) { e.state = 'attack'; e.stateTimer = 0; }
      }

      if (e.state === 'attack' && e.atkCd <= 0 && dist < e.atkRange * 1.6) {
        if (this.player.invTimer <= 0) {
          this.player.health = Math.max(0, this.player.health - e.dmg);
          this.player.invTimer = 0.8;
          this.audio.playSfx('damage');
          if (this.player.visual) this.player.visual.material.emissiveColor = new Color3(1, 0.2, 0.2);
          setTimeout(() => {
            if (this.player.visual) this.player.visual.material.emissiveColor = new Color3(0.15, 0.15, 0.15);
          }, 200);
        }
        e.atkCd = 1.2;
        if (e.ranged) {
          this.spawnProjectile(e.mesh.position.clone(), pp.subtract(e.mesh.position).normalize().scale(8), 6, 'enemy');
        }
      }

      // Animation
      e.animTimer += dt;
      if (e.animTimer > 0.15) {
        e.animTimer = 0;
        const aType = e.state === 'chase' || e.state === 'patrol' ? 'walk' : 'idle';
        const frames = this.assets[e.id]?.frames[aType] || [];
        if (frames.length) {
          e.animFrame = (e.animFrame + 1) % frames.length;
          if (e.visual) e.visual.material.diffuseTexture = frames[e.animFrame];
        }
      }
    });
  }

  /* ---- NPC AI (crowd wandering) ---- */
  updateNpcs(dt) {
    if (!this.player.mesh) return;
    const pp = this.player.mesh.position;
    this.npcs.forEach(n => {
      // Simple wander AI
      n.wanderTimer = (n.wanderTimer || 0) - dt;
      if (n.wanderTimer <= 0) {
        n.wanderTarget = new Vector3(
          n.mesh.position.x + (Math.random() - 0.5) * 3,
          n.mesh.position.y,
          n.mesh.position.z + (Math.random() - 0.5) * 3
        );
        n.wanderTimer = 3 + Math.random() * 5;
      }
      if (n.wanderTarget) {
        const dir = n.wanderTarget.subtract(n.mesh.position);
        if (dir.length() > 0.2) {
          dir.normalize();
          const speed = n.isKid ? 0.6 : 0.4;
          n.mesh.position.x += dir.x * speed * dt;
          n.mesh.position.z += dir.z * speed * dt;
          if (n.visual) n.visual.scaling.x = dir.x > 0 ? 1 : -1;
        }
      }
      // Animate (idle bob)
      n.animTimer = (n.animTimer || 0) + dt;
      if (n.animTimer > 0.3) {
        n.animTimer = 0;
        n.animFrame = (n.animFrame || 0);
        const frames = this.assets[n.id]?.frames['idle'] || [];
        if (frames.length && n.visual) {
          n.animFrame = (n.animFrame + 1) % frames.length;
          n.visual.material.diffuseTexture = frames[n.animFrame];
        }
      }
    });
  }

  /* ---- PROJECTILES ---- */
  spawnProjectile(pos, vel, dmg, source) {
    const p = MeshBuilder.CreateSphere('proj', { diameter: 0.3, segments: 4 }, this.scene);
    p.position = pos.clone();
    const m = new StandardMaterial('pm', this.scene);
    m.diffuseColor = new Color3(1, 0.5, 0.2);
    m.emissiveColor = new Color3(1, 0.5, 0.2);
    m.specularColor = Color3.Black();
    p.material = m;
    this.projectiles.push({ mesh: p, vel, dmg, life: 2, age: 0, source });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.mesh.position.addInPlace(p.vel.scale(dt));
      if (p.age >= p.life) { p.mesh.dispose(); this.projectiles.splice(i, 1); continue; }
      if (p.source === 'enemy' && this.player.mesh &&
          Vector3.Distance(p.mesh.position, this.player.mesh.position) < 1) {
        if (this.player.invTimer <= 0) {
          this.player.health = Math.max(0, this.player.health - p.dmg);
          this.player.invTimer = 0.6;
          this.audio.playSfx('damage');
        }
        p.mesh.dispose(); this.projectiles.splice(i, 1);
        continue;
      }
      this.enemies.forEach(e => {
        if (e.hp > 0 && Vector3.Distance(p.mesh.position, e.mesh.position) < 1) {
          e.hp -= p.dmg;
          if (e.hpBar) e.hpBar.scaling.x = Math.max(0.01, e.hp / e.maxHp);
          p.mesh.dispose();
          this.projectiles.splice(i, 1);
          if (e.hp <= 0) {
            this.player.coins += e.coins;
            this.spawnDroppedItem(e.mesh.position.clone(), e.id);
            setTimeout(() => { e.mesh?.dispose(); e.hpBar?.dispose(); e.hpBg?.dispose(); }, 300);
          }
        }
      });
    }
  }

  /* ---- GAME OVER ---- */
  showGameOver() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('go', true, this.scene);
    const bg = new Rectangle('goBg');
    bg.width = '100%'; bg.height = '100%';
    bg.background = 'rgba(0,0,0,0.85)'; bg.thickness = 0; gui.addControl(bg);
    const t = new TextBlock(); t.text = 'GAME OVER';
    t.color = '#ff4444'; t.fontSize = '52px'; t.fontFamily = 'monospace';
    t.height = '60px'; t.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER; bg.addControl(t);
    const r = new TextBlock(); r.text = `Final Coins: ₱${this.player.coins} | Press R to restart`;
    r.color = '#fff'; r.fontSize = '18px'; r.fontFamily = 'monospace';
    r.height = '30px'; r.top = '70px'; bg.addControl(r);
    const h = (e) => { if (e.code === 'KeyR') { window.removeEventListener('keydown', h); gui.dispose(); this.state = 'playing'; this.hud?.gui.dispose(); this.loadZone('manila'); this.hud = this.createHud(); }};
    window.addEventListener('keydown', h);
  }

  run() {
    this.engine.runRenderLoop(() => this.update());
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.engine.resize();
    });
  }
}

/* ============================================================
   INPUT MANAGER
   ============================================================ */
class InputManager {
  constructor() {
    this.keys = {};
    this.justDown = {};
    window.addEventListener('keydown', e => {
      // Prevent default for game keys to stop page scroll
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.justDown[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  isDown(c) { return !!this.keys[c]; }
  justPressed(c) { return !!this.justDown[c]; }
  update() { this.justDown = {}; }
  get moveX() { let v = 0; if (this.isDown('ArrowLeft')||this.isDown('KeyA')) v-=1; if (this.isDown('ArrowRight')||this.isDown('KeyD')) v+=1; return v; }
  get moveZ() { let v = 0; if (this.isDown('ArrowUp')||this.isDown('KeyW')) v+=1; if (this.isDown('ArrowDown')||this.isDown('KeyS')) v-=1; return v; }
  get sprint() { return this.isDown('ShiftLeft')||this.isDown('ShiftRight'); }
  get attack() { return this.justPressed('Space')||this.justPressed('KeyJ'); }
  get interact() { return this.justPressed('KeyE')||this.justPressed('Enter'); }
  get slot1() { return this.justPressed('Digit1'); }
  get slot2() { return this.justPressed('Digit2'); }
  get slot3() { return this.justPressed('Digit3'); }
  get special() { return this.justPressed('KeyQ'); }
}

/* ============================================================
   AUDIO MANAGER (PH-flavored procedural audio)
   Uses Web Audio API to synthesize Filipino-style chiptune sounds
   ============================================================ */
class AudioManager {
  constructor() { this.ctx = null; this.playing = false; this.interval = null; this.musicZone = null; }
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e) {} }
  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }
  playNote(f, d, t='square', v=0.1, del=0) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = t; osc.frequency.setValueAtTime(f, this.ctx.currentTime+del);
      gain.gain.setValueAtTime(v, this.ctx.currentTime+del);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime+del+d);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime+del); osc.stop(this.ctx.currentTime+del+d);
    } catch(e) {}
  }
  playNoise(d, v=0.1, del=0) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * d;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(v, this.ctx.currentTime + del);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + del + d);
      noise.connect(gain); gain.connect(this.ctx.destination);
      noise.start(this.ctx.currentTime + del);
    } catch(e) {}
  }
  playSfx(n) {
    this.init();
    const s = {
      hit:      [[200,.08],[150,.1]],
      jump:     [[400,.1],[600,.08]],
      coin:     [[800,.05],[1200,.08],[1500,.1]],
      damage:   [[120,.15],[80,.2]],
      death:    [[300,.3],[200,.4],[100,.6]],
      confirm:  [[800,.08],[1000,.06],[1200,.08]],
      perk:     [[400,.1],[600,.1],[800,.15],[1000,.2]],
      buy:      [[523,.1],[659,.1],[784,.1],[1047,.15]],
      enemy_hit:[[300,.06],[200,.08]],
      // PH-style extras
      jeepney_horn: [[180,.25],[220,.25]],
      rally_cheer:  [[400,.1],[500,.1],[600,.1],[800,.15]],
      bell:     [[1500,.1],[1500,.1],[1500,.1]],
    };
    (s[n]||[]).forEach(([f,d],i) => this.playNote(f,d,'square',0.1,i*0.06));
  }
  playMusic(zone) {
    this.stop();
    this.init();
    this.musicZone = zone;
    // Philippine-inspired kundiman / folk melodies (procedural)
    const m = {
      // Manila: lively, jeepney/busyness
      manila:   [330,392,440,523,494,440,392,330,294,330,392,440,523,659,587,523],
      // Baguio: cool, misty, slower - higher register
      baguio:   [262,330,392,440,494,523,587,659,587,523,494,440,392,330,294,262],
      // Quiapo: procession-like, deep and reverent
      quiapo:   [196,220,247,262,294,262,247,220,196,220,247,262,294,330,294,262],
      boss:     [130,155,196,262,196,155],
    };
    const notes = m[zone] || m.manila;
    let idx = 0;
    this.playing = true;
    // Lead note
    this.interval = setInterval(() => {
      if (!this.playing) { clearInterval(this.interval); return; }
      const note = notes[idx % notes.length];
      this.playNote(note, 0.18, 'square', 0.04);
      // Sub bass on every 4th note
      if (idx % 4 === 0) this.playNote(note / 4, 0.25, 'triangle', 0.06);
      // Hi-hat-ish noise on every 2nd
      if (idx % 2 === 0) this.playNoise(0.04, 0.02);
      idx++;
    }, 200);
  }
  stop() { this.playing = false; if (this.interval) clearInterval(this.interval); this.musicZone = null; }
}

/* ============================================================
   BOOT
   ============================================================ */
try {
  const game = new Game();
  game.run();
} catch (e) { showError(e.message || 'Game failed to start'); }
