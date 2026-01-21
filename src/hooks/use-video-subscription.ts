'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useVideoStore } from '@/stores/video-store'
import type { Tables } from '@/lib/database.types'

type VideoJob = Tables<'video_jobs'>

export function useVideoSubscription(projectId?: string) {
  const { addJob, updateJob } = useVideoStore()
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to video job changes
    const channel = supabase
      .channel('video_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_jobs',
          ...(projectId && { filter: `project_id=eq.${projectId}` }),
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            addJob(payload.new as VideoJob)
          } else if (payload.eventType === 'UPDATE') {
            updateJob((payload.new as VideoJob).id, payload.new as Partial<VideoJob>)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, addJob, updateJob])
}

export function useVideoJobStatus(jobId: string) {
  const { updateJob, getJob } = useVideoStore()
  const supabase = createClient()

  useEffect(() => {
    if (!jobId) return

    // Subscribe to specific job changes
    const channel = supabase
      .channel(`video_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          updateJob(jobId, payload.new as Partial<VideoJob>)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId, updateJob])

  return getJob(jobId)
}
