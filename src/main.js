const $L = document.getElementById('loading');
const $B = document.getElementById('loadBar');
const $M = document.getElementById('loadMsg');
function hideLoading() { if ($B) $B.style.width = '100%'; setTimeout(() => { if ($L) { $L.style.opacity = '0'; setTimeout(() => { if ($L) $L.style.display = 'none'; }, 300); } }, 300); }
function showError(msg) { if ($M) $M.textContent = msg; if ($B) $B.style.background = '#ff3333'; if ($B) $B.style.width = '100%'; console.error(msg); }

if (typeof BABYLON === 'undefined') { showError('Failed to load Babylon.js engine. Check your internet connection and reload the page.'); throw new Error('Babylon.js not loaded'); }

const { Engine, Scene, Vector3, Color3, Color4, MeshBuilder, StandardMaterial,
  DynamicTexture, HemisphericLight, DirectionalLight, FollowCamera, BillboardMode } = BABYLON;
const _G = BABYLON.GUI || BABYLON;
const { AdvancedDynamicTexture, TextBlock, Rectangle, Control, StackPanel, Button, Ellipse } = _G;

const CHARACTER_DEFS = {
  kiko:      { name: 'Kiko Pangilinan',   role: 'playable', w: 48, h: 72, speed: 5, special: 'Senate Speech',     specialCost: 30 },
  risa:      { name: 'Risa Hontiveros',   role: 'playable', w: 48, h: 72, speed: 6, special: 'Committee Hearing', specialCost: 20 },
  leni:      { name: 'Leni Robredo',      role: 'playable', w: 48, h: 72, speed: 5, special: 'Community Service',  specialCost: 25 },
  zaldy:     { name: 'Zaldy Co',          role: 'enemy',    w: 48, h: 72, hp: 80,  speed: 3, dmg: 8,  aggro: 12, atkRange: 1.5, coins: 15 },
  sara_d:    { name: 'Sara Duterte',      role: 'enemy',    w: 48, h: 72, hp: 100, speed: 4, dmg: 12, aggro: 15, atkRange: 1.8, coins: 20 },
  bongbong:  { name: 'Bongbong Marcos',   role: 'enemy',    w: 48, h: 72, hp: 120, speed: 2.5, dmg: 15, aggro: 10, atkRange: 2.0, coins: 25 },
  alan:      { name: 'Alan Peter Cayetano', role: 'enemy',  w: 48, h: 72, hp: 90,  speed: 3.5, dmg: 10, aggro: 14, atkRange: 8.0, coins: 18 },
  sarah_d:   { name: 'Sarah Discaya',    role: 'enemy',    w: 48, h: 72, hp: 70,  speed: 4.5, dmg: 6,  aggro: 16, atkRange: 1.2, coins: 12 },
  buwaya:    { name: 'Buwaya',           role: 'enemy',    w: 56, h: 72, hp: 150, speed: 2, dmg: 20, aggro: 8,  atkRange: 2.5, coins: 30 },
  rally:     { name: 'Rally Crowd',      role: 'npc',      w: 80, h: 64 },
  fishball:  { name: 'Fishball Vendor',  role: 'npc',      w: 64, h: 64 },
  icecream:  { name: 'Ice Cream Seller', role: 'npc',      w: 64, h: 64 },
  water:     { name: 'Water Seller',     role: 'npc',      w: 48, h: 64 },
  kids:      { name: 'Kids Playing',     role: 'npc',      w: 64, h: 48 },
  civilian_m:{ name: 'Kuya',             role: 'npc',      w: 40, h: 64 },
  civilian_f:{ name: 'Ate',              role: 'npc',      w: 40, h: 64 },
};

const CHAR_COLORS = {
  kiko: [0xF5F5DC, 0x8B7355], risa: [0xCC3333, 0x2C2C2C], leni: [0xFFD700, 0x2C2C2C],
  zaldy: [0x2C2C2C, 0x1A1A1A], sara_d: [0x2E7D32, 0x1A1A1A], bongbong: [0xF5F5DC, 0x1A1A1A],
  alan: [0x808080, 0x2C2C2C], sarah_d: [0x1A237E, 0x2C2C2C], buwaya: [0x3B7A3B, 0x1A3A1A],
  rally: [0xFF4444, 0x4444FF], fishball: [0xD2B48C, 0x8B4513], icecream: [0xFFB6C1, 0x4169E1],
  water: [0x87CEEB, 0x4682B4], kids: [0xFFA500, 0x0000FF], civilian_m: [0x90EE90, 0x2C2C2C],
  civilian_f: [0xFFB6C1, 0x2C2C2C],
};

const NPC_DIALOGUES = {
  fishball: [
    { speaker: 'Fishball Vendor', text: 'Kain ka, pre! Mainit pa ang fishball! Piso lang bawat stick!' },
    { speaker: 'Fishball Vendor', text: 'Gusto mo rin ng taho? Sarap nito, mainit-init pa!' },
  ],
  icecream: [
    { speaker: 'Ice Cream Seller', text: 'Sorbetes! Chocolate, cheese, o ube? Mainit ang panahon!' },
    { speaker: 'Ice Cream Seller', text: 'Halo-halo rin meron! Pampalamig sa init!' },
  ],
  water: [
    { speaker: 'Water Seller', text: 'Tubig! Limang piso lang! Mainit ang panahon, pre!' },
    { speaker: 'Water Seller', text: 'Buko juice rin meron! Fresh from the coconut!' },
  ],
  rally: [
    { speaker: 'Protester', text: 'HUSTISYA! HUSTISYA!' },
    { speaker: 'Protester', text: 'Tama na! Sobra na! Palitan na!' },
  ],
  kids: [
    { speaker: 'Kid', text: 'Taya! Ikaw ang taya!' },
    { speaker: 'Kid', text: 'Ang bilis ko, huli niyo ako!' },
  ],
  civilian_m: [{ speaker: 'Kuya', text: 'Ingat kayo, mainit ang panahon ngayon.' }],
  civilian_f: [{ speaker: 'Ate', text: 'Saan ka galing? Ingat ka, madami na naman nagkakagulo.' }],
};

