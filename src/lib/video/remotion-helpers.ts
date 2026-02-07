import { createAdminClient } from '@/lib/supabase/admin'
import { checkLambdaProgress } from '@/lib/remotion/lambda'

/** Map Remotion template + duration to composition ID */
export function getCompositionId(template: string, duration: string): string {
  const templateMap: Record<string, string> = {
    feature: 'FeatureAnnouncement',
    product: 'ProductDemo',
    social: 'SocialTeaser',
    release: 'ReleaseNotes',
  }
  const durationSec = duration.replace(/\D/g, '') || '30'
  return `${templateMap[template] || 'FeatureAnnouncement'}-${durationSec}`
}

/** Background polling for Remotion Lambda render completion */
export async function pollLambdaCompletion(videoId: string, renderId: string, bucketName: string) {
  const supabase = createAdminClient()
  const maxAttempts = 150 // ~5 minutes at 2s intervals

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const progress = await checkLambdaProgress(renderId, bucketName)

      if (progress.fatalErrorEncountered) {
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: progress.errors?.join(', ') || 'Render failed',
          })
          .eq('id', videoId)
        return
      }

      if (progress.done && progress.outputFile) {
        await supabase
          .from('videos')
          .update({
            status: 'completed',
            output_url: progress.outputFile,
            rendered_at: new Date().toISOString(),
          })
          .eq('id', videoId)
        return
      }
    } catch (error) {
      console.error(`Poll error for ${videoId}:`, error)
    }
  }

  // Timeout
  await supabase
    .from('videos')
    .update({ status: 'failed', error_message: 'Render timed out' })
    .eq('id', videoId)
}
