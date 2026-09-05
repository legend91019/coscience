import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { getStatus } from './status.ts'

export type LocalService = {
  server: Server
  host: string
  port: number
  url: string
}

const defaultHost = '127.0.0.1'
const defaultPort = 45123

export async function startServer(
  port = defaultPort,
  host = defaultHost,
): Promise<LocalService> {
  const server = createServer(handleRequest)

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }

    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    await stopServer({ server, host, port, url: '' })
    throw new Error('Local service did not expose a TCP address.')
  }

  return {
    server,
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
  }
}

export async function stopServer(service: LocalService): Promise<void> {
  if (!service.server.listening) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    service.server.close((error) => error ? reject(error) : resolve())
  })
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' })
    return
  }

  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (pathname === '/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (pathname === '/api/status') {
    sendJson(response, 200, getStatus())
    return
  }

  sendJson(response, 404, { error: 'Not found' })
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.writeHead(statusCode)
  response.end(JSON.stringify(value))
}
