import assert from 'node:assert/strict'
import test from 'node:test'

import { AiServiceError, createAiService } from './ai.ts'

function jsonResponse(status: number, value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
}

test('creates OpenAI-style chat completion requests with a lazily resolved api key', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const service = createAiService({
    baseURL: 'https://api.example.test/v1',
    model: 'gpt-4o-mini',
    apiKey: async () => 'sk-test-key',
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init })
      return jsonResponse(200, {
        id: 'chatcmpl-1',
        object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hello back' }, finish_reason: 'stop' }],
      })
    },
  })

  const result = await service.complete({
    messages: [{ role: 'user', content: 'Hello' }],
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.example.test/v1/chat/completions')
  assert.equal(calls[0].init?.method, 'POST')
  assert.equal(calls[0].init?.headers instanceof Headers, true)
  assert.equal((calls[0].init?.headers as Headers).get('authorization'), 'Bearer sk-test-key')
  assert.equal((calls[0].init?.headers as Headers).get('content-type'), 'application/json')
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello' }],
    stream: false,
  })
  assert.equal(result.choices[0].message.content, 'Hello back')
})

test('streams parsed SSE chunks and stops at the OpenAI done marker', async () => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"id":"chatcmpl-2","choices":[{"delta":{"content":"Hel"}}]}\n\n'))
      controller.enqueue(encoder.encode('data: {"id":"chatcmpl-2","choices":[{"delta":{"content":"lo"}}]}\n\n'))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  const service = createAiService({
    baseURL: 'https://api.example.test/v1',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-key',
    fetchImpl: async () => new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    }),
  })

  const chunks = []
  for await (const chunk of service.stream({
    messages: [{ role: 'user', content: 'Hello' }],
  })) {
    chunks.push(chunk)
  }

  assert.equal(chunks.length, 2)
  assert.equal(chunks[0].choices[0].delta.content, 'Hel')
  assert.equal(chunks[1].choices[0].delta.content, 'lo')
})

test('throws structured timeout and http errors', async () => {
  await assert.rejects(
    async () => {
      const service = createAiService({
        baseURL: 'https://api.example.test/v1',
        model: 'gpt-4o-mini',
        apiKey: 'sk-test-key',
        timeoutMs: 5,
        fetchImpl: () => new Promise<Response>(() => {}),
      })

      await service.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      })
    },
    (error: unknown) => error instanceof AiServiceError && error.kind === 'timeout',
  )

  await assert.rejects(
    async () => {
      const service = createAiService({
        baseURL: 'https://api.example.test/v1',
        model: 'gpt-4o-mini',
        apiKey: 'sk-test-key',
        fetchImpl: async () => jsonResponse(401, {
          error: { message: 'Invalid API key', type: 'invalid_request_error', code: 'invalid_api_key' },
        }, { statusText: 'Unauthorized' }),
      })

      await service.complete({
        messages: [{ role: 'user', content: 'Hello' }],
      })
    },
    (error: unknown) => error instanceof AiServiceError
      && error.kind === 'http'
      && error.status === 401
      && error.code === 'invalid_api_key',
  )
})

test('aborts in-flight requests with structured abort errors', async () => {
  const controller = new AbortController()
  const service = createAiService({
    baseURL: 'https://api.example.test/v1',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-key',
    fetchImpl: (_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      })
    }),
  })

  const request = service.complete({
    messages: [{ role: 'user', content: 'Hello' }],
    signal: controller.signal,
  })

  controller.abort()

  await assert.rejects(request, (error: unknown) => error instanceof AiServiceError && error.kind === 'abort')
})
