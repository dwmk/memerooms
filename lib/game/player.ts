import * as THREE from 'three'
import { PlayerState, DEFAULT_PLAYER_STATE } from './types'

// Physics constants
const GRAVITY = 25
const JUMP_FORCE = 10
const MOVE_SPEED = 8
const FRICTION = 0.85
const AIR_CONTROL = 0.3
const MAX_VELOCITY = 30
const BHOP_WINDOW = 0.15 // seconds to press jump after landing for bhop
const BHOP_BOOST = 1.1 // velocity multiplier on successful bhop

export class PlayerController {
  private state: PlayerState
  private keys: Set<string> = new Set()
  private mouseLocked = false
  private sensitivity = 0.002
  private camera: THREE.PerspectiveCamera
  private colliders: THREE.Mesh[] = []
  private lastJumpTime = 0
  private landingTime = 0
  private canBhop = false

  // Mobile controls
  private joystickActive = false
  private joystickX = 0
  private joystickY = 0
  private mobileJumpPressed = false

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    this.state = { ...DEFAULT_PLAYER_STATE }
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', this.onKeyDown.bind(this))
    window.addEventListener('keyup', this.onKeyUp.bind(this))
    
    // Mouse
    document.addEventListener('mousemove', this.onMouseMove.bind(this))
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this))
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code.toLowerCase())
    
    if (e.code === 'Space') {
      this.tryJump()
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code.toLowerCase())
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.mouseLocked) return

    this.state.rotation.y -= e.movementX * this.sensitivity
    this.state.rotation.x -= e.movementY * this.sensitivity
    
    // Clamp vertical rotation
    this.state.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.state.rotation.x))
  }

  private onPointerLockChange() {
    this.mouseLocked = document.pointerLockElement !== null
  }

  requestPointerLock() {
    document.body.requestPointerLock()
  }

  exitPointerLock() {
    document.exitPointerLock()
    this.mouseLocked = false
  }

  setColliders(colliders: THREE.Mesh[]) {
    this.colliders = colliders
  }

  // Mobile joystick input
  setJoystickInput(x: number, y: number, active: boolean) {
    this.joystickX = x
    this.joystickY = y
    this.joystickActive = active
  }

  setMobileJump(pressed: boolean) {
    if (pressed && !this.mobileJumpPressed) {
      this.tryJump()
    }
    this.mobileJumpPressed = pressed
  }

  private tryJump() {
    const currentTime = performance.now() / 1000
    
    if (this.state.isGrounded) {
      // Check for bhop window
      if (currentTime - this.landingTime < BHOP_WINDOW && this.canBhop) {
        // Successful bhop!
        this.state.bhopMultiplier = Math.min(this.state.bhopMultiplier * BHOP_BOOST, 2.0)
        this.state.isBhopping = true
      } else {
        this.state.bhopMultiplier = 1
        this.state.isBhopping = false
      }
      
      this.state.velocity.y = JUMP_FORCE
      this.state.isGrounded = false
      this.lastJumpTime = currentTime
      this.canBhop = true
    }
  }

  update(deltaTime: number, currentTime: number): PlayerState {
    // Movement input
    let inputX = 0
    let inputZ = 0

    // Keyboard input
    if (this.keys.has('keyw') || this.keys.has('arrowup')) inputZ -= 1
    if (this.keys.has('keys') || this.keys.has('arrowdown')) inputZ += 1
    if (this.keys.has('keya') || this.keys.has('arrowleft')) inputX -= 1
    if (this.keys.has('keyd') || this.keys.has('arrowright')) inputX += 1

    // Mobile joystick input
    if (this.joystickActive) {
      inputX = this.joystickX
      inputZ = -this.joystickY
    }

    // Normalize input
    const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ)
    if (inputLength > 1) {
      inputX /= inputLength
      inputZ /= inputLength
    }

    // Calculate movement direction based on camera rotation
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation.y)
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.state.rotation.y)

    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(forward, -inputZ)
    moveDir.addScaledVector(right, inputX)

    // Apply movement with bhop boost
    const effectiveSpeed = MOVE_SPEED * this.state.bhopMultiplier
    const control = this.state.isGrounded ? 1 : AIR_CONTROL

    if (moveDir.length() > 0) {
      this.state.velocity.x += moveDir.x * effectiveSpeed * control * deltaTime * 10
      this.state.velocity.z += moveDir.z * effectiveSpeed * control * deltaTime * 10
    }

    // Apply friction
    if (this.state.isGrounded) {
      this.state.velocity.x *= FRICTION
      this.state.velocity.z *= FRICTION
    } else {
      this.state.velocity.x *= 0.99
      this.state.velocity.z *= 0.99
    }

    // Apply gravity
    this.state.velocity.y -= GRAVITY * deltaTime

    // Clamp velocity
    const horizontalVel = Math.sqrt(this.state.velocity.x ** 2 + this.state.velocity.z ** 2)
    if (horizontalVel > MAX_VELOCITY) {
      const scale = MAX_VELOCITY / horizontalVel
      this.state.velocity.x *= scale
      this.state.velocity.z *= scale
    }

    // Apply velocity to position
    const newPosition = {
      x: this.state.position.x + this.state.velocity.x * deltaTime,
      y: this.state.position.y + this.state.velocity.y * deltaTime,
      z: this.state.position.z + this.state.velocity.z * deltaTime
    }

    // Collision detection with walls
    const playerRadius = 0.5
    const playerHeight = 1.7
    
    for (const collider of this.colliders) {
      const box = new THREE.Box3().setFromObject(collider)
      
      // Expand box by player radius for collision
      box.expandByScalar(playerRadius)
      
      const playerPos = new THREE.Vector3(newPosition.x, newPosition.y, newPosition.z)
      
      if (box.containsPoint(playerPos)) {
        // Find closest point on box and push player out
        const closestPoint = new THREE.Vector3()
        box.clampPoint(playerPos, closestPoint)
        
        const pushDir = playerPos.clone().sub(closestPoint).normalize()
        
        if (Math.abs(pushDir.x) > Math.abs(pushDir.z)) {
          newPosition.x = this.state.position.x
          this.state.velocity.x = 0
        } else {
          newPosition.z = this.state.position.z
          this.state.velocity.z = 0
        }
      }
    }

    // Ground collision
    if (newPosition.y < playerHeight) {
      newPosition.y = playerHeight
      
      if (!this.state.isGrounded) {
        this.landingTime = currentTime
      }
      
      this.state.isGrounded = true
      this.state.velocity.y = 0
      
      // Decay bhop multiplier when on ground
      if (!this.state.isBhopping) {
        this.state.bhopMultiplier = Math.max(1, this.state.bhopMultiplier * 0.95)
      }
    } else {
      this.state.isGrounded = false
    }

    this.state.position = newPosition

    // Update camera
    this.camera.position.set(
      this.state.position.x,
      this.state.position.y,
      this.state.position.z
    )
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.state.rotation.y
    this.camera.rotation.x = this.state.rotation.x

    return { ...this.state }
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.state.position.x,
      this.state.position.y,
      this.state.position.z
    )
  }

  getState(): PlayerState {
    return { ...this.state }
  }

  reset() {
    this.state = { ...DEFAULT_PLAYER_STATE }
    this.state.bhopMultiplier = 1
    this.state.isBhopping = false
    this.keys.clear()
  }

  takeDamage(amount: number) {
    this.state.health = Math.max(0, this.state.health - amount)
  }

  isAlive(): boolean {
    return this.state.health > 0
  }

  cleanup() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this))
    window.removeEventListener('keyup', this.onKeyUp.bind(this))
    document.removeEventListener('mousemove', this.onMouseMove.bind(this))
    document.removeEventListener('pointerlockchange', this.onPointerLockChange.bind(this))
  }
}
