# PINOY SURVIVAL

A 3D 32x32 pixel-art survival adventure set in the Philippines. Built with Babylon.js (loaded via CDN, no build step).

## Quick Start

```bash
npm install     # installs the `serve` static server
npm start       # serves the game at http://localhost:3000
npm run dev     # serves at http://localhost:5173 with all interfaces
npm test        # runs the syntax smoke test (no browser required)
```

Or just open `index.html` in any modern browser - Babylon.js loads from CDN.

## Controls

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` / Arrows | Move |
| `Shift` | Sprint (drains stamina) |
| `Space` / `J` | Melee attack |
| `E` / `Enter` | Interact (talk, shop) |
| `1` | Switch to Kiko Pangilinan |
| `2` | Switch to Risa Hontiveros |
| `3` | Switch to Leni Robredo |
| `R` | Restart (after Game Over) |

## Playable Characters

| # | Name | Style | Special | HP | Speed |
|---|------|-------|---------|-----|-------|
| 1 | **Kiko Pangilinan** | Senator (Barong) | Senate Speech (AoE) | 120 | 5 |
| 2 | **Risa Hontiveros** | Senator (Red) | Committee Hearing (ranged) | 95 | 6 |
| 3 | **Leni Robredo** | Public servant (Yellow) | Community Service (heal) | 110 | 5 |

Switching is instant (1/2/3 keys) - like a party of subs. Each character has a unique intro line on switch.

## Enemies

| Enemy | Style | HP | Behavior |
|-------|-------|-----|----------|
| **Zaldy Co** | Grey suit | 80 | Slow, heavy melee |
| **Sara Duterte** | Green suit | 100 | Medium chase |
| **Bongbong Marcos** | Beige Barong | 120 | Slow, heavy melee, high HP |
| **Alan Peter Cayetano** | Grey suit | 90 | **Ranged** (throws things) |
| **Sarah Discaya** | Blue suit | 70 | Fast, small hitbox |
| **Buwaya** (alligator) | Green | 150 | Slow, heavy bite, aquatic |

All enemies have **satirical taunt lines** (no real-world claims) and drop themed items:
Pork Barrel, Fake Bill, Dirt Bag, Luxury Watch, Mini-House Key, Bigas Sack, Old Ballot, Rally Flag.

## Zones (Luzon)

| Zone | Status | Features |
|------|--------|----------|
| **Manila** | Open | Rizal Park, Intramuros, LRT, jeepneys, fountain, dense crowd |
| **Baguio** | Open | Burnham Park, pines, strawberry stands, cool misty atmosphere |
| **Quiapo** | Open | Quiapo Church + cross, Plaza Miranda, Black Nazarene route |
| Visayas | Locked | Coming soon |
| Mindanao | Locked | Coming soon |

Each zone has:
- 5-8 unique buildings (with detailed windows, doors, brick patterns, roofs)
- 6-9 trees
- 3-6 props (jeepney, lamppost, fountain, LRT rail, church cross)
- 5-10 named NPCs (vendors + rally + kids)
- **50 procedurally-spawned civilians** (different colored variants)
- Unique fog color, ambient light, and procedural PH-flavored music

## NPCs (Vendors + Civilians)

- **Fishball Vendor** - sells fishball, taho, kwek-kwek, balut, energy drink, tsinelas
- **Ice Cream Seller** - sells sorbetes, halo-halo, lechon, adobo, sisig, sinigang, pancit, lumpia, first aid kit, balaraw
- **Water Seller** - sells water, buko juice, sago't gulaman, softdrink, San Miguel beer, kape barako, saging, salabat, lagundi, bato
- **Rally Crowd** - clustered formation with shouts
- **Kids Playing** - faster wander AI
- **Many civilians** - 8 color variants, 50 per zone, wander with random targets

## Items (26 total)

**Food** (12): Fishball, Taho, Kwek-Kwek, Balut, Sorbetes, Halo-Halo, Lechon, Adobo, Sisig, Sinigang, Pancit, Lumpia
**Drinks** (5): Water, Buko Juice, Sago't Gulaman, Softdrink, San Miguel
**Stamina** (3): Energy Drink, Kape Barako, Saging
**Healing** (3): First Aid Kit, Salabat, Lagundi
**Weapons** (3): Tsinelas, Balaraw (slingshot), Bato (rock)

## Survival Stats

- **HP** - 0 = Game Over
- **Food** (Hunger) - drains over time
- **Water** (Thirst) - drains faster than food
- **Stamina** - drains while sprinting
- **Coins** (₱) - earn from enemies, spend at vendors

If food or thirst hits 0, you start losing HP.

## File Structure

```
Pinoy-Survival/
├── index.html               # Entry point (canvas + loading screen)
├── package.json             # npm scripts
├── src/
│   └── main.js              # ~1900 lines: full game (engine, AI, GUI, audio)
├── tools/
│   ├── slice-sprites.js     # Optional: slice source PNG into 32x32 frames
│   ├── smoke-test.js        # Syntax + structure validation (no browser)
│   └── headless-test.js     # jsdom-based runtime test
├── assets/
│   ├── sprites/             # (optional) sliced sprite atlas
│   └── audio/               # (optional) PH sound clips
└── public/                  # (optional) static assets for deployment
```

## Sprite Slicing (Optional)

If you have a source sprite sheet (the labeled collection image), you can slice it into per-character 32x32 frames:

```bash
npm install sharp
node tools/slice-sprites.js path/to/source-sheet.png
```

Output: `assets/sprites/characters_atlas.png` + `characters_atlas.json`.

**The game works without this** - it has a built-in procedural pixel-art generator that draws 32x32 sprites for every character.

## Technical Notes

- **True 3D**: Babylon.js Scene, FollowCamera, HemisphericLight, DirectionalLight, fog
- **2.5D characters**: billboarded planes (Y-axis) with 32x32 pixel-art textures (NEAREST sampling, no anti-aliasing)
- **Smooth animation**: sub-pixel y-bob via `Math.sin(phase) * 0.04` for perceived smoothness at 32x32
- **Audio**: Web Audio API procedural chiptune with PH-inspired melodies + jeepney horn, rally cheer, etc.
- **Crowd AI**: simple wander, distance-based throttling, automatic spawn-blocking against buildings/enemies
- **No build step**: ES6+ via CDN, single-file game logic
- **Performance**: 50 NPCs + 5-8 enemies + 20+ buildings per zone, hardware scaling level 3

## Disclaimer

This is a fictional game. All character names, likenesses, and references are used for identification and satirical purposes only. No claims are made about real persons, and no real-world wrongdoing is asserted. In-game enemies are fictional game-mechanic characters; their dialogue and dropped items are satirical flavor, not factual statements.
