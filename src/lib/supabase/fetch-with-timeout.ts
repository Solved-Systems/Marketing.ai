const DEFAULT_SUPABASE_TIMEOUT_MS = 5000

function getSupabaseTimeoutMs(): number {
  const raw = process.env.SUPABASE_REQUEST_TIMEOUT_MS
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_SUPABASE_TIMEOUT_MS
}

export async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const timeoutMs = getSupabaseTimeoutMs()
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

  let detachOriginalAbort: (() => void) | undefined

  if (init?.signal) {
    const relayAbort = () => timeoutController.abort()
    if (init.signal.aborted) {
      relayAbort()
    } else {
      init.signal.addEventListener('abort', relayAbort, { once: true })
      detachOriginalAbort = () => init.signal?.removeEventListener('abort', relayAbort)
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: timeoutController.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    detachOriginalAbort?.()
  }
}
