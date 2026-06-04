// Headless smoke test using jsdom to mock DOM
// Loads the game page, simulates Babylon.js loading, and checks for runtime errors.

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');

// Build a jsdom with the index HTML
const dom = new JSDOM(indexHtml, {
  url: 'http://localhost:5173/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});

const { window } = dom;
const errors = [];
const consoleMsgs = [];
window.addEventListener('error', (e) => {
  errors.push(`Window error: ${e.message} at ${e.filename}:${e.lineno}`);
});

// Mock BABYLON globally
const mockBabylon = {
  Engine: class {
    constructor(canvas) { this.canvas = canvas; }
    setHardwareScalingLevel() {}
    runRenderLoop() {}
    resize() {}
    getDeltaTime() { return 16; }
  },
  Scene: class {
    constructor(engine) {
      this.engine = engine;
      this.meshes = [];
    }
    render() {}
  },
  Vector3: class {
    constructor(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z; }
    static Distance(a, b) {
      return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
    }
    clone() { return new Vector3(this.x, this.y, this.z); }
    add(v) { return new Vector3(this.x+v.x, this.y+v.y, this.z+v.z); }
    subtract(v) { return new Vector3(this.x-v.x, this.y-v.y, this.z-v.z); }
    scale(s) { return new Vector3(this.x*s, this.y*s, this.z*s); }
    addInPlace(v) { this.x+=v.x; this.y+=v.y; this.z+=v.z; return this; }
    length() { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z); }
    normalize() { const l = this.length(); if (l) { this.x/=l; this.y/=l; this.z/=l; } return this; }
  },
  Color3: class {
    constructor(r=0, g=0, b=0) { this.r = r; this.g = g; this.b = b; }
    static Black() { return new Color3(0, 0, 0); }
  },
  Color4: class { constructor(r=0, g=0, b=0, a=1) { this.r=r; this.g=g; this.b=b; this.a=a; } },
  MeshBuilder: {
    CreateBox: (name, opts) => ({ name, opts, position: new mockBabylon.Vector3(), scaling: new mockBabylon.Vector3(1,1,1), getChildMeshes: () => [], parent: null, dispose: () => {} }),
    CreatePlane: (name, opts) => ({ name, opts, position: new mockBabylon.Vector3(), scaling: new mockBabylon.Vector3(1,1,1), getChildMeshes: () => [], parent: null, dispose: () => {} }),
    CreateDisc: (name, opts) => ({ name, opts, position: new mockBabylon.Vector3(), scaling: new mockBabylon.Vector3(1,1,1), getChildMeshes: () => [], parent: null, dispose: () => {} }),
    CreateGround: (name, opts) => ({ name, opts, position: new mockBabylon.Vector3(), scaling: new mockBabylon.Vector3(1,1,1), getChildMeshes: () => [], parent: null, dispose: () => {} }),
    CreateCylinder: (name, opts) => ({ name, opts, position: new mockBabylon.Vector3(), scaling: new mockBabylon.Vector3(1,1,1), getChildMeshes: () => [], parent: null, dispose: () => {} }),
    CreateSphere: (name, opts) => ({ name, opts, position: new mockBabylon.Vector3(), scaling: new mockBabylon.Vector3(1,1,1), getChildMeshes: () => [], parent: null, dispose: () => {} }),
  },
  StandardMaterial: class {
    constructor(name) { this.name = name; this.diffuseTexture = null; this.diffuseColor = new mockBabylon.Color3(1,1,1); this.emissiveColor = new mockBabylon.Color3(); this.specularColor = new mockBabylon.Color3(); this.alpha = 1; }
  },
  DynamicTexture: class {
    constructor(name, opts) { this.name = name; this.opts = opts; this._ctx = { clearRect: () => {}, fillRect: () => {}, fillText: () => {}, font: '', textAlign: '', fillStyle: '', strokeStyle: '', beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fill: () => {}, save: () => {}, restore: () => {} }; }
    getContext() { return this._ctx; }
    update() {}
    updateSamplingMode() {}
  },
  HemisphericLight: class { constructor() { this.intensity = 1; } },
  DirectionalLight: class { constructor() { this.intensity = 1; } },
  FollowCamera: class {
    constructor(name, pos) { this.name = name; this.position = pos; this.radius=0; this.heightOffset=0; this.rotationOffset=0; this.cameraAcceleration=0; this.maxCameraSpeed=0; }
  },
  BillboardMode: { Y: 0 },
  Texture: { NEAREST_SAMPLINGMODE: 0 },
  FOGMODE_LINEAR: 0,
  GUI: {
    AdvancedDynamicTexture: {
      CreateFullscreenUI: (name) => {
        const gui = { name, addControl: () => {}, dispose: () => {} };
        return gui;
      },
    },
    TextBlock: class { constructor() { this.text=''; this.color=''; this.fontSize=0; this.fontFamily=''; this.height=0; this.width=0; this.top=''; this.textWrapping=false; this.textHorizontalAlignment=0; this.textVerticalAlignment=0; this.textLeft=''; this.textRight=''; this.textTop=''; this.textBottom=''; this.wordWrap=false; this.isVisible=true; } },
    Rectangle: class { constructor() { this.width=''; this.height=''; this.background=''; this.cornerRadius=0; this.thickness=0; this.color=''; this.top=''; this.isPointerBlocker=false; this.isVisible=true; this.horizontalAlignment=0; this.verticalAlignment=0; this.paddingLeft=''; this.paddingRight=''; this.onPointerUpObservable={add:()=>{}}; this.onPointerEnterObservable={add:()=>{}}; this.onPointerOutObservable={add:()=>{}}; } },
    Control: { HORIZONTAL_ALIGNMENT_LEFT: 0, VERTICAL_ALIGNMENT_TOP: 0, VERTICAL_ALIGNMENT_BOTTOM: 0, VERTICAL_ALIGNMENT_CENTER: 0, HORIZONTAL_ALIGNMENT_RIGHT: 0 },
    StackPanel: class { constructor() { this.isVertical=false; this.width=''; this.height=''; this.top=''; this.horizontalAlignment=0; this.verticalAlignment=0; this.paddingLeft=''; this.paddingRight=''; this.addControl=()=>{}; } },
    Button: { CreateSimpleButton: (name, text) => ({ name, text, width:'', height:'', color:'', background:'', fontSize:'', fontFamily:'', top:'', horizontalAlignment:0, onPointerUpObservable:{add:()=>{}} }) },
    Ellipse: class { constructor() {} },
  },
};

window.BABYLON = mockBabylon;

// Mock canvas
window.HTMLCanvasElement.prototype.getContext = function() {
  return { clearRect: () => {}, fillRect: () => {}, drawImage: () => {}, getImageData: () => ({data: new Uint8ClampedArray(4)}), putImageData: () => {} };
};

// Run the main.js
try {
  const script = new window.Function(mainJs);
  script();
  console.log('[OK] main.js executed without throwing');
  // Wait a tick
  setTimeout(() => {
    console.log('Errors:', errors.length ? errors : 'none');
    process.exit(errors.length ? 1 : 0);
  }, 100);
} catch (e) {
  console.error('[FAIL] Runtime error:', e.message);
  console.error(e.stack);
  process.exit(1);
}
