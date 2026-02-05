'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Film,
  X,
  Clock,
  Ratio,
  Gauge,
  Wand2,
} from 'lucide-react'

export interface AnimationSettings {
  duration: number
  aspectRatio: string
  resolution: string
  motionIntensity: string
  prompt: string
}

interface AnimationSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onAnimate: () => void
  settings: AnimationSettings
  onSettingsChange: (settings: AnimationSettings) => void
}

const DURATIONS = [
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 8, label: '8s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
]

const ASPECT_RATIOS = [
  { value: '16:9', label: 'Wide' },
  { value: '9:16', label: 'Vertical' },
  { value: '1:1', label: 'Square' },
  { value: '4:3', label: 'Standard' },
]

const RESOLUTIONS = [
  { value: '720p', label: 'HD' },
  { value: '480p', label: 'SD' },
]

const MOTION_INTENSITIES = [
  { value: 'subtle', label: 'Subtle', description: 'Minimal' },
  { value: 'moderate', label: 'Moderate', description: 'Natural' },
  { value: 'dynamic', label: 'Dynamic', description: 'Cinematic' },
]

export function AnimationSettingsModal({
  isOpen,
  onClose,
  onAnimate,
  settings,
  onSettingsChange,
}: AnimationSettingsModalProps) {
  if (!isOpen) return null

  const updateSetting = <K extends keyof AnimationSettings>(
    key: K,
    value: AnimationSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Film className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Animation Settings</h3>
              <p className="text-xs text-muted-foreground">Configure video output</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Motion prompt */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <Wand2 className="h-3 w-3" />
              motion_prompt
            </label>
            <Input
              value={settings.prompt}
              onChange={(e) => updateSetting('prompt', e.target.value)}
              placeholder="Describe the motion you want..."
              className="h-10 bg-muted/20 border-border/50"
            />
          </div>

          {/* Grid of settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                duration
              </label>
              <Select
                value={String(settings.duration)}
                onValueChange={(v) => updateSetting('duration', parseInt(v))}
              >
                <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect ratio */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Ratio className="h-3 w-3" />
                aspect
              </label>
              <Select
                value={settings.aspectRatio}
                onValueChange={(v) => updateSetting('aspectRatio', v)}
              >
                <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map(ar => (
                    <SelectItem key={ar.value} value={ar.value}>
                      {ar.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono">
                resolution
              </label>
              <Select
                value={settings.resolution}
                onValueChange={(v) => updateSetting('resolution', v)}
              >
                <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Motion intensity */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Gauge className="h-3 w-3" />
                motion
              </label>
              <Select
                value={settings.motionIntensity}
                onValueChange={(v) => updateSetting('motionIntensity', v)}
              >
                <SelectTrigger className="h-10 bg-muted/20 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTION_INTENSITIES.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span>{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 bg-muted/20 border-t border-border/30">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 h-10"
          >
            Cancel
          </Button>
          <Button
            variant="terminal"
            onClick={onAnimate}
            className="flex-1 h-10 gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Animate
          </Button>
        </div>
      </div>
    </div>
  )
}