const SHOP_ITEMS = {
  fishball:     { name: 'Fishball (Stick)', desc: 'Mainit na fishball', effect: 'hunger', value: 20, price: 5 },
  taho:         { name: 'Taho',            desc: 'Mainit na taho',     effect: 'hunger', value: 15, price: 5 },
  icecream:     { name: 'Sorbetes',        desc: 'Ice cream!',         effect: 'hunger', value: 10, price: 8 },
  halo_halo:    { name: 'Halo-Halo',       desc: 'Pampalamig!',        effect: 'hunger', value: 25, price: 15 },
  water_bottle: { name: 'Water Bottle',    desc: 'Tubig!',             effect: 'thirst', value: 30, price: 3 },
  buko_juice:   { name: 'Buko Juice',      desc: 'Fresh coconut!',     effect: 'thirst', value: 25, price: 5 },
  lechon:       { name: 'Lechon Kawali',   desc: 'Crispy!',            effect: 'hunger', value: 50, price: 20 },
  adobo:        { name: 'Adobo Rice',      desc: 'Classic viand',      effect: 'hunger', value: 40, price: 15 },
  energy_drink: { name: 'Energy Drink',    desc: '+Stamina',           effect: 'stamina', value: 50, price: 10 },
  medkit:       { name: 'First Aid Kit',   desc: '+Health',            effect: 'health', value: 30, price: 25 },
  tsinelas:     { name: 'Tsinelas',        desc: 'Throw at enemies!',  effect: 'damage', value: 12, price: 8 },
};

const ZONES = {
  manila: {
    name: 'Manila', desc: 'Ang kabisera ng Pilipinas', w: 60, h: 60, ground: 0x555555,
    enemies: [
      { id: 'zaldy', x: 10, z: 5 }, { id: 'zaldy', x: -8, z: 12 },
      { id: 'sara_d', x: 15, z: -8 }, { id: 'alan', x: -12, z: -5 },
      { id: 'sarah_d', x: 5, z: 15 },
    ],
    npcs: [
      { id: 'fishball', x: -5, z: 0 }, { id: 'icecream', x: 3, z: 8 },
      { id: 'water', x: -10, z: -8 }, { id: 'rally', x: 0, z: -12 },
      { id: 'kids', x: 8, z: -3 }, { id: 'civilian_m', x: -3, z: 10 },
      { id: 'civilian_f', x: 12, z: 3 }, { id: 'civilian_m', x: -15, z: 5 },
    ],
    buildings: [
      { x: -18, z: -18, w: 4, h: 3, d: 4, c: 0x8B7355 },
      { x: 18, z: 18, w: 5, h: 3, d: 4, c: 0xA0522D },
      { x: -6, z: 4, w: 3, h: 2.5, d: 3, c: 0xDAA520 },
      { x: 6, z: -6, w: 3, h: 2.5, d: 3, c: 0xCD853F },
      { x: 0, z: 0, w: 6, h: 3, d: 6, c: 0xB22222 },
    ],
    trees: [
      { x: -20, z: 0 }, { x: 20, z: -10 }, { x: -10, z: 20 },
      { x: 15, z: -15 }, { x: -25, z: -20 }, { x: 25, z: 25 },
    ],
  },
  baguio: {
    name: 'Baguio', desc: 'Ang summer capital', w: 50, h: 50, ground: 0x2E7D32,
    enemies: [
      { id: 'bongbong', x: 0, z: 0 }, { id: 'zaldy', x: -10, z: 8 },
      { id: 'sara_d', x: 12, z: -5 },
    ],
    npcs: [
      { id: 'fishball', x: -3, z: 5 }, { id: 'water', x: 5, z: -3 },
      { id: 'kids', x: 0, z: 8 }, { id: 'civilian_m', x: -8, z: -3 },
    ],
    buildings: [{ x: -12, z: -12, w: 4, h: 3, d: 4, c: 0x8B4513 }],
    trees: [
      { x: -15, z: 5 }, { x: 15, z: -8 }, { x: -5, z: -18 },
      { x: 10, z: 15 }, { x: -20, z: -10 }, { x: 20, z: 10 },
    ],
  },
  quezon: {
    name: 'Quezon Province', desc: 'Land of coconut trees', w: 60, h: 60, ground: 0xC2B280,
    enemies: [
      { id: 'buwaya', x: 15, z: 15 }, { id: 'buwaya', x: -10, z: 20 },
      { id: 'zaldy', x: -5, z: -10 },
    ],
    npcs: [
      { id: 'fishball', x: 0, z: 0 }, { id: 'water', x: -5, z: 5 },
      { id: 'civilian_m', x: 5, z: -5 }, { id: 'kids', x: 3, z: 8 },
    ],
    buildings: [
      { x: -10, z: -10, w: 3, h: 2, d: 3, c: 0xDEB887 },
      { x: 10, z: 10, w: 3, h: 2, d: 3, c: 0xD2B48C },
    ],
    trees: [
      { x: -15, z: 0 }, { x: 15, z: 0 }, { x: 0, z: -15 },
      { x: 0, z: 15 }, { x: -20, z: -20 }, { x: 20, z: 20 },
    ],
  },
  visayas:  { name: 'Visayas',  desc: 'Coming soon!', locked: true },
  mindanao: { name: 'Mindanao', desc: 'Coming soon!', locked: true },
};

