import { config } from 'dotenv'
config({ path: '.env.local' })
import { renderMediaOnLambda, getRenderProgress } from '@remotion/lambda/client'

const REGION = 'us-east-1'
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!
const SERVE_URL = process.env.REMOTION_SERVE_URL!

async function testLambdaRender() {
  console.log('Testing Lambda Render Integration')
  console.log('================================')
  console.log(`Region: ${REGION}`)
  console.log(`Function: ${FUNCTION_NAME}`)
  console.log(`Serve URL: ${SERVE_URL}`)
  console.log('')

  if (!FUNCTION_NAME || !SERVE_URL) {
    console.error('Missing REMOTION_FUNCTION_NAME or REMOTION_SERVE_URL in environment')
    process.exit(1)
  }

  const compositionId = 'FeatureAnnouncement-30'
  const inputProps = {
    title: 'Lambda Test Render',
    description: 'Testing AWS Lambda video rendering integration',
    features: ['Fast rendering', 'Serverless', 'Scalable', 'Cost-effective'],
    callToAction: 'Get Started',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    accentColor: '#22c55e',
    brandName: 'MRKTCMD',
    style: 'Modern',
  }

  console.log('Starting render...')
  console.log(`Composition: ${compositionId}`)
  console.log('')

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: REGION,
      functionName: FUNCTION_NAME,
      serveUrl: SERVE_URL,
      composition: compositionId,
      inputProps,
      codec: 'h264',
      imageFormat: 'jpeg',
      maxRetries: 1,
      privacy: 'public',
      // With 1000 concurrency limit, use more parallel Lambdas for speed
      framesPerLambda: 20,
    })

    console.log(`Render started!`)
    console.log(`Render ID: ${renderId}`)
    console.log(`Bucket: ${bucketName}`)
    console.log('')
    console.log('Polling for completion...')

    let lastProgress = 0
    while (true) {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: FUNCTION_NAME,
        region: REGION,
      })

      const percent = Math.round(progress.overallProgress * 100)
      if (percent !== lastProgress) {
        console.log(`Progress: ${percent}%`)
        lastProgress = percent
      }

      if (progress.fatalErrorEncountered) {
        console.error('Fatal error:', progress.errors)
        process.exit(1)
      }

      if (progress.done) {
        console.log('')
        console.log('================================')
        console.log('RENDER COMPLETE!')
        console.log(`Output URL: ${progress.outputFile}`)
        console.log(`Render time: ${progress.timeToFinish}ms`)
        console.log(`Cost: ~$${(progress.costs as any)?.estimatedCost?.toFixed(4) || 'N/A'}`)
        console.log('================================')
        break
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  } catch (error) {
    console.error('Render failed:', error)
    process.exit(1)
  }
}

testLambdaRender()
