'use client'

import { useState, useEffect } from 'react'
import { GameMode, GAME_MODE_CONFIGS } from '@/lib/game/types'
import { loadPlayer } from '@/lib/game/storage'
import { Trophy, Globe, MapPin, X, Loader2, User } from 'lucide-react'
import useSWR from 'swr'

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
  mode: GameMode
}

interface LeaderboardEntry {
  id: number
  username: string
  discriminator: string
  score: number
  countryCode: string
  countryEmoji: string
  gameMode: string
  rank?: number
}

interface LeaderboardResponse {
  available: boolean
  message?: string
  entries?: LeaderboardEntry[]
  playerRank?: string | number | null
  playerEntry?: LeaderboardEntry | null
}

const fetcher = async (url: string): Promise<LeaderboardResponse> => {
  const res = await fetch(url)
  return res.json()
}

export function LeaderboardModal({ isOpen, onClose, mode }: LeaderboardModalProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'country'>('global')
  const [playerCountry, setPlayerCountry] = useState('XX')
  const config = GAME_MODE_CONFIGS[mode]
  const player = typeof window !== 'undefined' ? loadPlayer() : null

  // Fetch country from an earlier score submission or detect it
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        // Try to get from the API response on first load
        const res = await fetch('/api/leaderboard?tab=global')
        const data = await res.json()
        // Country will be detected server-side via headers
      } catch {
        // Ignore errors
      }
    }
    if (isOpen) {
      fetchCountry()
    }
  }, [isOpen])

  const queryParams = new URLSearchParams({
    tab: activeTab,
    country: playerCountry,
    ...(player && { username: player.username, discriminator: player.discriminator })
  })

  const { data, isLoading, error } = useSWR<LeaderboardResponse>(
    isOpen ? `/api/leaderboard?${queryParams}` : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  if (!isOpen) return null

  const isUnavailable = !data?.available || error

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="p-6 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col"
        style={{ backgroundColor: config.uiSecondaryColor, fontFamily: config.fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: config.uiAccentColor }}
          >
            <Trophy className="w-6 h-6" />
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('global')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
              activeTab === 'global' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'global' ? `${config.uiAccentColor}30` : 'transparent',
              borderColor: activeTab === 'global' ? config.uiAccentColor : 'transparent'
            }}
          >
            <Globe className="w-4 h-4" />
            Global
          </button>
          <button
            onClick={() => setActiveTab('country')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
              activeTab === 'country' ? 'text-white' : 'text-gray-400 hover:text-white'
            }`}
            style={{
              backgroundColor: activeTab === 'country' ? `${config.uiAccentColor}30` : 'transparent',
              borderColor: activeTab === 'country' ? config.uiAccentColor : 'transparent'
            }}
          >
            <MapPin className="w-4 h-4" />
            Country
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: config.uiAccentColor }} />
            </div>
          ) : isUnavailable ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">
                {data?.message || 'Leaderboard rankings unavailable right now'}
              </p>
            </div>
          ) : data?.entries && data.entries.length > 0 ? (
            <div className="space-y-2">
              {data.entries.map((entry, index) => {
                const isPlayer = player && 
                  entry.username === player.username && 
                  entry.discriminator === player.discriminator
                
                return (
                  <div 
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isPlayer ? 'ring-2' : ''
                    }`}
                    style={{
                      backgroundColor: isPlayer ? `${config.uiAccentColor}20` : 'rgba(0,0,0,0.3)',
                      ringColor: isPlayer ? config.uiAccentColor : 'transparent'
                    }}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      {index === 0 ? (
                        <span className="text-xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-gray-400 text-sm">#{entry.rank || index + 1}</span>
                      )}
                    </div>

                    {/* Country */}
                    <span className="text-lg">{entry.countryEmoji}</span>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-medium truncate">{entry.username}</span>
                        <span className="text-gray-500 text-sm">#{entry.discriminator}</span>
                        {isPlayer && (
                          <User className="w-3 h-3 ml-1" style={{ color: config.uiAccentColor }} />
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div 
                      className="font-bold text-lg"
                      style={{ color: config.uiAccentColor }}
                    >
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No scores yet. Be the first!</p>
            </div>
          )}
        </div>

        {/* Player's Rank (if not in top 100) */}
        {data?.available && data?.playerRank && data?.playerEntry && (
          <div 
            className="mt-4 pt-4 border-t border-gray-700"
          >
            <div className="text-gray-400 text-sm mb-2">Your Best</div>
            <div 
              className="flex items-center gap-3 p-3 rounded-lg ring-2"
              style={{ 
                backgroundColor: `${config.uiAccentColor}20`,
                ringColor: config.uiAccentColor
              }}
            >
              <div className="w-8 text-center text-gray-400 text-sm">
                #{data.playerRank}
              </div>
              <span className="text-lg">{data.playerEntry.countryEmoji}</span>
              <div className="flex-1">
                <span className="text-white font-medium">{data.playerEntry.username}</span>
                <span className="text-gray-500 text-sm">#{data.playerEntry.discriminator}</span>
              </div>
              <div 
                className="font-bold text-lg"
                style={{ color: config.uiAccentColor }}
              >
                {data.playerEntry.score.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