class Game {
  constructor() {
    this.canvas = document.getElementById('renderCanvas');
    this.engine = new Engine(this.canvas, false, { preserveDrawingBuffer: true, stencil: true, antialias: false });
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
    this.ground = null;
    this.projectiles = [];

    this.player = {
      mesh: null, visual: null, health: 100, maxHealth: 100,
      hunger: 100, thirst: 100, stamina: 100, coins: 25,
      speed: 5, facing: 1, attackTimer: 0, invTimer: 0,
      charId: 'kiko', animFrame: 0, animTimer: 0, currentAnim: 'idle',
    };

    this.setupScene();
    this.generateAllSprites();
    if ($B) $B.style.width = '60%';
    this.menuGui = this.createMenu();
    hideLoading();
  }

  setupScene() {
    this.engine.setHardwareScalingLevel(3);
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

  generateAllSprites() {
    for (const [id, def] of Object.entries(CHARACTER_DEFS)) {
      const tex = new DynamicTexture(`tex_${id}`, { width: 32, height: 32 }, this.scene, false);
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, 32, 32);
      const colors = CHAR_COLORS[id] || [0xCCCCCC, 0x666666];
      this.drawCharacter(ctx, 32, 32, 32, colors, id);
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

  drawCharacter(ctx, size, w, h, colors, id) {
    const px = 2;
    const ox = (size - 8 * px) / 2;
    const oy = (size - 10 * px) / 2;
    const isBuwaya = id === 'buwaya';

    if (isBuwaya) {
      ctx.fillStyle = '#' + colors[0].toString(16).padStart(6, '0');
      ctx.fillRect(ox+px, oy+px*2, px*6, px*5);
      ctx.fillRect(ox+px*2, oy+px, px*4, px);
      ctx.fillRect(ox+px, oy+px*7, px, px*2);
      ctx.fillRect(ox+px*6, oy+px*7, px, px*2);
      ctx.fillRect(ox+px*6, oy+px*3, px*2, px*2);
      ctx.fillStyle = '#000';
      ctx.fillRect(ox+px*2, oy+px*2, px, px);
      ctx.fillRect(ox+px*5, oy+px*2, px, px);
      ctx.fillRect(ox+px*2, oy+px*4, px*4, px);
      ctx.fillStyle = '#' + colors[1].toString(16).padStart(6, '0');
      ctx.fillRect(ox, oy+px*8, px*8, px);
    } else {
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(ox+px*3, oy, px*2, px*2);
      ctx.fillStyle = '#' + colors[0].toString(16).padStart(6, '0');
      ctx.fillRect(ox+px*2, oy+px*2, px*4, px*4);
      ctx.fillRect(ox+px*1, oy+px*3, px*6, px*2);
      ctx.fillStyle = '#ffcc99';
      ctx.fillRect(ox+px*3, oy+px, px, px);
      ctx.fillRect(ox+px*4, oy+px, px, px);
      ctx.fillStyle = '#000';
      ctx.fillRect(ox+px*3, oy+px, 1, 1);
      ctx.fillRect(ox+px*4, oy+px, 1, 1);
      ctx.fillStyle = '#' + colors[1].toString(16).padStart(6, '0');
      ctx.fillRect(ox+px*2, oy+px*6, px*2, px*3);
      ctx.fillRect(ox+px*4, oy+px*6, px*2, px*3);
      ctx.fillStyle = '#222';
      ctx.fillRect(ox+px*2, oy+px*9, px*2, px);
      ctx.fillRect(ox+px*4, oy+px*9, px*2, px);
    }
  }

  genFrames(id, def, colors) {
    const frames = { idle: [], walk: [], attack: [] };
    for (let type = 0; type < 3; type++) {
      const count = type === 0 ? 2 : type === 1 ? 4 : 2;
      for (let i = 0; i < count; i++) {
        const tex = new DynamicTexture(`${id}_${type}_${i}`, { width: 32, height: 32 }, this.scene, false);
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 32, 32);
        this.drawCharacter(ctx, 32, 32, 32, colors, id);
        if (type === 1 && (i === 1 || i === 3)) {
          ctx.fillStyle = '#222';
          const px = 2;
          const ox = 6;
          const oy = 4;
          ctx.fillRect(ox+px*2+(i===1?-px:px), oy+px*8, px*2, px);
          ctx.fillRect(ox+px*4-(i===1?-px:px), oy+px*8, px*2, px);
        }
        tex.update();
        tex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
        const key = type === 0 ? 'idle' : type === 1 ? 'walk' : 'attack';
        frames[key].push(tex);
      }
    }
    return frames;
  }

  createPlayerMesh(charId) {
    const def = CHARACTER_DEFS[charId];
    const w = def.w || 48, h = def.h || 64;
    const body = MeshBuilder.CreateBox(`player`, { width: 0.6, height: 1.6, depth: 0.3 }, this.scene);
    body.isPickable = false;
    const sx = w / 16;
    const sy = h / 16;
    const visual = MeshBuilder.CreatePlane('playerVis', { width: sx, height: sy }, this.scene);
    visual.billboardMode = BillboardMode.Y;
    visual.material = this.materials[charId];
    visual.parent = body;
    visual.position.y = sy * 0.5;
    return { body, visual };
  }

  setAnim(id, type, frame) {
    const asset = this.assets[id];
    if (!asset || !asset.frames[type]) return;
    const f = asset.frames[type][frame % asset.frames[type].length];
    if (f && this.player.visual) this.player.visual.material.diffuseTexture = f;
  }

  createMenu() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('menu', true, this.scene);
    const bg = new Rectangle('menuBg');
    bg.width = '100%'; bg.height = '100%';
    bg.background = 'rgba(0,0,0,0.95)'; bg.thickness = 0;
    gui.addControl(bg);

    const title = new TextBlock('title');
    title.text = 'PINOY SURVIVAL';
    title.color = '#ffcc00'; title.fontSize = '42px';
    title.fontFamily = 'monospace'; title.height = '60px'; title.top = '-120px';
    bg.addControl(title);

    const sub = new TextBlock('sub');
    sub.text = 'Philippine Adventure';
    sub.color = '#ffffff'; sub.fontSize = '18px';
    sub.fontFamily = 'monospace'; sub.height = '30px'; sub.top = '-70px';
    bg.addControl(sub);

    const panel = new StackPanel('mp'); panel.isVertical = true;
    panel.width = '300px'; panel.height = '180px'; panel.top = '10px';
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
    ctrl.text = 'WASD: Move | Space: Attack | E: Interact | 1/2/3: Switch | ESC: Pause';
    ctrl.color = '#666'; ctrl.fontSize = '10px'; ctrl.fontFamily = 'monospace';
    ctrl.height = '30px'; ctrl.top = '120px'; ctrl.textWrapping = true; ctrl.width = '500px';
    bg.addControl(ctrl);

    const disc = new TextBlock('disc');
    disc.text = 'This is a fictional game. Any resemblance is used only for identification; no claims are made about real persons.';
    disc.color = '#444'; disc.fontSize = '8px'; disc.fontFamily = 'monospace';
    disc.height = '20px'; disc.top = '155px'; disc.textWrapping = true; disc.width = '500px';
    bg.addControl(disc);

    return gui;
  }

