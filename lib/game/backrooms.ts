import * as THREE from 'three'
import { GameModeConfig } from './types'

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const ROOM_SIZE       = 16
const WALL_HEIGHT     = 5.5
const CORRIDOR_WIDTH  = 6
const LIGHT_SPACING   = 12
const FLOOR_STEP      = WALL_HEIGHT        // vertical gap between floors
const MAX_FLOORS_UP   = 6                  // floors above baseline (level 0)
const MAX_FLOORS_DOWN = 4                  // floors below baseline

// ─────────────────────────────────────────────────────────────────
// Deterministic noise helpers
// ─────────────────────────────────────────────────────────────────

/** Mulberry32 — fast deterministic PRNG seeded per-chunk+floor */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF
  }
}

function hashXYZ(x: number, y: number, z: number): number {
  let h = 2166136261
  h = Math.imul(h ^ (x + 32768), 16777619)
  h = Math.imul(h ^ (y + 32768), 16777619)
  h = Math.imul(h ^ (z + 32768), 16777619)
  return h >>> 0
}

/** Smooth Perlin-like value noise in 2D (integer grid) */
function valueNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x), iz = Math.floor(z)
  const fx = x - ix, fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)

  const r00 = mulberry32(hashXYZ(ix,   seed, iz  ))()
  const r10 = mulberry32(hashXYZ(ix+1, seed, iz  ))()
  const r01 = mulberry32(hashXYZ(ix,   seed, iz+1))()
  const r11 = mulberry32(hashXYZ(ix+1, seed, iz+1))()

  return r00*(1-ux)*(1-uz) + r10*ux*(1-uz) + r01*(1-ux)*uz + r11*ux*uz
}

// ─────────────────────────────────────────────────────────────────
// Distance-based probability system
//   Probability fields warp continuously with distance from origin.
//   Uses layered noise so variation is gradual, not sudden.
// ─────────────────────────────────────────────────────────────────
interface BiomeWeights {
  classicLabyrinth:   number
  openPillarHall:     number
  narrowCorridors:    number
  megaChamber:        number
  fractalChamber:     number
  hexagonalCells:     number
  brutalistGrid:      number
  decayedRuin:        number
}

function getBiomeWeights(cx: number, cy: number, cz: number): BiomeWeights {
  // Radial distance influences macro-biome; noise layers add local variation
  const radial = Math.sqrt(cx*cx + cz*cz) / 12          // normalised horizontal
  const depth  = Math.abs(cy)                            // vertical depth

  // Base noise per biome type at different frequencies
  const n0 = valueNoise2D(cx * 0.08,  cz * 0.08,  0)   // slow drift
  const n1 = valueNoise2D(cx * 0.2,   cz * 0.2,   7)   // medium
  const n2 = valueNoise2D(cx * 0.5,   cz * 0.5,  13)   // fine detail
  const nY = valueNoise2D(cx * 0.1,   cy * 0.3,  19)   // vertical bias

  // Shallow / surface floors → familiar labyrinth
  const surfaceBias  = Math.max(0, 1 - depth * 0.3)
  // Deep floors → ruins, fractal structures
  const depthBias    = Math.min(1, depth * 0.25)
  // Far from origin → more alien variants
  const radialBias   = Math.min(1, radial * 0.6)

  const w: BiomeWeights = {
    classicLabyrinth:  clamp(0.6 * surfaceBias + n0 * 0.4,            0.05, 1),
    openPillarHall:    clamp(0.3 + n1 * 0.5 - depthBias * 0.2,       0.05, 1),
    narrowCorridors:   clamp(0.2 + nY * 0.6 + surfaceBias * 0.3,     0.05, 1),
    megaChamber:       clamp(radialBias * 0.5 + n0 * 0.3,            0.02, 1),
    fractalChamber:    clamp(depthBias * 0.8 + radialBias * 0.4 + n2, 0.02, 1),
    hexagonalCells:    clamp(n1 * 0.7 + radialBias * 0.4,            0.02, 1),
    brutalistGrid:     clamp(depthBias * 0.4 + n2 * 0.4,             0.02, 1),
    decayedRuin:       clamp(depthBias * 0.6 + radialBias * 0.5 + n0, 0.02, 1),
  }
  return w
}

function sampleBiome(w: BiomeWeights, rng: () => number): keyof BiomeWeights {
  const keys = Object.keys(w) as (keyof BiomeWeights)[]
  const total = keys.reduce((s, k) => s + w[k], 0)
  let r = rng() * total
  for (const k of keys) {
    r -= w[k]
    if (r <= 0) return k
  }
  return 'classicLabyrinth'
}

// ─────────────────────────────────────────────────────────────────
// Furniture probability — also distance-weighted
// ─────────────────────────────────────────────────────────────────
interface FurnitureWeights {
  chair:       number
  table:       number
  photoFrame:  number
  bookshelf:   number
  fileCabinet: number
  brokenDesk:  number
  standingLamp:number
}

function getFurnitureWeights(cx: number, cy: number, cz: number): FurnitureWeights {
  const radial = Math.sqrt(cx*cx + cz*cz) / 12
  const depth  = Math.abs(cy)
  const n0 = valueNoise2D(cx * 0.15, cz * 0.15, 31)
  const n1 = valueNoise2D(cx * 0.35, cz * 0.35, 41)

  return {
    chair:       clamp(0.4 + n0 * 0.4 - depth * 0.05,      0.05, 1),
    table:       clamp(0.3 + n1 * 0.4 - radial * 0.1,      0.05, 1),
    photoFrame:  clamp(0.25 + n0 * 0.5,                    0.05, 1),
    bookshelf:   clamp(0.2 + n1 * 0.4 - depth * 0.1,       0.02, 1),
    fileCabinet: clamp(0.15 + depth * 0.1 + n0 * 0.3,      0.02, 1),
    brokenDesk:  clamp(radial * 0.4 + depth * 0.2 + n1*0.3, 0.02, 1),
    standingLamp:clamp(0.2 + n0 * 0.3,                     0.02, 1),
  }
}

