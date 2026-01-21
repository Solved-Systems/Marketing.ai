import { create } from 'zustand'
import type { Tables } from '@/lib/database.types'

type VideoJob = Tables<'video_jobs'>

interface VideoState {
  jobs: Record<string, VideoJob>
  activeJobIds: string[]
  addJob: (job: VideoJob) => void
  updateJob: (id: string, updates: Partial<VideoJob>) => void
  removeJob: (id: string) => void
  setActiveJobIds: (ids: string[]) => void
  getJob: (id: string) => VideoJob | undefined
  getActiveJobs: () => VideoJob[]
}

export const useVideoStore = create<VideoState>((set, get) => ({
  jobs: {},
  activeJobIds: [],

  addJob: (job) =>
    set((state) => ({
      jobs: { ...state.jobs, [job.id]: job },
    })),

  updateJob: (id, updates) =>
    set((state) => ({
      jobs: state.jobs[id]
        ? { ...state.jobs, [id]: { ...state.jobs[id], ...updates } }
        : state.jobs,
    })),

  removeJob: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.jobs
      return {
        jobs: rest,
        activeJobIds: state.activeJobIds.filter((jid) => jid !== id),
      }
    }),

  setActiveJobIds: (ids) => set({ activeJobIds: ids }),

  getJob: (id) => get().jobs[id],

  getActiveJobs: () => {
    const state = get()
    return state.activeJobIds
      .map((id) => state.jobs[id])
      .filter((job): job is VideoJob => !!job)
  },
}))