  showZoneSelect(parentGui) {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('zones', true, this.scene);
    const bg = new Rectangle('zb'); bg.width = '100%'; bg.height = '100%';
    bg.background = 'rgba(0,0,0,0.9)'; bg.thickness = 0; gui.addControl(bg);

    const t = new TextBlock(); t.text = 'SELECT ZONE';
    t.color = '#ffcc00'; t.fontSize = '24px'; t.fontFamily = 'monospace';
    t.height = '40px'; t.top = '-150px'; bg.addControl(t);

    const panel = new StackPanel('zp'); panel.isVertical = true;
    panel.width = '350px'; panel.top = '-80px'; bg.addControl(panel);

    Object.entries(ZONES).forEach(([id, z]) => {
      const unlocked = !z.locked;
      const row = new Rectangle(`zr_${id}`);
      row.width = '340px'; row.height = '40px';
      row.background = unlocked ? 'rgba(255,204,0,0.1)' : 'rgba(100,100,100,0.1)';
      row.cornerRadius = 4; row.thickness = 1;
      row.color = unlocked ? '#ffcc00' : '#444';
      row.isPointerBlocker = unlocked;
      if (unlocked) row.onPointerUpObservable.add(() => {
        this.audio.playSfx('confirm');
        this.loadZone(id);
        gui.dispose();
        parentGui.dispose();
      });
      panel.addControl(row);
      const n = new TextBlock(); n.text = z.name;
      n.color = unlocked ? '#fff' : '#666'; n.fontSize = '14px'; n.fontFamily = 'monospace';
      n.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; n.textLeft = '10px';
      row.addControl(n);
      const d = new TextBlock(); d.text = z.desc;
      d.color = unlocked ? '#aaa' : '#555'; d.fontSize = '10px'; d.fontFamily = 'monospace';
      d.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT; d.textRight = '10px';
      row.addControl(d);
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

  loadZone(zoneId) {
    const z = ZONES[zoneId];
    if (!z || z.locked) return;
    this.currentZone = zoneId;
    this.clearWorld();

    this.ground = MeshBuilder.CreateGround('ground', { width: z.w, height: z.h, subdivisions: 1 }, this.scene);
    const gmat = new StandardMaterial('gmat', this.scene);
    gmat.specularColor = Color3.Black();
    const ghex = '#' + z.ground.toString(16).padStart(6, '0');
    const dtex = new DynamicTexture('gtex', { width: 32, height: 32 }, this.scene, false);
    const ctx = dtex.getContext();
    ctx.fillStyle = ghex;
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.12})`;
      ctx.fillRect(Math.floor(Math.random()*32), Math.floor(Math.random()*32), 1, 1);
    }
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`;
      ctx.fillRect(Math.floor(Math.random()*32), Math.floor(Math.random()*32), 1, 1);
    }
    dtex.update();
    dtex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
    gmat.diffuseTexture = dtex;
    gmat.diffuseTexture.uScale = 8;
    gmat.diffuseTexture.vScale = 8;
    this.ground.material = gmat;

    (z.buildings || []).forEach(b => {
      const bw = Math.round(b.w), bh = Math.round(b.h), bd = Math.round(b.d);
      const box = MeshBuilder.CreateBox('bld', { width: bw, height: bh, depth: bd }, this.scene);
      box.position = new Vector3(b.x, bh/2, b.z);
      const tw = Math.max(16, Math.round(bw * 4));
      const th = Math.max(16, Math.round(bh * 4));
      const btex = new DynamicTexture('btex', { width: tw, height: th }, this.scene, false);
      const bx = btex.getContext();
      const bhex = '#' + b.c.toString(16).padStart(6, '0');
      bx.fillStyle = bhex;
      bx.fillRect(0, 0, tw, th);
      const winSize = 3;
      const gap = Math.max(5, Math.round(tw / Math.max(2, Math.floor(bw / 1.5))));
      for (let wy = Math.round(th * 0.15); wy < th - 2; wy += gap) {
        for (let wx = Math.round(tw * 0.1); wx < tw - 2; wx += gap) {
          bx.fillStyle = '#1a1a2e';
          bx.fillRect(wx, wy, winSize, winSize);
          if (Math.random() > 0.4) {
            bx.fillStyle = '#ffdd44';
            bx.fillRect(wx + 1, wy + 1, 1, 1);
          }
        }
      }
      bx.fillStyle = '#111';
      bx.fillRect(Math.round(tw*0.4), th - Math.round(bh*1.2), Math.round(tw*0.2), Math.round(bh*1.2));
      btex.update();
      btex.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const m = new StandardMaterial('bm', this.scene);
      m.diffuseTexture = btex;
      m.specularColor = Color3.Black();
      m.emissiveColor = new Color3(0.08, 0.08, 0.08);
      box.material = m;
      this.buildings.push(box);
    });

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

    this.spawnEnemies(z.enemies || []);
    this.spawnNpcs(z.npcs || []);
    this.spawnPlayer();
  }

