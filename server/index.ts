import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 10000

// Lazy-initialize Supabase client
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Supabase credentials not configured')
    }
    supabase = createClient(url, key)
  }
  return supabase
}

// Store for tracking render jobs
const renderJobs = new Map<string, {
  status: 'pending' | 'rendering' | 'completed' | 'failed'
  progress: number
  outputUrl?: string
  error?: string
}>()

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MRKTCMD Remotion Render Server',
    version: '1.0.0'
  })
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

// Get render job status
app.get('/render/:jobId', (req, res) => {
  const job = renderJobs.get(req.params.jobId)
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }
  res.json(job)
})

// Start a render job
app.post('/render', async (req, res) => {
  const {
    compositionId,
    inputProps,
    videoId,
  } = req.body

  if (!compositionId || !inputProps) {
    return res.status(400).json({ error: 'Missing compositionId or inputProps' })
  }

  const jobId = videoId || `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Initialize job status
  renderJobs.set(jobId, {
    status: 'pending',
    progress: 0,
  })

  res.json({ jobId, status: 'pending' })

  // Start rendering in the background
  renderVideo(jobId, compositionId, inputProps).catch(err => {
    console.error('Render error:', err)
    renderJobs.set(jobId, {
      status: 'failed',
      progress: 0,
      error: err.message,
    })
  })
})

async function renderVideo(
  jobId: string,
  compositionId: string,
  inputProps: Record<string, unknown>
) {
  const outputDir = path.join(process.cwd(), 'output')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const outputPath = path.join(outputDir, `${jobId}.mp4`)

  try {
    renderJobs.set(jobId, { status: 'rendering', progress: 0 })

    console.log(`Starting render for job ${jobId}, composition: ${compositionId}`)

    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src/remotion/index.tsx'),
      onProgress: (progress) => {
        console.log(`Bundling: ${Math.round(progress * 100)}%`)
      },
    })

    console.log('Bundle complete:', bundleLocation)

    // Select the composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    })

    console.log('Composition selected:', composition.id, composition.durationInFrames, 'frames')

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100)
        console.log(`Rendering ${jobId}: ${percent}%`)
        renderJobs.set(jobId, { status: 'rendering', progress: percent })
      },
    })

    console.log(`Render complete: ${outputPath}`)

    // Upload to Supabase Storage
    const fileBuffer = fs.readFileSync(outputPath)
    const fileName = `videos/${jobId}.mp4`

    const { error: uploadError } = await getSupabase().storage
      .from('renders')
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = getSupabase().storage
      .from('renders')
      .getPublicUrl(fileName)

    const outputUrl = urlData.publicUrl

    // Update video record in database if videoId was provided
    if (jobId.startsWith('job-') === false) {
      await getSupabase()
        .from('videos')
        .update({
          status: 'completed',
          output_url: outputUrl,
          rendered_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    // Clean up local file
    fs.unlinkSync(outputPath)

    renderJobs.set(jobId, {
      status: 'completed',
      progress: 100,
      outputUrl,
    })

    console.log(`Job ${jobId} completed: ${outputUrl}`)
  } catch (error) {
    console.error(`Render failed for job ${jobId}:`, error)
    renderJobs.set(jobId, {
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    // Update database status if this was a real video
    if (jobId.startsWith('job-') === false) {
      await getSupabase()
        .from('videos')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Render failed',
        })
        .eq('id', jobId)
    }
  }
}

app.listen(PORT, () => {
  console.log(`Remotion Render Server running on port ${PORT}`)
})
