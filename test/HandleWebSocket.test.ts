import { test } from '@jest/globals'
import * as http from 'node:http'
import { WebSocket } from 'ws'
import * as HandleWebSocket from '../src/parts/HandleWebSocket/HandleWebSocket.js'

const getHandleMessage = (request) => {
  return {
    headers: request.headers,
    method: request.method,
    path: request.path,
    url: request.url,
    httpVersionMajor: request.httpVersionMajor,
    httpVersionMinor: request.httpVersionMinor,
    query: request.query,
  }
}

const waitForFirstRequest = async server => {
  const httpRequest = await new Promise(resolve => {

    const handleUpgrade = (request) => {
      resolve(request)
    }
    server.on('upgrade', handleUpgrade)
    server.listen(3006, () => {

      // @ts-ignore
      const webSocket = new WebSocket('ws://localhost:3006')
    })
  })
  return httpRequest
}

test('handleWebsocket', async () => {
  const server = http.createServer()
  const httpRequest = await waitForFirstRequest(server)
  const request = getHandleMessage(httpRequest)
  // @ts-ignore
  await HandleWebSocket.handleWebSocket(request, httpRequest.socket)
  // @ts-ignore
  httpRequest.socket.destroy()
  server.close()
})