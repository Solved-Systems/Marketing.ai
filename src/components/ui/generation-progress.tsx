'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface GenerationProgressProps {
  type: 'image' | 'video' | 'animation'
  progress?: number // 0-100, undefined for indeterminate
  status?: string
  previewUrl?: string
  startTime?: number
  estimatedDuration?: number // in seconds
  className?: string
}

export function GenerationProgress({
  type,
  progress: externalProgress,
  status,
  previewUrl,
  startTime,
  estimatedDuration: _estimatedDuration = 60,
  className = '',
}: GenerationProgressProps) {
  void _estimatedDuration // Reserved for future time estimation
  const [internalProgress, setInternalProgress] = useState(0)

  // Simulate progress for image generation (no real progress available)
  useEffect(() => {
    if (type === 'image' && externalProgress === undefined && startTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        // Images typically take 5-15 seconds
        const estimated = Math.min(95, Math.round((elapsed / 12) * 100))
        setInternalProgress(estimated)
      }, 200)
      return () => clearInterval(interval)
    }
  }, [type, externalProgress, startTime])

  const progress = externalProgress ?? internalProgress
  const isIndeterminate = progress === 0 && !startTime

  const getStatusText = () => {
    if (status) return status
    if (progress >= 100) return 'Complete'
    if (type === 'image') return 'Generating image...'
    if (type === 'animation') return 'Animating...'
    if (type === 'video') return 'Rendering video...'
    return 'Processing...'
  }

  const getTypeColor = () => {
    switch (type) {
      case 'image': return 'from-violet-500 to-fuchsia-500'
      case 'animation': return 'from-cyan-500 to-blue-500'
      case 'video': return 'from-orange-500 to-amber-500'
      default: return 'from-gray-500 to-gray-400'
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 ${className}`}>
      {/* Preview image with blur overlay while loading */}
      {previewUrl && (
        <div className="relative aspect-video">
          <img
            src={previewUrl}
            alt="Preview"
            className={`w-full h-full object-cover transition-all duration-500 ${
              progress < 100 ? 'blur-sm brightness-50' : ''
            }`}
          />
          {progress < 100 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                <div className="text-white/90 text-sm font-medium">{getStatusText()}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar section */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70 flex items-center gap-1.5">
            {progress < 100 && <Loader2 className="w-3 h-3 animate-spin" />}
            {getStatusText()}
          </span>
          {!isIndeterminate && (
            <span className="text-white/90 font-mono font-medium">
              {Math.round(progress)}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          {isIndeterminate ? (
            <div className={`h-full w-1/3 bg-gradient-to-r ${getTypeColor()} rounded-full animate-pulse`} />
          ) : (
            <div
              className={`h-full bg-gradient-to-r ${getTypeColor()} rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${progress}%` }}
            />
          )}
        </div>

        {/* Estimated time remaining */}
        {progress > 0 && progress < 100 && startTime && (
          <div className="text-[10px] text-white/50 text-right">
            {getTimeRemaining(startTime, progress)}
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeRemaining(startTime: number, progress: number): string {
  if (progress <= 0 || progress >= 100) return ''

  const elapsed = (Date.now() - startTime) / 1000
  const estimatedRemaining = Math.max(0, (elapsed / progress) * (100 - progress))

  if (estimatedRemaining < 10) return 'Almost done...'
  if (estimatedRemaining < 60) return `~${Math.round(estimatedRemaining)}s remaining`
  return `~${Math.round(estimatedRemaining / 60)}m remaining`
}

// Compact inline progress for chat messages
export function InlineProgress({
  progress,
  type,
  className = '',
}: {
  progress: number
  type: 'image' | 'video' | 'animation'
  className?: string
}) {
  const getTypeColor = () => {
    switch (type) {
      case 'image': return 'bg-violet-500'
      case 'animation': return 'bg-cyan-500'
      case 'video': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${getTypeColor()} rounded-full transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-mono text-white/70 w-8">{Math.round(progress)}%</span>
    </div>
  )
}
