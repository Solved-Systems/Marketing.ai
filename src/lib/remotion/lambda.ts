import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client'
import type { AwsRegion } from '@remotion/lambda/client'

const REGION = (process.env.REMOTION_AWS_REGION || 'us-east-1') as AwsRegion
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!
const SERVE_URL = process.env.REMOTION_SERVE_URL!

// AWS credentials - check both standard and REMOTION_ prefixed variables
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || process.env.REMOTION_AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || process.env.REMOTION_AWS_SECRET_ACCESS_KEY

export interface LambdaRenderResult {
  renderId: string
  bucketName: string
}

export interface RenderProgressResult {
  done: boolean
  progress: number
  outputFile?: string
  fatalErrorEncountered: boolean
  errors?: string[]
}

/**
 * Start a video render on AWS Lambda
 */
export async function startLambdaRender(
  compositionId: string,
  inputProps: Record<string, unknown>
): Promise<LambdaRenderResult> {
  if (!FUNCTION_NAME || !SERVE_URL) {
    throw new Error('Remotion Lambda not configured. Set REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL environment variables.')
  }

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (or REMOTION_AWS_ACCESS_KEY_ID and REMOTION_AWS_SECRET_ACCESS_KEY).')
  }

  const result = await renderMediaOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: compositionId,
    inputProps,
    codec: 'h264',
    imageFormat: 'jpeg',
    maxRetries: 1,
    privacy: 'public',
    // More Lambdas = faster parallel rendering
    framesPerLambda: 20,
  })

  return {
    renderId: result.renderId,
    bucketName: result.bucketName,
  }
}

/**
 * Check the progress of a Lambda render
 */
export async function checkLambdaProgress(
  renderId: string,
  bucketName: string
): Promise<RenderProgressResult> {
  if (!FUNCTION_NAME) {
    throw new Error('REMOTION_FUNCTION_NAME not configured')
  }

  const progress = await getRenderProgress({
    renderId,
    bucketName,
    functionName: FUNCTION_NAME,
    region: REGION,
  })

  return {
    done: progress.done,
    progress: Math.round(progress.overallProgress * 100),
    outputFile: progress.outputFile ?? undefined,
    fatalErrorEncountered: progress.fatalErrorEncountered,
    errors: progress.errors?.map(e => e.message),
  }
}

/**
 * Poll for render completion
 */
export async function waitForRenderCompletion(
  renderId: string,
  bucketName: string,
  onProgress?: (progress: number) => void,
  timeoutMs: number = 300000
): Promise<string> {
  const startTime = Date.now()

  while (true) {
    const progress = await checkLambdaProgress(renderId, bucketName)

    if (progress.fatalErrorEncountered) {
      throw new Error(`Render failed: ${progress.errors?.join(', ') || 'Unknown error'}`)
    }

    if (progress.done && progress.outputFile) {
      return progress.outputFile
    }

    if (onProgress) {
      onProgress(progress.progress)
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Render timed out')
    }

    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}
