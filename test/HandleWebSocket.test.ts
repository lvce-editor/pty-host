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
  return new Promise<any>(resolve => {

    let webSocket
    const handleUpgrade = (request) => {
      resolve({
        httpRequest: request, webSocket
      })
    }
    server.on('upgrade', handleUpgrade)
    server.listen(3006, () => {

      // @ts-ignore
      webSocket = new WebSocket('ws://localhost:3006')

    })
  })
}

test('handleWebsocket', async () => {
  const server = http.createServer()
  const { httpRequest, webSocket } = await waitForFirstRequest(server)
  const request = getHandleMessage(httpRequest)

  const openPromise = new Promise(resolve => {
    webSocket.once('open', resolve)
  })
  // @ts-ignore
  await HandleWebSocket.handleWebSocket(request, httpRequest.socket)
  await openPromise
  // @ts-ignore
  httpRequest.socket.destroy()
  server.close()
})