  spawnPlayer() {
    if (this.player.mesh) this.player.mesh.dispose();
    const { body, visual } = this.createPlayerMesh(this.player.charId);
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
      const { body, visual } = this.createPlayerMesh(s.id);
      body.position = new Vector3(s.x, 1, s.z);
      const hpBar = MeshBuilder.CreatePlane('hp', { width: 1, height: 0.08 }, this.scene);
      hpBar.parent = body; hpBar.position.y = 1.5;
      const hpMat = new StandardMaterial('hpm', this.scene);
      hpMat.diffuseColor = new Color3(1, 0.2, 0.2);
      hpMat.emissiveColor = new Color3(1, 0.2, 0.2);
      hpMat.specularColor = Color3.Black();
      hpBar.material = hpMat;
      this.enemies.push({
        mesh: body, visual, id: s.id, hp: def.hp, maxHp: def.hp,
        speed: def.speed, dmg: def.dmg, aggro: def.aggro,
        atkRange: def.atkRange, coins: def.coins,
        state: 'idle', stateTimer: 0, atkCd: 0, spawnPos: body.position.clone(),
        hpBar,
      });
    });
  }

  spawnNpcs(list) {
    this.npcs.forEach(n => n.mesh.dispose());
    this.npcs = [];
    list.forEach(s => {
      const def = CHARACTER_DEFS[s.id];
      if (!def) return;
      const { body, visual } = this.createPlayerMesh(s.id);
      body.position = new Vector3(s.x, 1, s.z);
      const lbl = new DynamicTexture(`nl_${s.id}`, { width: 128, height: 16 }, this.scene, false);
      const lctx = lbl.getContext();
      lctx.fillStyle = '#fff';
      lctx.font = '10px monospace';
      lctx.textAlign = 'center';
      lctx.fillText(def.name, 64, 12);
      lbl.update();
      lbl.updateSamplingMode(BABYLON.Texture.NEAREST_SAMPLINGMODE);
      const lblMesh = MeshBuilder.CreatePlane('nlm', { width: 1.5, height: 0.2 }, this.scene);
      lblMesh.parent = body; lblMesh.position.y = 1.8;
      const lm = new StandardMaterial('nlm', this.scene);
      lm.diffuseTexture = lbl; lm.diffuseTexture.hasAlpha = true;
      lm.useAlphaFromDiffuseTexture = true; lm.backFaceCulling = false;
      lm.specularColor = Color3.Black();
      lm.emissiveColor = new Color3(0.5, 0.5, 0.5);
      lblMesh.material = lm;
      this.npcs.push({ mesh: body, visual, id: s.id, dialogue: NPC_DIALOGUES[s.id] || [] });
    });
  }

  clearWorld() {
    [this.ground, ...this.buildings, ...this.trees, ...this.enemies.map(e=>e.mesh),
     ...this.npcs.map(n=>n.mesh), ...this.projectiles.map(p=>p.mesh)
    ].forEach(m => { if (m) m.dispose(); });
    this.buildings = []; this.trees = []; this.enemies = []; this.npcs = []; this.projectiles = [];
  }

  startGame() {
    this.state = 'playing';
    this.menuGui.dispose();
    this.loadZone('manila');
    this.hud = this.createHud();
  }

  createHud() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('hud', true, this.scene);
    const top = new Rectangle('top');
    top.width = '100%'; top.height = '50px';
    top.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    top.background = 'rgba(0,0,0,0.6)'; top.thickness = 0;
    gui.addControl(top);

    const left = new StackPanel('lp'); left.isVertical = true;
    left.width = '250px'; left.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    left.paddingLeft = '10px'; top.addControl(left);

    const bars = {};
    [['HP', '#ff4444', '#440000'], ['Food', '#ff8800', '#442200'],
     ['Water', '#4488ff', '#002244'], ['Stamina', '#44ff44', '#004400']
    ].forEach(([lbl, fc, bc]) => {
      const row = new StackPanel(); row.isVertical = false;
      row.height = '12px'; row.width = '220px'; left.addControl(row);
      const l = new TextBlock(); l.text = lbl; l.color = '#fff';
      l.fontSize = '9px'; l.width = '50px'; l.fontFamily = 'monospace'; row.addControl(l);
      const bg = new Rectangle(); bg.width = '140px'; bg.height = '10px';
      bg.background = bc; bg.cornerRadius = 3; bg.thickness = 0; row.addControl(bg);
      const fill = new Rectangle(); fill.width = '100%'; fill.height = '100%';
      fill.background = fc; fill.cornerRadius = 3; fill.thickness = 0;
      fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; bg.addControl(fill);
      const val = new TextBlock(); val.text = '100'; val.color = '#fff';
      val.fontSize = '8px'; val.width = '30px'; val.fontFamily = 'monospace'; row.addControl(val);
      bars[lbl] = { fill, val };
    });

    const right = new StackPanel('rp'); right.isVertical = true;
    right.width = '150px'; right.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    right.paddingRight = '10px'; top.addControl(right);

    const coinT = new TextBlock(); coinT.text = '₱ 0';
    coinT.color = '#ffcc00'; coinT.fontSize = '16px'; coinT.height = '20px';
    coinT.fontFamily = 'monospace'; right.addControl(coinT);

    const zoneT = new TextBlock(); zoneT.text = 'Manila';
    zoneT.color = '#fff'; zoneT.fontSize = '12px'; zoneT.height = '18px';
    zoneT.fontFamily = 'monospace'; right.addControl(zoneT);

    const charT = new TextBlock(); charT.text = '[1]Kiko [2]Risa [3]Leni';
    charT.color = '#aaa'; charT.fontSize = '10px'; charT.height = '16px';
    charT.fontFamily = 'monospace'; right.addControl(charT);

    return { gui, bars, coinT, zoneT, charT };
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
  }

  update() {
    const dt = this.engine.getDeltaTime() / 1000;
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
      p.mesh.position.x = Math.max(-29, Math.min(29, p.mesh.position.x));
      p.mesh.position.z = Math.max(-29, Math.min(29, p.mesh.position.z));
      if (mx !== 0) { p.facing = mx > 0 ? 1 : -1; if (p.visual) p.visual.scaling.x = p.facing; }
    }

    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.invTimer = Math.max(0, p.invTimer - dt);

    p.animTimer += dt;
    if (p.animTimer > 0.25) {
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

    if (this.input.interact) this.doInteract();

    this.updateEnemies(dt);
    p.hunger = Math.max(0, p.hunger - 0.3 * dt);
    p.thirst = Math.max(0, p.thirst - 0.4 * dt);
    if (p.hunger <= 0 || p.thirst <= 0) p.health = Math.max(0, p.health - 3 * dt);

    this.updateProjectiles(dt);
    this.updateHud();

    if (p.health <= 0) {
      this.state = 'ended';
      this.showGameOver();
    }

    this.scene.render();
  }

  switchChar(id) {
    if (id === this.player.charId) return;
    const pos = this.player.mesh?.position.clone() || new Vector3(0, 1, 0);
    const hp = this.player.health;
    const hunger = this.player.hunger;
    const thirst = this.player.thirst;
    const stamina = this.player.stamina;
    const coins = this.player.coins;

    if (this.player.mesh) this.player.mesh.dispose();
    this.player.charId = id;
    this.player.speed = CHARACTER_DEFS[id].speed || 5;
    const { body, visual } = this.createPlayerMesh(id);
    this.player.mesh = body;
    this.player.visual = visual;
    body.position = pos;
    this.player.health = hp;
    this.player.hunger = hunger;
    this.player.thirst = thirst;
    this.player.stamina = stamina;
    this.player.coins = coins;
    this.camera.lockedTarget = body;
    this.audio.playSfx('perk');
  }

  doMeleeAttack() {
    if (!this.player.mesh) return;
    const pos = this.player.mesh.position;
    const f = this.player.facing;
    const range = 2.2;
    const hitPos = pos.add(new Vector3(f * 1, 0.8, 0));

    const slash = MeshBuilder.CreateDisc('slash', { radius: 0.5, tessellation: 6 }, this.scene);
    slash.position = hitPos.clone();
    slash.billboardMode = 7;
    const sm = new StandardMaterial('sm', this.scene);
    sm.diffuseColor = new Color3(1, 1, 0.8);
    sm.emissiveColor = new Color3(1, 0.9, 0.5);
    sm.specularColor = Color3.Black();
    sm.alpha = 0.7; sm.backFaceCulling = false;
    slash.material = sm;
    setTimeout(() => { slash.dispose(); sm.dispose(); }, 150);

    const dmg = 10 + Math.floor(Math.random() * 5);
    this.enemies.forEach(e => {
      if (e.hp <= 0) return;
      if (Vector3.Distance(hitPos, e.mesh.position) < range) {
        e.hp -= dmg;
        this.audio.playSfx('enemy_hit');
        e.mesh.getChildMeshes().forEach(m => {
          if (m.material) m.material.emissiveColor = new Color3(1, 0.5, 0.5);
        });
        setTimeout(() => {
          e.mesh?.getChildMeshes().forEach(m => {
            if (m.material) m.material.emissiveColor = new Color3(0.15, 0.15, 0.15);
          });
        }, 150);
        if (e.hpBar) e.hpBar.scaling.x = Math.max(0.01, e.hp / e.maxHp);
        if (e.hp <= 0) {
          this.player.coins += e.coins;
          setTimeout(() => { e.mesh.dispose(); }, 300);
        }
      }
    });
  }

  doInteract() {
    if (!this.player.mesh) return;
    const pp = this.player.mesh.position;
    for (const npc of this.npcs) {
      if (Vector3.Distance(pp, npc.mesh.position) < 3) {
        const lines = npc.dialogue;
        if (lines && lines.length) {
          const line = lines[Math.floor(Math.random() * lines.length)];
          this.showDialogue(line.speaker, line.text);
          const def = CHARACTER_DEFS[npc.id];
          if (def && (npc.id === 'fishball' || npc.id === 'icecream' || npc.id === 'water')) {
            this.showShop(npc.id, def.name);
          }
        }
        return;
      }
    }
  }

  showDialogue(speaker, text) {
    if (this.dlgGui) this.dlgGui.dispose();
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('dlg', true, this.scene);
    this.dlgGui = gui;
    const box = new Rectangle('dlgBox');
    box.width = '600px'; box.height = '100px';
    box.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    box.background = 'rgba(0,0,0,0.85)';
    box.cornerRadius = 8; box.thickness = 1; box.color = '#ffcc00';
    box.top = '-20px'; gui.addControl(box);

    const sp = new TextBlock(); sp.text = speaker + ':';
    sp.color = '#ffcc00'; sp.fontSize = '14px'; sp.fontFamily = 'monospace';
    sp.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    sp.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    sp.textLeft = '15px'; sp.textTop = '10px'; sp.width = '570px'; sp.height = '20px';
    box.addControl(sp);

    const dt = new TextBlock(); dt.text = text;
    dt.color = '#fff'; dt.fontSize = '12px'; dt.fontFamily = 'monospace';
    dt.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    dt.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    dt.textLeft = '15px'; dt.textTop = '35px'; dt.width = '570px'; dt.height = '40px';
    dt.wordWrap = true; box.addControl(dt);

    const pr = new TextBlock(); pr.text = '[SPACE] to close';
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
    bg.width = '400px'; bg.height = '300px';
    bg.background = 'rgba(0,0,0,0.9)';
    bg.cornerRadius = 10; bg.thickness = 2; bg.color = '#ffcc00';
    gui.addControl(bg);

    const title = new TextBlock(); title.text = `${name}'s Shop`;
    title.color = '#ffcc00'; title.fontSize = '18px'; title.fontFamily = 'monospace';
    title.height = '30px'; title.top = '-130px'; bg.addControl(title);

    const panel = new StackPanel('sp'); panel.isVertical = true;
    panel.width = '380px'; panel.height = '200px'; panel.top = '-10px'; bg.addControl(panel);

    const items = npcId === 'fishball' ? ['fishball', 'taho'] :
                  npcId === 'icecream' ? ['icecream', 'halo_halo'] :
                  ['water_bottle', 'buko_juice'];

    items.forEach(itemId => {
      const item = SHOP_ITEMS[itemId];
      if (!item) return;
      const row = new Rectangle(); row.width = '370px'; row.height = '40px';
      row.background = 'rgba(255,255,255,0.05)'; row.cornerRadius = 4; row.thickness = 0;
      panel.addControl(row);
      const n = new TextBlock(); n.text = item.name;
      n.color = '#fff'; n.fontSize = '13px'; n.fontFamily = 'monospace';
      n.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT; n.textLeft = '10px';
      n.width = '200px'; row.addControl(n);
      const d = new TextBlock(); d.text = `${item.desc} - Restores ${item.value}`;
      d.color = '#aaa'; d.fontSize = '10px'; d.fontFamily = 'monospace';
      d.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      d.textLeft = '10px'; d.textTop = '16px'; d.width = '200px'; row.addControl(d);
      const btn = Button.CreateSimpleButton(`buy_${itemId}`, `₱${item.price}`);
      btn.width = '70px'; btn.height = '28px';
      btn.color = this.player.coins >= item.price ? '#0f0' : '#f44';
      btn.background = '#333'; btn.fontSize = '12px'; btn.fontFamily = 'monospace';
      btn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      btn.onPointerUpObservable.add(() => this.buyItem(itemId));
      row.addControl(btn);
    });

    const closeBtn = Button.CreateSimpleButton('closeShop', '[X] Close');
    closeBtn.width = '100px'; closeBtn.height = '30px';
    closeBtn.color = '#fff'; closeBtn.background = '#444';
    closeBtn.top = '130px'; closeBtn.fontSize = '12px'; closeBtn.fontFamily = 'monospace';
    closeBtn.onPointerUpObservable.add(() => { gui.dispose(); this.shopGui = null; });
    bg.addControl(closeBtn);
  }

  buyItem(itemId) {
    const item = SHOP_ITEMS[itemId];
    if (!item || this.player.coins < item.price) return;
    this.player.coins -= item.price;
    this.audio.playSfx('buy');
    switch (item.effect) {
      case 'hunger': this.player.hunger = Math.min(100, this.player.hunger + item.value); break;
      case 'thirst': this.player.thirst = Math.min(100, this.player.thirst + item.value); break;
      case 'health': this.player.health = Math.min(this.player.maxHealth, this.player.health + item.value); break;
      case 'stamina': this.player.stamina = Math.min(100, this.player.stamina + item.value); break;
    }
    if (this.shopGui) { this.shopGui.dispose(); this.shopGui = null; }
    this.showShop(this.lastShopNpc || 'fishball', 'Shop');
  }

  updateEnemies(dt) {
    if (!this.player.mesh) return;
    const pp = this.player.mesh.position;
    this.enemies.forEach(e => {
      if (e.hp <= 0) return;
      e.stateTimer += dt;
      e.atkCd = Math.max(0, e.atkCd - dt);
      const dist = Vector3.Distance(e.mesh.position, pp);

      if (e.state === 'idle' && dist < e.aggro) e.state = 'chase';
      else if (e.state === 'idle' && e.stateTimer > 3) {
        e.state = 'patrol'; e.stateTimer = 0;
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
        if (dist > e.aggro * 1.5) { e.state = 'idle'; e.stateTimer = 0; }
      }

      if (e.state === 'attack' && e.atkCd <= 0 && dist < e.atkRange * 1.5) {
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
      }
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      p.mesh.position.addInPlace(p.vel.scale(dt));
      if (p.age >= p.life) { p.mesh.dispose(); this.projectiles.splice(i, 1); continue; }
      this.enemies.forEach(e => {
        if (e.hp > 0 && Vector3.Distance(p.mesh.position, e.mesh.position) < 1) {
          e.hp -= p.dmg;
          if (e.hpBar) e.hpBar.scaling.x = Math.max(0.01, e.hp / e.maxHp);
          p.mesh.dispose();
          this.projectiles.splice(i, 1);
          if (e.hp <= 0) { this.player.coins += e.coins; setTimeout(() => e.mesh.dispose(), 300); }
        }
      });
    }
  }

  showGameOver() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('go', true, this.scene);
    const bg = new Rectangle('goBg');
    bg.width = '100%'; bg.height = '100%';
    bg.background = 'rgba(0,0,0,0.8)'; bg.thickness = 0; gui.addControl(bg);
    const t = new TextBlock(); t.text = 'GAME OVER';
    t.color = '#ff4444'; t.fontSize = '48px'; t.fontFamily = 'monospace';
    t.height = '60px'; t.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER; bg.addControl(t);
    const r = new TextBlock(); r.text = `Final Coins: ₱${this.player.coins} | Press R to restart`;
    r.color = '#fff'; r.fontSize = '16px'; r.fontFamily = 'monospace';
    r.height = '30px'; r.top = '60px'; bg.addControl(r);
    const h = (e) => { if (e.code === 'KeyR') { window.removeEventListener('keydown', h); gui.dispose(); this.state = 'playing'; this.hud?.gui.dispose(); this.loadZone('manila'); this.hud = this.createHud(); }};
    window.addEventListener('keydown', h);
  }

  run() {
    this.engine.runRenderLoop(() => this.update());
    window.addEventListener('resize', () => this.engine.resize());
  }
}

