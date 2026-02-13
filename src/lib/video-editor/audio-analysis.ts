export interface SilentRegion {
  start: number
  end: number
}

export async function extractAudioFromBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new AudioContext()
  try {
    return await audioContext.decodeAudioData(arrayBuffer)
  } finally {
    await audioContext.close()
  }
}

export function detectSilentRegions(
  audioBuffer: AudioBuffer,
  thresholdDb: number = -40,
  minDurationMs: number = 500
): SilentRegion[] {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const threshold = Math.pow(10, thresholdDb / 20)
  const minSamples = Math.floor((minDurationMs / 1000) * sampleRate)

  const regions: SilentRegion[] = []
  let silenceStart: number | null = null
  const windowSize = Math.floor(sampleRate * 0.01) // 10ms windows

  for (let i = 0; i < channelData.length; i += windowSize) {
    const end = Math.min(i + windowSize, channelData.length)
    let rms = 0
    for (let j = i; j < end; j++) {
      rms += channelData[j] * channelData[j]
    }
    rms = Math.sqrt(rms / (end - i))

    if (rms < threshold) {
      if (silenceStart === null) {
        silenceStart = i
      }
    } else {
      if (silenceStart !== null) {
        const duration = i - silenceStart
        if (duration >= minSamples) {
          regions.push({
            start: silenceStart / sampleRate,
            end: i / sampleRate,
          })
        }
        silenceStart = null
      }
    }
  }

  // Handle silence at end
  if (silenceStart !== null) {
    const duration = channelData.length - silenceStart
    if (duration >= minSamples) {
      regions.push({
        start: silenceStart / sampleRate,
        end: channelData.length / sampleRate,
      })
    }
  }

  return regions
}
