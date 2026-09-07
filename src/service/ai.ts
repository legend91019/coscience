export type ApiKeySource = string | null | undefined | (() => string | Promise<string | null | undefined> | null | undefined)

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export type AiServiceConfig = {
  baseURL?: string
  model: string
  apiKey: ApiKeySource
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export type AiRequestInput = {
  messages: ChatMessage[]
  signal?: AbortSignal
  timeoutMs?: number
}

export type AiService = {
  complete(input: AiRequestInput): Promise<AiCompletionResponse>
  stream(input: AiRequestInput): AsyncGenerator<AiStreamChunk, void, void>
}

export type AiCompletionResponse = Record<string, unknown> & {
  choices: Array<Record<string, unknown>>
}

export type AiStreamChunk = Record<string, unknown>

export type AiServiceErrorKind = 'config' | 'timeout' | 'abort' | 'http' | 'network' | 'parse'

export class AiServiceError extends Error {
  kind: AiServiceErrorKind
  status: number | null
  code: string | null
  details: unknown

  constructor(
    kind: AiServiceErrorKind,
    message: string,
    options?: {
      status?: number | null
      code?: string | null
      details?: unknown
      cause?: unknown
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'AiServiceError'
    this.kind = kind
    this.status = options?.status ?? null
    this.code = options?.code ?? null
    this.details = options?.details
  }
}

const defaultBaseURL = 'https://api.openai.com/v1'
const jsonContentType = 'application/json'

export function createAiService(config: AiServiceConfig): AiService {
  const baseURL = normalizeBaseURL(config.baseURL)
  const fetchImpl = config.fetchImpl ?? fetch
  const defaultTimeoutMs = normalizeTimeout(config.timeoutMs)

  return {
    complete: (input) => requestCompletion({
      baseURL,
      fetchImpl,
      model: config.model,
      apiKey: config.apiKey,
      input,
      stream: false,
      timeoutMs: input.timeoutMs ?? defaultTimeoutMs,
    }),
    stream: async function* stream(input) {
      yield* requestStream({
        baseURL,
        fetchImpl,
        model: config.model,
        apiKey: config.apiKey,
        input,
        timeoutMs: input.timeoutMs ?? defaultTimeoutMs,
      })
    },
  }
}

async function requestCompletion(args: RequestContext & { stream: false }): Promise<AiCompletionResponse> {
  const { response, cleanup } = await performRequest(args)
  try {
    return await readJsonResponse(response)
  } finally {
    cleanup()
  }
}

async function* requestStream(args: RequestContext & { input: AiRequestInput }): AsyncGenerator<AiStreamChunk, void, void> {
  const { response, cleanup, signal } = await performRequest({ ...args, stream: true })
  const body = response.body

  if (!body) {
    cleanup()
    throw new AiServiceError('network', 'The OpenAI streaming response did not include a body.')
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const chunk = await readChunk(reader, signal)
      if (chunk.done) {
        break
      }

      buffer += decoder.decode(chunk.value, { stream: true })
      const events = splitSseEvents(buffer)
      buffer = events.remainder

      for (const rawEvent of events.events) {
        const payload = parseSsePayload(rawEvent)
        if (!payload) {
          continue
        }
        if (payload === '[DONE]') {
          return
        }
        yield parseJsonChunk(payload)
      }
    }

    const tail = parseSsePayload(buffer)
    if (tail && tail !== '[DONE]') {
      yield parseJsonChunk(tail)
    }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // Ignore cancellation errors while unwinding a finished stream.
    }
    reader.releaseLock()
    cleanup()
  }
}

type RequestContext = {
  baseURL: string
  fetchImpl: typeof fetch
  model: string
  apiKey: ApiKeySource
  timeoutMs: number | null
  input: AiRequestInput
  stream: boolean
}

async function performRequest(args: RequestContext): Promise<{
  response: Response
  cleanup: () => void
  signal: AbortSignal
}> {
  const apiKey = await resolveApiKey(args.apiKey)
  if (!apiKey) {
    throw new AiServiceError('config', 'An API key is required to call the model service.')
  }

  const request = createRequestSignal(args.input.signal, args.timeoutMs)
  const url = new URL('chat/completions', args.baseURL)
  const headers = new Headers({
    authorization: `Bearer ${apiKey}`,
    'content-type': jsonContentType,
    accept: args.stream ? 'text/event-stream' : 'application/json',
  })
  const body = JSON.stringify({
    model: args.model,
    messages: args.input.messages,
    stream: args.stream,
  })
  const fetchPromise = args.fetchImpl(url, {
    method: 'POST',
    headers,
    body,
    signal: request.signal,
  })

  try {
    const response = await Promise.race([
      fetchPromise,
      request.abortPromise,
    ]) as Response

    if (!response.ok) {
      throw await readHttpError(response)
    }

    return {
      response,
      cleanup: request.cleanup,
      signal: request.signal,
    }
  } catch (error) {
    request.cleanup()
    if (error instanceof AiServiceError) {
      throw error
    }
    throw normalizeFetchError(error, request.getAbortKind())
  }
}

