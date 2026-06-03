'use client'

import { useState, useEffect } from 'react'
import { GameMode, GAME_MODE_CONFIGS, PlayerIdentity } from '@/lib/game/types'
import { loadPlayer, savePlayer, generateDiscriminator } from '@/lib/game/storage'
import { Trophy, Send, Loader2, CheckCircle, AlertCircle, RotateCcw, Home } from 'lucide-react'

interface ScoreSubmitModalProps {
  isOpen: boolean
  score: number
  mode: GameMode
  onRestart: () => void
  onQuit: () => void
}

interface SubmitResponse {
  success: boolean
  rank?: string | number
  countryCode?: string
  countryEmoji?: string
  message?: string
}

export function ScoreSubmitModal({ 
  isOpen, 
  score, 
  mode, 
  onRestart, 
  onQuit 
}: ScoreSubmitModalProps) {
  const [player, setPlayer] = useState<PlayerIdentity | null>(null)
  const [username, setUsername] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const config = GAME_MODE_CONFIGS[mode]

  useEffect(() => {
    if (isOpen) {
      const savedPlayer = loadPlayer()
      setPlayer(savedPlayer)
      if (savedPlayer) {
        setUsername(savedPlayer.username)
      }
      setHasSubmitted(false)
      setSubmitResult(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!username.trim() || username.length > 16) return

    setIsSubmitting(true)

    // Create or use existing player identity
    let currentPlayer = player
    if (!currentPlayer || currentPlayer.username !== username.trim()) {
      currentPlayer = {
        username: username.trim(),
        discriminator: player?.discriminator || generateDiscriminator()
      }
      savePlayer(currentPlayer)
      setPlayer(currentPlayer)
    }

    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentPlayer.username,
          discriminator: currentPlayer.discriminator,
          score,
          gameMode: mode
        })
      })

      const result: SubmitResponse = await response.json()
      setSubmitResult(result)
      setHasSubmitted(true)
    } catch {
      setSubmitResult({ 
        success: false, 
        message: 'Failed to submit score. Please try again.' 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    setHasSubmitted(true)
    setSubmitResult(null)
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50"
      style={{ fontFamily: config.fontFamily }}
    >
      <div 
        className="p-8 md:p-12 rounded-2xl max-w-md w-full mx-4 text-center"
        style={{ backgroundColor: config.uiSecondaryColor }}
      >
        {/* Game Over Header */}
        <div className="text-6xl mb-4">💀</div>
        <h2 
          className="text-4xl md:text-5xl font-bold mb-2"
          style={{ color: '#FF0000' }}
        >
          GAME OVER
        </h2>
        <p className="text-gray-400 mb-6">You were caught by a Nextbot!</p>
        
        {/* Score Display */}
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: config.uiPrimaryColor }}
        >
          <div className="text-sm text-gray-400 uppercase tracking-wider">Final Score</div>
          <div 
            className="text-5xl font-bold"
            style={{ color: config.uiAccentColor }}
          >
            {score.toLocaleString()}
          </div>
        </div>

        {/* Score Submission Section */}
        {!hasSubmitted ? (
          <div className="space-y-4">
            {/* Username Input */}
            <div className="text-left">
              <label className="text-gray-400 text-sm block mb-2">
                {player ? 'Submit as:' : 'Enter your name to submit:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.slice(0, 16))}
                  placeholder="Your name"
                  maxLength={16}
                  className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-gray-600 text-white placeholder-gray-500 focus:border-white/50 focus:outline-none"
                  disabled={isSubmitting}
                />
                {player && (
                  <div className="px-3 py-3 rounded-lg bg-black/30 text-gray-500 text-sm flex items-center">
                    #{player.discriminator}
                  </div>
                )}
              </div>
              <div className="text-gray-500 text-xs mt-1 text-right">
                {username.length}/16
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!username.trim() || isSubmitting}
              className="w-full py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: config.uiAccentColor }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit to Leaderboard
                </>
              )}
            </button>

            {/* Skip Button */}
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="w-full py-2 text-gray-500 text-sm hover:text-gray-300 transition-colors"
            >
              Skip submission
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Submit Result */}
            {submitResult && (
              <div 
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  submitResult.success ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                {submitResult.success ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-white font-medium">Score submitted!</p>
                      <p className="text-gray-300 text-sm">
                        {submitResult.countryEmoji} Rank #{submitResult.rank}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                    <div className="text-left">
                      <p className="text-red-300 text-sm">
                        {submitResult.message || 'Submission failed'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={onRestart}
              className="w-full py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ backgroundColor: config.uiAccentColor }}
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </button>
            
            <button
              onClick={onQuit}
              className="w-full py-3 rounded-xl text-white border border-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Main Menu
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
