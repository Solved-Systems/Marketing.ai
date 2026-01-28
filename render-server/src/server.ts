import express from 'express';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Supabase client for updating job status and uploading videos
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Render endpoint
app.post('/render', async (req, res) => {
  const { jobId, compositionId, inputProps } = req.body;

  if (!jobId || !compositionId) {
    return res.status(400).json({ error: 'jobId and compositionId are required' });
  }

  // Respond immediately - rendering happens async
  res.json({ success: true, message: 'Render started', jobId });

  // Process render in background
  processRender(jobId, compositionId, inputProps).catch((error) => {
    console.error(`Render failed for job ${jobId}:`, error);
  });
});

async function processRender(
  jobId: string,
  compositionId: string,
  inputProps: Record<string, unknown>
) {
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `${jobId}.mp4`);

  try {
    // Update status to rendering
    await supabase
      .from('video_jobs')
      .update({ status: 'rendering', started_at: new Date().toISOString() })
      .eq('id', jobId);

    console.log(`[${jobId}] Starting render for composition: ${compositionId}`);

    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, './remotion/index.ts'),
      onProgress: (progress) => {
        if (progress % 25 === 0) {
          console.log(`[${jobId}] Bundling: ${progress}%`);
        }
      },
    });

    // Select the composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    console.log(`[${jobId}] Rendering ${composition.durationInFrames} frames...`);

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      onProgress: async ({ progress }) => {
        const percent = Math.round(progress * 100);
        if (percent % 10 === 0) {
          console.log(`[${jobId}] Render progress: ${percent}%`);
          await supabase
            .from('video_jobs')
            .update({ progress: percent })
            .eq('id', jobId);
        }
      },
    });

    console.log(`[${jobId}] Render complete, uploading to storage...`);

    // Upload to Supabase Storage
    const videoBuffer = fs.readFileSync(outputPath);
    const storagePath = `videos/${jobId}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from('rendered-videos')
      .upload(storagePath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('rendered-videos')
      .getPublicUrl(storagePath);

    // Update job as completed
    await supabase
      .from('video_jobs')
      .update({
        status: 'completed',
        progress: 100,
        output_url: urlData.publicUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`[${jobId}] Job completed: ${urlData.publicUrl}`);

    // Cleanup temp file
    fs.unlinkSync(outputPath);
  } catch (error) {
    console.error(`[${jobId}] Render error:`, error);

    await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId);
  }
}

app.listen(PORT, () => {
  console.log(`Render server running on port ${PORT}`);
});
