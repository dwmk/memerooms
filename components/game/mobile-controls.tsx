'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface JoystickProps {
  onMove: (x: number, y: number, active: boolean) => void
  size?: number
}

export function VirtualJoystick({ onMove, size = 120 }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const touchId = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })

  const handleStart = useCallback((clientX: number, clientY: number, id: number) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
    
    touchId.current = id
    setIsActive(true)
    
    const x = (clientX - centerRef.current.x) / (size / 2)
    const y = (clientY - centerRef.current.y) / (size / 2)
    const clampedX = Math.max(-1, Math.min(1, x))
    const clampedY = Math.max(-1, Math.min(1, y))
    
    setPosition({ x: clampedX * (size / 2 - 20), y: clampedY * (size / 2 - 20) })
    onMove(clampedX, clampedY, true)
  }, [onMove, size])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isActive) return
    
    const x = (clientX - centerRef.current.x) / (size / 2)
    const y = (clientY - centerRef.current.y) / (size / 2)
    
    const length = Math.sqrt(x * x + y * y)
    const clampedLength = Math.min(1, length)
    const normalizedX = length > 0 ? (x / length) * clampedLength : 0
    const normalizedY = length > 0 ? (y / length) * clampedLength : 0
    
    setPosition({ 
      x: normalizedX * (size / 2 - 20), 
      y: normalizedY * (size / 2 - 20) 
    })
    onMove(normalizedX, normalizedY, true)
  }, [isActive, onMove, size])

  const handleEnd = useCallback(() => {
    setIsActive(false)
    setPosition({ x: 0, y: 0 })
    touchId.current = null
    onMove(0, 0, false)
  }, [onMove])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY, touch.identifier)
  }, [handleStart])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === touchId.current) {
        handleMove(e.touches[i].clientX, e.touches[i].clientY)
        break
      }
    }
  }, [handleMove])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId.current) {
        handleEnd()
        break
      }
    }
  }, [handleEnd])

  return (
    <div
      ref={containerRef}
      className="relative rounded-full bg-white/10 backdrop-blur-md border border-white/20"
      style={{ width: size, height: size }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="absolute rounded-full bg-white/30 backdrop-blur transition-transform duration-75"
        style={{
          width: 40,
          height: 40,
          left: size / 2 - 20,
          top: size / 2 - 20,
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      />
    </div>
  )
}

interface JumpButtonProps {
  onJump: (pressed: boolean) => void
  size?: number
}

export function JumpButton({ onJump, size = 80 }: JumpButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handlePress = () => {
    setIsPressed(true)
    onJump(true)
  }

  const handleRelease = () => {
    setIsPressed(false)
    onJump(false)
  }

  return (
    <button
      className={`rounded-full flex items-center justify-center transition-all duration-100 select-none ${
        isPressed 
          ? 'bg-white/40 scale-95' 
          : 'bg-white/20 backdrop-blur-md border border-white/30'
      }`}
      style={{ width: size, height: size }}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      onTouchCancel={handleRelease}
    >
      <span className="text-white text-lg font-bold">JUMP</span>
    </button>
  )
}

interface MobileControlsProps {
  onJoystickMove: (x: number, y: number, active: boolean) => void
  onJump: (pressed: boolean) => void
}

export function MobileControls({ onJoystickMove, onJump }: MobileControlsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-between items-end pointer-events-none z-50">
      <div className="pointer-events-auto">
        <VirtualJoystick onMove={onJoystickMove} />
      </div>
      <div className="pointer-events-auto">
        <JumpButton onJump={onJump} />
      </div>
    </div>
  )
}

export function RotateDeviceModal() {
  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-lg flex items-center justify-center z-[100]">
      <div className="text-center p-8 max-w-md">
        <div className="text-6xl mb-6 animate-bounce">📱</div>
        <h2 className="text-2xl font-bold text-white mb-4">Rotate Your Device</h2>
        <p className="text-gray-400 mb-6">
          Please rotate your device to landscape mode for the best gaming experience.
        </p>
        <div className="flex justify-center">
          <div className="w-20 h-12 border-2 border-white/50 rounded-lg relative animate-pulse">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 text-xs">
              ↻
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth)
    }

    checkMobile()
    checkOrientation()

    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  return { isMobile, isPortrait }
}
