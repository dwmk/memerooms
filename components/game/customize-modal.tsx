'use client'

import { useState, useRef, useCallback } from 'react'
import { GameMode, GAME_MODE_CONFIGS, CustomEntitySettings, DEFAULT_CUSTOM_ENTITY_SETTINGS } from '@/lib/game/types'
import { saveCustomSettings, saveCustomTextures } from '@/lib/game/storage'
import { X, Upload, Trash2, RotateCcw, Gauge, Eye, Zap } from 'lucide-react'
import { Slider } from '@/components/ui/slider'

interface CustomizeModalProps {
  isOpen: boolean
  onClose: () => void
  mode: GameMode
  customTextures: string[]
  onTexturesChange: (textures: string[]) => void
  customSettings: CustomEntitySettings
  onSettingsChange: (settings: CustomEntitySettings) => void
}

export function CustomizeModal({ 
  isOpen, 
  onClose, 
  mode,
  customTextures,
  onTexturesChange,
  customSettings,
  onSettingsChange
}: CustomizeModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const config = GAME_MODE_CONFIGS[mode]

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    )
    
    if (files.length > 0) {
      const newTextures: string[] = []
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = () => {
          newTextures.push(reader.result as string)
          if (newTextures.length === files.length) {
            const updated = [...customTextures, ...newTextures]
            onTexturesChange(updated)
            saveCustomTextures(updated)
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }, [customTextures, onTexturesChange])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newTextures: string[] = []
      files.forEach(file => {
        const reader = new FileReader()
        reader.onload = () => {
          newTextures.push(reader.result as string)
          if (newTextures.length === files.length) {
            const updated = [...customTextures, ...newTextures]
            onTexturesChange(updated)
            saveCustomTextures(updated)
          }
        }
        reader.readAsDataURL(file)
      })
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [customTextures, onTexturesChange])

  const removeTexture = (index: number) => {
    const newTextures = [...customTextures]
    newTextures.splice(index, 1)
    onTexturesChange(newTextures)
    saveCustomTextures(newTextures)
  }

  const clearAllTextures = () => {
    onTexturesChange([])
    saveCustomTextures([])
  }

  const updateSetting = <K extends keyof CustomEntitySettings>(
    key: K, 
    value: CustomEntitySettings[K]
  ) => {
    const updated = { ...customSettings, [key]: value }
    onSettingsChange(updated)
    saveCustomSettings(updated)
  }

  const resetToDefaults = () => {
    onSettingsChange({ ...DEFAULT_CUSTOM_ENTITY_SETTINGS })
    saveCustomSettings({ ...DEFAULT_CUSTOM_ENTITY_SETTINGS })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="p-6 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: config.uiSecondaryColor, fontFamily: config.fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 
            className="text-2xl font-bold"
            style={{ color: config.uiAccentColor }}
          >
            Customize Nextbots
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content - 60/40 Split */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Side - Drag & Drop (60%) */}
          <div className="md:w-[60%]">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" style={{ color: config.uiAccentColor }} />
              Custom Images
            </h3>
            
            {/* Drop Zone */}
            <div 
              className={`p-6 rounded-xl border-2 border-dashed transition-all duration-300 ${
                isDragging ? 'border-white bg-white/10' : 'border-gray-600'
              }`}
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                <p className="text-gray-400 text-sm mb-3">
                  Drag & drop images here to add custom Nextbot faces
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
                  style={{ backgroundColor: config.uiAccentColor }}
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Texture Grid */}
            {customTextures.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm">
                    {customTextures.length} image{customTextures.length !== 1 ? 's' : ''} loaded
                  </span>
                  <button
                    onClick={clearAllTextures}
                    className="text-red-400 text-sm hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customTextures.map((texture, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={texture} 
                        alt={`Custom ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeTexture(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Entity Attributes (40%) */}
          <div className="md:w-[40%]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: config.uiAccentColor }} />
                Entity Attributes
              </h3>
              <button
                onClick={resetToDefaults}
                className="text-gray-400 text-xs hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div 
              className="p-4 rounded-xl space-y-6"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            >
              {/* Speed Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 text-sm flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Speed
                  </label>
                  <span 
                    className="text-sm font-mono"
                    style={{ color: config.uiAccentColor }}
                  >
                    {customSettings.speed}
                  </span>
                </div>
                <Slider
                  value={[customSettings.speed]}
                  onValueChange={([value]) => updateSetting('speed', value)}
                  min={3}
                  max={15}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Detection Range Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-gray-300 text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Detection Range
                  </label>
                  <span 
                    className="text-sm font-mono"
                    style={{ color: config.uiAccentColor }}
                  >
                    {customSettings.detectionRange}
                  </span>
                </div>
                <Slider
                  value={[customSettings.detectionRange]}
                  onValueChange={([value]) => updateSetting('detectionRange', value)}
                  min={10}
                  max={80}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Short</span>
                  <span>Long</span>
                </div>
              </div>

              {/* Behavior Dropdown */}
              <div>
                <label className="text-gray-300 text-sm flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" />
                  Behavior
                </label>
                <select
                  value={customSettings.behavior}
                  onChange={(e) => updateSetting('behavior', e.target.value as CustomEntitySettings['behavior'])}
                  className="w-full px-3 py-2 rounded-lg bg-black/50 text-white border border-gray-600 focus:outline-none focus:border-gray-400"
                >
                  <option value="creeping">Creeping - Slow and stalking</option>
                  <option value="steady">Steady - Consistent pursuit</option>
                  <option value="chaotic">Chaotic - Unpredictable and fast</option>
                </select>
              </div>
            </div>

            {/* Info text */}
            <p className="text-gray-500 text-xs mt-3">
              Custom settings will be applied when you start the game. These override the default mode settings.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
            style={{ backgroundColor: config.uiAccentColor }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