function sampleFurniture(w: FurnitureWeights, rng: () => number): keyof FurnitureWeights {
  const keys = Object.keys(w) as (keyof FurnitureWeights)[]
  const total = keys.reduce((s, k) => s + w[k], 0)
  let r = rng() * total
  for (const k of keys) {
    r -= w[k]
    if (r <= 0) return k
  }
  return 'chair'
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ─────────────────────────────────────────────────────────────────
// 3D Fractal helpers (Menger sponge–style recursive boxes)
// ─────────────────────────────────────────────────────────────────
function mengerPoints(cx: number, cy: number, cz: number,
                      size: number, depth: number): THREE.Vector3[] {
  if (depth === 0) return [new THREE.Vector3(cx, cy, cz)]
  const s3 = size / 3
  const result: THREE.Vector3[] = []
  for (let ix = 0; ix < 3; ix++) {
    for (let iy = 0; iy < 3; iy++) {
      for (let iz = 0; iz < 3; iz++) {
        const axisCount = (ix === 1 ? 1 : 0) + (iy === 1 ? 1 : 0) + (iz === 1 ? 1 : 0)
        if (axisCount >= 2) continue  // remove center cross
        const nx = cx + (ix - 1) * s3
        const ny = cy + (iy - 1) * s3
        const nz = cz + (iz - 1) * s3
        result.push(...mengerPoints(nx, ny, nz, s3, depth - 1))
      }
    }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────
// BackroomsGenerator
// ─────────────────────────────────────────────────────────────────
export class BackroomsGenerator {
  private scene: THREE.Scene
  private config: GameModeConfig
  private generatedChunks: Set<string> = new Set()
  private chunkSize = 64
  private lights: {
    light: THREE.PointLight
    fixture: THREE.Mesh
    isOn: boolean
    flickerPhase: number
  }[] = []
  private flickerTime = 0
  private maxLights = 48

  // Texture atlases — one set per aesthetic "zone" (lazily created)
  private wallTextures:    Map<string, THREE.CanvasTexture> = new Map()
  private floorTextures:   Map<string, THREE.CanvasTexture> = new Map()
  private ceilingTextures: Map<string, THREE.CanvasTexture> = new Map()

  constructor(scene: THREE.Scene, config: GameModeConfig) {
    this.scene  = scene
    this.config = config
  }

  // ───────────────────────── Texture factories ──────────────────

  private getWallTexture(variant: string): THREE.CanvasTexture {
    if (this.wallTextures.has(variant)) return this.wallTextures.get(variant)!
    const t = this.buildWallTexture(variant)
    this.wallTextures.set(variant, t)
    return t
  }

  private buildWallTexture(variant: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const r = (this.config.wallColor >> 16) & 255
    const g = (this.config.wallColor >> 8)  & 255
    const b =  this.config.wallColor        & 255

    if (variant === 'deep') {
      // Cracked concrete — dark, wet look
      ctx.fillStyle = `rgb(${r*0.6|0},${g*0.6|0},${b*0.6|0})`
      ctx.fillRect(0, 0, 512, 512)
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 1
      for (let i = 0; i < 40; i++) {
        ctx.beginPath()
        ctx.moveTo(Math.random()*512, Math.random()*512)
        let px = Math.random()*512, py = Math.random()*512
        for (let s = 0; s < 6; s++) {
          ctx.lineTo(px + (Math.random()-0.5)*60, py + (Math.random()-0.5)*60)
        }
        ctx.stroke()
      }
    } else if (variant === 'ruins') {
      // Exposed brick
      ctx.fillStyle = `rgb(${r+20|0},${g-10|0},${b-20|0})`
      ctx.fillRect(0, 0, 512, 512)
      const bw = 64, bh = 26
      for (let row = 0; row < Math.ceil(512/bh); row++) {
        const offset = (row % 2) * (bw / 2)
        for (let col = 0; col < Math.ceil(512/bw)+1; col++) {
          const bx = col * bw - offset, by = row * bh
          const shade = 0.8 + Math.random() * 0.2
          ctx.fillStyle = `rgba(${(r*shade)|0},${(g*shade*0.7)|0},${(b*shade*0.5)|0},1)`
          ctx.fillRect(bx+1, by+1, bw-2, bh-2)
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'
          ctx.lineWidth = 1
          ctx.strokeRect(bx, by, bw, bh)
        }
      }
    } else {
      // Classic wallpaper (original + improvements)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(0, 0, 512, 512)
      ctx.fillStyle = `rgba(0,0,0,0.07)`
      for (let x = 0; x < 512; x += 28) ctx.fillRect(x, 0, 14, 512)
      ctx.fillStyle = `rgba(0,0,0,0.04)`
      for (let y = 0; y < 512; y += 56) ctx.fillRect(0, y, 512, 2)
      // Subtle diamond pattern
      ctx.strokeStyle = 'rgba(0,0,0,0.04)'
      ctx.lineWidth = 0.5
      for (let i = -512; i < 1024; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i+512, 512); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i-512, 512); ctx.stroke()
      }
      // Stains
      for (let i = 0; i < 18; i++) {
        const x = Math.random()*512, y = Math.random()*512
        const sz = 20 + Math.random()*70
        ctx.fillStyle = `rgba(100,60,20,${0.05+Math.random()*0.12})`
        ctx.beginPath()
        ctx.ellipse(x, y, sz, sz*0.55, Math.random()*Math.PI, 0, Math.PI*2)
        ctx.fill()
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 2)
    return tex
  }

  private getFloorTexture(variant: string): THREE.CanvasTexture {
    if (this.floorTextures.has(variant)) return this.floorTextures.get(variant)!
    const t = this.buildFloorTexture(variant)
    this.floorTextures.set(variant, t)
    return t
  }

  private buildFloorTexture(variant: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const r = (this.config.floorColor >> 16) & 255
    const g = (this.config.floorColor >> 8)  & 255
    const b =  this.config.floorColor        & 255

    if (variant === 'deep') {
      // Wet concrete / puddles
      ctx.fillStyle = `rgb(${r*0.5|0},${g*0.5|0},${b*0.5|0})`
      ctx.fillRect(0, 0, 512, 512)
      for (let i = 0; i < 6; i++) {
        const x = Math.random()*512, y = Math.random()*512, s = 30+Math.random()*80
        ctx.fillStyle = `rgba(0,0,0,0.3)`
        ctx.beginPath(); ctx.ellipse(x, y, s, s*0.4, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill()
      }
    } else if (variant === 'hex') {
      // Hexagonal tile
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, 512, 512)
      const hw = 36, hh = 42
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          const ox = col * hw * 1.5 + (row % 2) * hw * 0.75
          const oy = row * hh
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI/3)*i - Math.PI/6
            ctx[i===0?'moveTo':'lineTo'](ox + hw*Math.cos(angle), oy + hh*Math.sin(angle))
          }
          ctx.closePath(); ctx.stroke()
        }
      }
    } else {
      // Classic carpet tile
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, 512, 512)
      ctx.strokeStyle = `rgba(0,0,0,0.2)`; ctx.lineWidth = 3
      for (let x = 0; x <= 512; x += 64) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,512); ctx.stroke() }
      for (let y = 0; y <= 512; y += 64) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(512,y); ctx.stroke() }
      for (let i = 0; i < 8; i++) {
        const x = Math.random()*512, y = Math.random()*512, s = 30+Math.random()*80
        ctx.fillStyle = `rgba(50,30,20,${0.08+Math.random()*0.12})`
        ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI*2); ctx.fill()
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(4, 4)
    return tex
  }

  private getCeilingTexture(): THREE.CanvasTexture {
    if (this.ceilingTextures.has('default')) return this.ceilingTextures.get('default')!
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const r = (this.config.ceilingColor >> 16) & 255
    const g = (this.config.ceilingColor >> 8)  & 255
    const b =  this.config.ceilingColor        & 255
    ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = `rgba(0,0,0,0.28)`; ctx.lineWidth = 4
    for (let x = 0; x <= 512; x += 128) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,512); ctx.stroke() }
    for (let y = 0; y <= 512; y += 128) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(512,y); ctx.stroke() }
    ctx.fillStyle = `rgba(0,0,0,0.045)`
    for (let px = 0; px < 4; px++) for (let py = 0; py < 4; py++) {
      for (let i = 0; i < 120; i++) {
        const x = px*128+10+Math.random()*108, y = py*128+10+Math.random()*108
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill()
      }
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(110,90,60,${0.06+Math.random()*0.08})`
      ctx.beginPath(); ctx.ellipse(Math.random()*512, Math.random()*512, 40+Math.random()*100, 30+Math.random()*60, 0, 0, Math.PI*2); ctx.fill()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4)
    this.ceilingTextures.set('default', tex)
    return tex
  }

  // ───────────────────────── Material helpers ───────────────────

  private wallMat(variant = 'default'): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ map: this.getWallTexture(variant), side: THREE.DoubleSide })
  }
  private floorMat(variant = 'default'): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ map: this.getFloorTexture(variant) })
  }
  private ceilMat(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ map: this.getCeilingTexture() })
  }

  // ───────────────────────── Public API ────────────────────────

  updateConfig(config: GameModeConfig) {
    this.config = config
    this.wallTextures.clear(); this.floorTextures.clear(); this.ceilingTextures.clear()
    this.updateMaterials()
  }

  /**
   * Main generation entry point. Now also accepts playerY (floor index).
   * Generates a 3×3 ring of chunks in XZ and ±1 floor in Y.
   */
  generateChunk(playerX: number, playerY: number, playerZ: number) {
    const currentFloor = Math.round(playerY / FLOOR_STEP)
    const floorRange = 1  // generate 1 floor above and below current

    for (let dy = -floorRange; dy <= floorRange; dy++) {
      const floorY = currentFloor + dy
      if (floorY < -MAX_FLOORS_DOWN || floorY > MAX_FLOORS_UP) continue

      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = this.chunkKey(
            playerX + dx * this.chunkSize,
            floorY,
            playerZ + dz * this.chunkSize
          )
          if (!this.generatedChunks.has(key)) {
            this.createChunk(key)
            this.generatedChunks.add(key)
          }
        }
      }
    }
  }

  getColliders(): THREE.Mesh[] {
    const result: THREE.Mesh[] = []
    this.scene.traverse(o => {
      if (o instanceof THREE.Mesh && (o.userData.isCollider || o.userData.isGround || o.userData.isWall))
        result.push(o)
    })
    return result
  }

  updateLights(deltaTime: number) {
    this.flickerTime += deltaTime
    this.lights.forEach((ld, idx) => {
      if (this.config.lightFlicker) {
        const flicker = Math.sin(this.flickerTime*8+ld.flickerPhase) *
                        Math.sin(this.flickerTime*13+idx) *
                        Math.sin(this.flickerTime*3)
        const off = Math.sin(this.flickerTime*0.5+ld.flickerPhase*2)
        if (off > 0.7) {
          ld.light.intensity = 0
          if (ld.fixture.material instanceof THREE.MeshBasicMaterial) ld.fixture.material.opacity = 0.08
          ld.isOn = false
        } else {
          const intensity = this.config.lightIntensity * (0.7 + flicker*0.3 + Math.random()*0.1)
          ld.light.intensity = Math.max(0.15, intensity)
          if (ld.fixture.material instanceof THREE.MeshBasicMaterial)
            ld.fixture.material.opacity = 0.5 + Math.min(0.45, intensity/this.config.lightIntensity*0.45)
          ld.isOn = true
        }
      } else {
        ld.light.intensity = this.config.lightIntensity
        if (ld.fixture.material instanceof THREE.MeshBasicMaterial) ld.fixture.material.opacity = 0.95
      }
    })
  }

  // ───────────────────────── Chunk key ─────────────────────────

  private chunkKey(wx: number, floorY: number, wz: number): string {
    return `${Math.floor(wx/this.chunkSize)},${floorY},${Math.floor(wz/this.chunkSize)}`
  }

  // ───────────────────────── Chunk creation ────────────────────

  private createChunk(key: string) {
    const parts  = key.split(',')
    const chunkX = parseInt(parts[0]) * this.chunkSize
    const floorY = parseInt(parts[1])
    const chunkZ = parseInt(parts[2]) * this.chunkSize
    const worldY = floorY * FLOOR_STEP     // actual Y in world space
    const cx = parseInt(parts[0])
    const cz = parseInt(parts[2])

    const seed = hashXYZ(cx, floorY, cz)
    const rng  = mulberry32(seed)

    // Pick texture variants based on depth
    const absFloor    = Math.abs(floorY)
    const wallVariant  = absFloor >= 3 ? 'deep' : absFloor >= 1 ? 'ruins' : 'default'
    const floorVariant = absFloor >= 2 ? 'deep' : (absFloor === 1 ? 'hex' : 'default')

    // ── Slab floor & ceiling for this floor ───────────────────
    this.addFloorSlab(chunkX + this.chunkSize/2, worldY, chunkZ + this.chunkSize/2, this.chunkSize, floorVariant)
    this.addCeilingSlab(chunkX + this.chunkSize/2, worldY + WALL_HEIGHT, chunkZ + this.chunkSize/2, this.chunkSize)

    // ── Choose biome ──────────────────────────────────────────
    const biomeW  = getBiomeWeights(cx, floorY, cz)
    const biome   = sampleBiome(biomeW, rng)

    switch (biome) {
      case 'classicLabyrinth':   this.buildClassicLabyrinth(chunkX, worldY, chunkZ, rng, wallVariant); break
      case 'openPillarHall':     this.buildPillarHall(chunkX, worldY, chunkZ, rng, wallVariant);        break
      case 'narrowCorridors':    this.buildNarrowCorridors(chunkX, worldY, chunkZ, rng, wallVariant);   break
      case 'megaChamber':        this.buildMegaChamber(chunkX, worldY, chunkZ, rng, wallVariant);       break
      case 'fractalChamber':     this.buildFractalChamber(chunkX, worldY, chunkZ, rng, wallVariant);    break
      case 'hexagonalCells':     this.buildHexagonalCells(chunkX, worldY, chunkZ, rng, wallVariant);    break
      case 'brutalistGrid':      this.buildBrutalistGrid(chunkX, worldY, chunkZ, rng, wallVariant);     break
      case 'decayedRuin':        this.buildDecayedRuin(chunkX, worldY, chunkZ, rng, wallVariant);       break
    }

    // ── Furniture ─────────────────────────────────────────────
    const furWeights = getFurnitureWeights(cx, floorY, cz)
    const furnitureDensity = clamp(
      0.1 + valueNoise2D(cx*0.2, cz*0.2, 99) * 0.6 - Math.abs(floorY) * 0.05,
      0.05, 0.7
    )
    const maxFurniturePieces = Math.floor(4 + furnitureDensity * 10)
    for (let i = 0; i < maxFurniturePieces; i++) {
      if (rng() > furnitureDensity) continue
      const fx = chunkX + 2 + rng() * (this.chunkSize - 4)
      const fz = chunkZ + 2 + rng() * (this.chunkSize - 4)
      const rot = rng() * Math.PI * 2
      const furType = sampleFurniture(furWeights, rng)
      this.placeFurniture(furType, fx, worldY, fz, rot)
    }

    // ── Lights ────────────────────────────────────────────────
    for (let lx = LIGHT_SPACING/2; lx < this.chunkSize; lx += LIGHT_SPACING) {
      for (let lz = LIGHT_SPACING/2; lz < this.chunkSize; lz += LIGHT_SPACING) {
        if (rng() > 0.75 && this.lights.length < this.maxLights) {
          this.addLight(chunkX+lx, worldY+WALL_HEIGHT-0.1, chunkZ+lz)
        }
      }
    }

    // ── Stairwells / shafts connecting floors ─────────────────
    // Place a vertical shaft at a chunk-specific position so
    // adjacent floors align.  Mark as collider-free opening.
    if (rng() > 0.4) {
      this.buildStairwell(chunkX, worldY, chunkZ, rng, wallVariant)
    }
  }

  // ───────────────────────── Biome builders ────────────────────

  /** Classic yellow maze — densely walled */
  private buildClassicLabyrinth(ox: number, oy: number, oz: number,
                                 rng: () => number, wv: string) {
    for (let x = ROOM_SIZE; x < this.chunkSize; x += ROOM_SIZE) {
      for (let z = 0; z < this.chunkSize; z += ROOM_SIZE) {
        if (rng() > 0.28) this.addWall(ox+x,       oy, oz+z+ROOM_SIZE/2, 0.4,  ROOM_SIZE, WALL_HEIGHT, true,  wv)
        if (rng() > 0.45) this.addWall(ox+x-ROOM_SIZE/2, oy, oz+z, ROOM_SIZE, 0.4, WALL_HEIGHT, false, wv)
      }
    }
    // occasional half-height partitions
    for (let i = 0; i < 5; i++) {
      if (rng() > 0.5) {
        const px = ox + 4 + rng()*(this.chunkSize-8)
        const pz = oz + 4 + rng()*(this.chunkSize-8)
        this.addWall(px, oy, pz, 4+rng()*8, 0.3, WALL_HEIGHT*0.55, rng()>0.5, wv)
      }
    }
  }

  /** Vast open hall with columns, maybe a mezzanine */
  private buildPillarHall(ox: number, oy: number, oz: number,
                           rng: () => number, wv: string) {
    for (let x = ROOM_SIZE/2; x < this.chunkSize; x += ROOM_SIZE) {
      for (let z = ROOM_SIZE/2; z < this.chunkSize; z += ROOM_SIZE) {
        if (rng() > 0.35) this.addColumn(ox+x, oy, oz+z, WALL_HEIGHT, wv)
      }
    }
    // Mezzanine platform on one quarter
    if (rng() > 0.4) {
      const half = this.chunkSize/2
      this.addFloorSlab(ox+half*1.5, oy+WALL_HEIGHT*0.6, oz+half*0.5, half)
      // barrier railing
      this.addWall(ox+half, oy+WALL_HEIGHT*0.6, oz+half/2, half, 0.2, 1.1, false, wv)
      this.addWall(ox+half*1.5, oy+WALL_HEIGHT*0.6, oz, half, 0.2, 1.1, true, wv)
    }
  }

  /** Long thin corridors — maze of passages */
  private buildNarrowCorridors(ox: number, oy: number, oz: number,
                                rng: () => number, wv: string) {
    const step = CORRIDOR_WIDTH + 1.5
    for (let z = step; z < this.chunkSize; z += step) {
      // Full divider wall with one doorway cut
      const doorAt = (rng() * (this.chunkSize - 6) + 3)
      // Left segment
      if (doorAt > 4)
        this.addWall(ox, oy, oz+z, doorAt-1, 0.35, WALL_HEIGHT, false, wv)
      // Right segment
      const rightStart = doorAt + 5
      if (rightStart < this.chunkSize - 4)
        this.addWall(ox+rightStart, oy, oz+z, this.chunkSize-rightStart, 0.35, WALL_HEIGHT, false, wv)
    }
  }

  /** Single massive chamber with high ceiling */
  private buildMegaChamber(ox: number, oy: number, oz: number,
                            rng: () => number, wv: string) {
    // Outer ring walls (open interior)
    const rim = 3
    // Four border walls with random doorways
    this.addWall(ox+rim, oy, oz+this.chunkSize/2, 0.4, this.chunkSize-rim*2, WALL_HEIGHT*1.5, true, wv)
    this.addWall(ox+this.chunkSize-rim, oy, oz+this.chunkSize/2, 0.4, this.chunkSize-rim*2, WALL_HEIGHT*1.5, true, wv)
    this.addWall(ox+this.chunkSize/2, oy, oz+rim, this.chunkSize-rim*2, 0.4, WALL_HEIGHT*1.5, false, wv)
    this.addWall(ox+this.chunkSize/2, oy, oz+this.chunkSize-rim, this.chunkSize-rim*2, 0.4, WALL_HEIGHT*1.5, false, wv)
    // Raised ceiling in centre
    this.addCeilingSlab(ox+this.chunkSize/2, oy+WALL_HEIGHT*1.5, oz+this.chunkSize/2, this.chunkSize-rim*2)
    // Cluster of columns near walls
    for (let i = 0; i < 8; i++) {
      const angle = (i/8)*Math.PI*2
      const r = this.chunkSize*0.35
      this.addColumn(ox+this.chunkSize/2+Math.cos(angle)*r, oy, oz+this.chunkSize/2+Math.sin(angle)*r, WALL_HEIGHT*1.5, wv)
    }
  }

  /** Menger-sponge inspired fractal geometry */
  private buildFractalChamber(ox: number, oy: number, oz: number,
                               rng: () => number, wv: string) {
    const size = 12
    const cx = ox + this.chunkSize/2
    const cy = oy + WALL_HEIGHT/2
    const cz = oz + this.chunkSize/2
    const points = mengerPoints(0, 0, 0, size, 2)  // depth 2 = 20 boxes
    for (const p of points) {
      const s3 = size / 9  // leaf size at depth 2
      // Only place boxes that are somewhat above floor
      if (p.y + cy < oy + 0.1) continue
      const mat = this.wallMat(wv)
      const geo = new THREE.BoxGeometry(s3*0.92, s3*0.92, s3*0.92)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(cx+p.x, cy+p.y, cz+p.z)
      mesh.userData.type = 'wall'; mesh.userData.isCollider = true; mesh.userData.isWall = true
      this.scene.add(mesh)
    }
    // A couple of full columns
    if (rng() > 0.3) this.addColumn(cx-8, oy, cz-8, WALL_HEIGHT, wv)
    if (rng() > 0.3) this.addColumn(cx+8, oy, cz+8, WALL_HEIGHT, wv)
  }

  /** Honeycomb / hexagonal cell rooms */
  private buildHexagonalCells(ox: number, oy: number, oz: number,
                               rng: () => number, wv: string) {
    // Approximate hex grid with thin walls angled at 60°
    const rad = 7, row_h = rad * Math.sqrt(3)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const hx = ox + col * rad * 1.8 + (row%2) * rad * 0.9 + 4
        const hz = oz + row * row_h * 0.95 + 4
        // Skip doorway on one side
        const skipSide = Math.floor(rng()*6)
        for (let side = 0; side < 6; side++) {
          if (side === skipSide) continue
          const a1 = (Math.PI/3)*side, a2 = (Math.PI/3)*(side+1)
          const x1 = hx + rad*Math.cos(a1), z1 = hz + rad*Math.sin(a1)
          const x2 = hx + rad*Math.cos(a2), z2 = hz + rad*Math.sin(a2)
          const mx = (x1+x2)/2, mz = (z1+z2)/2
          const len = Math.hypot(x2-x1, z2-z1)
          const angle = Math.atan2(z2-z1, x2-x1)
          const geo = new THREE.BoxGeometry(len, WALL_HEIGHT, 0.3)
          const mesh = new THREE.Mesh(geo, this.wallMat(wv))
          mesh.position.set(mx, oy+WALL_HEIGHT/2, mz)
          mesh.rotation.y = -angle
          mesh.userData.type='wall'; mesh.userData.isCollider=true; mesh.userData.isWall=true
          this.scene.add(mesh)
        }
      }
    }
  }

  /** Cold brutalist grid — slabs, ledges, angular cuts */
  private buildBrutalistGrid(ox: number, oy: number, oz: number,
                              rng: () => number, wv: string) {
    const cell = this.chunkSize / 4
    for (let ix = 0; ix < 4; ix++) {
      for (let iz = 0; iz < 4; iz++) {
        const x = ox + ix * cell, z = oz + iz * cell
        const h = rng() > 0.5 ? WALL_HEIGHT : WALL_HEIGHT * (0.4 + rng()*0.5)
        // Vertical slabs on grid edges (random)
        if (rng() > 0.55) this.addWall(x+cell/2, oy, z, cell, 0.45, h, false, wv)
        if (rng() > 0.55) this.addWall(x, oy, z+cell/2, 0.45, cell, h, true,  wv)
        // Elevated platform slabs
        if (rng() > 0.75) {
          const ph = oy + WALL_HEIGHT*(0.3+rng()*0.4)
          this.addFloorSlab(x+cell/2, ph, z+cell/2, cell*0.8)
        }
      }
    }
  }

  /** Crumbling decay — partial walls, rubble clusters */
  private buildDecayedRuin(ox: number, oy: number, oz: number,
                            rng: () => number, wv: string) {
    for (let i = 0; i < 20; i++) {
      const rx = ox + 2 + rng()*(this.chunkSize-4)
      const rz = oz + 2 + rng()*(this.chunkSize-4)
      const h  = WALL_HEIGHT * (0.2 + rng()*0.8)
      const w  = 1.5 + rng() * 8
      const rot = rng() > 0.5
      // Partial (collapsed) height walls
      this.addWall(rx, oy, rz, w, 0.5, h, rot, wv)
    }
    // Rubble heaps (stacked short boxes)
    for (let i = 0; i < 6; i++) {
      if (rng() > 0.5) {
        const rx = ox + 4 + rng()*(this.chunkSize-8)
        const rz = oz + 4 + rng()*(this.chunkSize-8)
        for (let j = 0; j < 3+Math.floor(rng()*4); j++) {
          const bsize = 0.5 + rng()*1.2
          const geo = new THREE.BoxGeometry(bsize, bsize, bsize)
          const mesh = new THREE.Mesh(geo, this.wallMat(wv))
          mesh.position.set(rx+(rng()-0.5)*2, oy+bsize/2+j*bsize*0.7, rz+(rng()-0.5)*2)
          mesh.rotation.set(rng()*0.4, rng()*Math.PI, rng()*0.4)
          mesh.userData.type='wall'; mesh.userData.isCollider=true; mesh.userData.isWall=true
          this.scene.add(mesh)
        }
      }
    }
  }

  // ───────────────────────── Stairwells ────────────────────────

  private buildStairwell(ox: number, oy: number, oz: number,
                          rng: () => number, wv: string) {
    // Fixed local offset so the shaft aligns across floor chunks
    const sx = ox + 4 + Math.floor(rng() * (this.chunkSize/4)) * 4
    const sz = oz + 4 + Math.floor(rng() * (this.chunkSize/4)) * 4
    const shaftW = 5, shaftD = 8

    // Shaft walls
    this.addWall(sx + shaftW/2, oy, sz, shaftW, 0.3, WALL_HEIGHT, false, wv)
    this.addWall(sx + shaftW/2, oy, sz + shaftD, shaftW, 0.3, WALL_HEIGHT, false, wv)
    this.addWall(sx, oy, sz + shaftD/2, 0.3, shaftD, WALL_HEIGHT, true, wv)
    this.addWall(sx + shaftW, oy, sz + shaftD/2, 0.3, shaftD, WALL_HEIGHT, true, wv)

    // Stair steps inside shaft
    const steps = 8
    const stepH = WALL_HEIGHT / steps
    for (let i = 0; i < steps; i++) {
      const stepY = oy + i * stepH
      const stepZ = sz + (i / steps) * shaftD
      const geo = new THREE.BoxGeometry(shaftW - 0.6, stepH, shaftD/steps)
      const mesh = new THREE.Mesh(geo, this.floorMat('default'))
      mesh.position.set(sx+shaftW/2, stepY+stepH/2, stepZ)
      mesh.userData.type='floor'; mesh.userData.isCollider=true; mesh.userData.isGround=true
      this.scene.add(mesh)
    }
  }

  // ───────────────────────── Furniture ────────────────────────

  private placeFurniture(type: keyof FurnitureWeights,
                         x: number, oy: number, z: number, rot: number) {
    switch (type) {
      case 'chair':       this.addChair(x, oy, z, rot);        break
      case 'table':       this.addTable(x, oy, z, rot);        break
      case 'photoFrame':  this.addPhotoFrame(x, oy, z, rot);   break
      case 'bookshelf':   this.addBookshelf(x, oy, z, rot);    break
      case 'fileCabinet': this.addFileCabinet(x, oy, z, rot);  break
      case 'brokenDesk':  this.addBrokenDesk(x, oy, z, rot);   break
      case 'standingLamp':this.addStandingLamp(x, oy, z);      break
    }
  }

  private addChair(x: number, oy: number, z: number, rot: number) {
    const group = new THREE.Group()
    const legMat = new THREE.MeshLambertMaterial({ color: 0x3a2810 })
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 })
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), seatMat)
    seat.position.set(0, 0.52, 0); group.add(seat)
    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.06), seatMat)
    back.position.set(0, 1.0, -0.42); group.add(back)
    // Legs
    for (const [lx, lz] of [[-0.38,-0.38],[-0.38,0.38],[0.38,-0.38],[0.38,0.38]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.07), legMat)
      leg.position.set(lx, 0.26, lz); group.add(leg)
    }
    group.rotation.y = rot
    group.position.set(x, oy, z)
    this.scene.add(group)
  }

  private addTable(x: number, oy: number, z: number, rot: number) {
    const group = new THREE.Group()
    const wood = new THREE.MeshLambertMaterial({ color: 0x7a5230 })
    const leg  = new THREE.MeshLambertMaterial({ color: 0x4a3010 })
    // Top
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.9), wood)
    top.position.set(0, 0.78, 0); group.add(top)
    // Legs
    for (const [lx, lz] of [[-0.8,-0.38],[-0.8,0.38],[0.8,-0.38],[0.8,0.38]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.78, 0.07), leg)
      l.position.set(lx, 0.39, lz); group.add(l)
    }
    group.rotation.y = rot; group.position.set(x, oy, z)
    this.scene.add(group)
  }

  private addPhotoFrame(x: number, oy: number, z: number, rot: number) {
    // Lean against nearest wall proxy: just stand it slightly off floor
    const group = new THREE.Group()
    const frame = new THREE.MeshLambertMaterial({ color: 0x2a1a0a })
    const inner = new THREE.MeshLambertMaterial({ color: 0xddcc99 })
    // Outer frame box
    const outer = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.05), frame)
    outer.position.set(0, 0, 0); group.add(outer)
    // Inner picture
    const pic = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.66, 0.06), inner)
    pic.position.set(0, 0, 0); group.add(pic)
    group.rotation.y = rot
    group.position.set(x, oy + 0.95, z)
    this.scene.add(group)
  }

  private addBookshelf(x: number, oy: number, z: number, rot: number) {
    const group = new THREE.Group()
    const shelvesMat = new THREE.MeshLambertMaterial({ color: 0x6b4820 })
    // Main case
    const cas = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.35), shelvesMat)
    cas.position.set(0, 1.0, 0); group.add(cas)
    // Books (random colour slabs)
    const bookColors = [0xcc2222, 0x228822, 0x222288, 0xcc8822, 0x882288]
    for (let shelf = 0; shelf < 4; shelf++) {
      let bx = -0.45
      while (bx < 0.45) {
        const bw = 0.06 + Math.random() * 0.08
        const bh = 0.22 + Math.random() * 0.1
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(bw, bh, 0.27),
          new THREE.MeshLambertMaterial({ color: bookColors[Math.floor(Math.random()*bookColors.length)] })
        )
        book.position.set(bx + bw/2, 0.3 + shelf*0.48, 0)
        group.add(book)
        bx += bw + 0.005
      }
    }
    group.rotation.y = rot; group.position.set(x, oy, z)
    this.scene.add(group)
  }

  private addFileCabinet(x: number, oy: number, z: number, rot: number) {
    const group = new THREE.Group()
    const mat = new THREE.MeshLambertMaterial({ color: 0x888070 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3, 0.65), mat)
    body.position.set(0, 0.65, 0); group.add(body)
    // Drawer lines
    const drawer = new THREE.MeshLambertMaterial({ color: 0x666055 })
    for (let d = 0; d < 3; d++) {
      const dr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.03), drawer)
      dr.position.set(0, 0.2+d*0.37, 0.34); group.add(dr)
      // Handle
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.04), new THREE.MeshLambertMaterial({color:0xaaa090}))
      handle.position.set(0, 0.2+d*0.37, 0.37); group.add(handle)
    }
    group.rotation.y = rot; group.position.set(x, oy, z)
    this.scene.add(group)
  }

  private addBrokenDesk(x: number, oy: number, z: number, rot: number) {
    const group = new THREE.Group()
    const wood = new THREE.MeshLambertMaterial({ color: 0x5a4020 })
    // Tilted top
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.8), wood)
    top.position.set(0, 0.65, 0); top.rotation.z = 0.3; group.add(top)
    // Only 3 legs (one broken)
    for (const [lx, lz, h] of [[-0.7,-0.35,0.65],[-0.7,0.35,0.65],[0.7,-0.35,0.65],[0.7,0.35,0.25]]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, h as number, 0.07), wood)
      l.position.set(lx, (h as number)/2, lz); group.add(l)
    }
    group.rotation.y = rot; group.position.set(x, oy, z)
    this.scene.add(group)
  }

  private addStandingLamp(x: number, oy: number, z: number) {
    const group = new THREE.Group()
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 1.8, 8),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    )
    pole.position.set(0, 0.9, 0); group.add(pole)
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.4, 12, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xeedd99, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    )
    shade.position.set(0, 1.85, 0); shade.rotation.x = Math.PI; group.add(shade)
    // Ambient light point
    if (this.lights.length < this.maxLights) {
      const pl = new THREE.PointLight(0xffeebb, 0.6, 12)
      pl.position.set(x, oy+1.85, z)
      this.scene.add(pl)
      const fixture = pole  // track as fixture proxy
      this.lights.push({ light: pl, fixture, isOn: true, flickerPhase: Math.random()*Math.PI*2 })
    }
    group.position.set(x, oy, z)
    this.scene.add(group)
  }

  // ───────────────────────── Primitive helpers ─────────────────

  private addWall(x: number, y: number, z: number,
                  width: number, depth: number, height: number,
                  isVertical: boolean, variant: string) {
    const geo = isVertical
      ? new THREE.BoxGeometry(depth, height, width)
      : new THREE.BoxGeometry(width, height, depth)
    const mesh = new THREE.Mesh(geo, this.wallMat(variant))
    mesh.position.set(
      isVertical ? x + depth/2   : x + width/2,
      y + height/2,
      isVertical ? z + width/2   : z + depth/2
    )
    mesh.userData.type='wall'; mesh.userData.isCollider=true; mesh.userData.isWall=true
    this.scene.add(mesh)
  }

  private addColumn(x: number, y: number, z: number,
                    height: number, variant: string) {
    const geo = new THREE.BoxGeometry(0.8, height, 0.8)
    const mesh = new THREE.Mesh(geo, this.wallMat(variant))
    mesh.position.set(x, y + height/2, z)
    mesh.userData.type='wall'; mesh.userData.isCollider=true; mesh.userData.isWall=true
    this.scene.add(mesh)
  }

  private addFloorSlab(cx: number, y: number, cz: number, size: number, variant = 'default') {
    const geo = new THREE.PlaneGeometry(size, size)
    const mesh = new THREE.Mesh(geo, this.floorMat(variant))
    mesh.rotation.x = -Math.PI/2
    mesh.position.set(cx, y, cz)
    mesh.userData.type='floor'; mesh.userData.isCollider=true; mesh.userData.isGround=true
    this.scene.add(mesh)
  }

  private addCeilingSlab(cx: number, y: number, cz: number, size: number) {
    const geo = new THREE.PlaneGeometry(size, size)
    const mesh = new THREE.Mesh(geo, this.ceilMat())
    mesh.rotation.x = Math.PI/2
    mesh.position.set(cx, y, cz)
    mesh.userData.type='ceiling'
    this.scene.add(mesh)
  }

  private addLight(x: number, y: number, z: number) {
    const fixGeo = new THREE.BoxGeometry(2.5, 0.15, 0.5)
    const fixMat = new THREE.MeshBasicMaterial({
      color: this.config.lightColor, transparent: true, opacity: 0.95
    })
    const fixture = new THREE.Mesh(fixGeo, fixMat)
    fixture.position.set(x, y - 0.08, z)
    this.scene.add(fixture)

    const light = new THREE.PointLight(this.config.lightColor, this.config.lightIntensity, 50)
    light.position.set(x, y - 0.4, z)
    this.scene.add(light)

    this.lights.push({ light, fixture, isOn: true, flickerPhase: Math.random()*Math.PI*2 })
  }

  // ───────────────────────── Material refresh ──────────────────

  private updateMaterials() {
    this.scene.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return
      const mat = o.material as THREE.MeshLambertMaterial
      if (!mat.map) return
      if (o.userData.type === 'wall') {
        mat.map = this.getWallTexture('default'); mat.needsUpdate = true
      } else if (o.userData.type === 'floor') {
        mat.map = this.getFloorTexture('default'); mat.needsUpdate = true
      } else if (o.userData.type === 'ceiling') {
        mat.map = this.getCeilingTexture(); mat.needsUpdate = true
      }
    })
    this.lights.forEach(({ light, fixture }) => {
      light.color.setHex(this.config.lightColor)
      light.intensity = this.config.lightIntensity
      if (fixture.material instanceof THREE.MeshBasicMaterial)
        fixture.material.color.setHex(this.config.lightColor)
    })
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(this.config.fogColor)
      this.scene.fog.near = this.config.fogNear
      this.scene.fog.far  = this.config.fogFar
    }
  }
}