class InputManager {
  constructor() {
    this.keys = {};
    this.justDown = {};
    window.addEventListener('keydown', e => { if (!this.keys[e.code]) this.justDown[e.code] = true; this.keys[e.code] = true; });
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
}

class AudioManager {
  constructor() { this.ctx = null; this.playing = false; this.interval = null; }
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
  playSfx(n) {
    this.init();
    const s = { hit:[[200,.08],[150,.1]], jump:[[400,.1],[600,.08]], coin:[[800,.05],[1200,.08]],
      damage:[[120,.15],[80,.2]], death:[[300,.3],[200,.4],[100,.6]], confirm:[[800,.08],[1000,.06]],
      perk:[[400,.1],[600,.1],[800,.15]], buy:[[523,.1],[659,.1],[784,.1],[1047,.15]],
      enemy_hit:[[300,.06],[200,.08]] };
    (s[n]||[]).forEach(([f,d],i) => this.playNote(f,d,'square',0.1,i*0.05));
  }
  playMusic(zone) {
    this.stop(); this.init();
    const m = { manila:[262,330,392,523,392,330,262,330], baguio:[220,262,330,392,330,262],
      quezon:[196,262,311,392,311,262], boss:[130,155,196,262,196,155] };
    const notes = m[zone] || m.manila;
    let idx = 0; this.playing = true;
    this.interval = setInterval(() => {
      if (!this.playing) { clearInterval(this.interval); return; }
      this.playNote(notes[idx%notes.length], 0.14, 'square', 0.03); idx++;
    }, 100);
  }
  stop() { this.playing = false; if (this.interval) clearInterval(this.interval); }
}

try {
  const game = new Game();
  game.run();
} catch (e) { showError(e.message || 'Game failed to start'); }