async function readJsonResponse(response: Response): Promise<AiCompletionResponse> {
  try {
    return await response.json() as AiCompletionResponse
  } catch (error) {
    throw new AiServiceError('parse', 'The OpenAI response body was not valid JSON.', { cause: error })
  }
}

async function readHttpError(response: Response): Promise<AiServiceError> {
  const bodyText = await response.text().catch(() => '')
  let parsed: unknown = bodyText
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null
  } catch {
    parsed = bodyText
  }

  const details = isObject(parsed) ? parsed : { body: typeof parsed === 'string' ? parsed : null }
  const apiError = isObject(parsed) && isObject(parsed.error) ? parsed.error as Record<string, unknown> : null
  const message = typeof apiError?.message === 'string'
    ? apiError.message
    : `OpenAI request failed with status ${response.status}.`

  return new AiServiceError('http', message, {
    status: response.status,
    code: typeof apiError?.code === 'string' ? apiError.code : null,
    details,
  })
}

async function resolveApiKey(apiKey: ApiKeySource): Promise<string | null | undefined> {
  if (typeof apiKey === 'function') {
    return await apiKey()
  }
  return apiKey
}

function createRequestSignal(signal: AbortSignal | undefined, timeoutMs: number | null): {
  signal: AbortSignal
  cleanup: () => void
  getAbortKind: () => 'abort' | 'timeout' | null
  abortPromise: Promise<never>
} {
  const controller = new AbortController()
  let abortKind: 'abort' | 'timeout' | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let rejectAbort: ((error: AiServiceError) => void) | null = null

  const abort = (kind: 'abort' | 'timeout') => {
    if (abortKind) {
      return
    }
    abortKind = kind
    rejectAbort?.(new AiServiceError(kind, kind === 'timeout'
      ? 'The OpenAI request timed out.'
      : 'The OpenAI request was aborted.'))
    controller.abort()
  }

  const onAbort = () => abort('abort')

  if (signal) {
    if (signal.aborted) {
      abort('abort')
    } else {
      signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  if (!abortKind && timeoutMs !== null && timeoutMs > 0) {
    timeoutId = setTimeout(() => abort('timeout'), timeoutMs)
  }

  return {
    signal: controller.signal,
    abortPromise: new Promise<never>((_resolve, reject) => {
      rejectAbort = reject
      if (abortKind) {
        reject(new AiServiceError(abortKind, abortKind === 'timeout'
          ? 'The OpenAI request timed out.'
          : 'The OpenAI request was aborted.'))
      }
    }),
    cleanup: () => {
      signal?.removeEventListener('abort', onAbort)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    },
    getAbortKind: () => abortKind,
  }
}

function normalizeFetchError(error: unknown, abortKind: 'abort' | 'timeout' | null): AiServiceError {
  if (abortKind === 'timeout') {
    return new AiServiceError('timeout', 'The OpenAI request timed out.')
  }
  if (abortKind === 'abort' || isAbortLike(error)) {
    return new AiServiceError('abort', 'The OpenAI request was aborted.')
  }
  return new AiServiceError('network', 'The OpenAI request failed.', { cause: error })
}

function splitSseEvents(buffer: string): { events: string[]; remainder: string } {
  const events: string[] = []
  let remainder = buffer

  while (true) {
    const separator = remainder.indexOf('\n\n')
    if (separator === -1) {
      break
    }
    events.push(remainder.slice(0, separator))
    remainder = remainder.slice(separator + 2)
  }

  return { events, remainder }
}

function parseSsePayload(eventBlock: string): string | null {
  const lines = eventBlock.split(/\r?\n/)
  const data = lines
    .map((line) => line.trimStart())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  return data || null
}

function parseJsonChunk(payload: string): AiStreamChunk {
  try {
    return JSON.parse(payload) as AiStreamChunk
  } catch (error) {
    throw new AiServiceError('parse', 'The OpenAI streaming chunk was not valid JSON.', { cause: error })
  }
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal.aborted) {
    throw new AiServiceError('abort', 'The OpenAI request was aborted.')
  }

  return await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
    const onAbort = () => {
      reader.cancel().catch(() => {})
      reject(new AiServiceError('abort', 'The OpenAI request was aborted.'))
    }

    const cleanup = () => signal.removeEventListener('abort', onAbort)

    signal.addEventListener('abort', onAbort, { once: true })

    reader.read().then(
      (result) => {
        cleanup()
        resolve(result)
      },
      (error) => {
        cleanup()
        reject(error)
      },
    )
  })
}

function normalizeBaseURL(baseURL: string | undefined): string {
  const normalized = (baseURL?.trim() || defaultBaseURL).replace(/\/?$/, '/')
  return normalized
}

function normalizeTimeout(timeoutMs: number | undefined): number | null {
  return typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : null
}

function isAbortLike(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
    || (isObject(error) && typeof error.name === 'string' && error.name === 'AbortError')
    || (isObject(error) && typeof error.code === 'string' && error.code === 'ABORT_ERR')
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
