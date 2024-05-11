import { beforeAll, expect, test } from '@jest/globals'
import * as http from 'node:http'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.js'
import * as CommandState from '../src/parts/CommandState/CommandState.js'
import * as HandleWebSocket from '../src/parts/HandleWebSocket/HandleWebSocket.js'

beforeAll(() => {
  CommandState.registerCommands(CommandMap.commandMap)
})

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
    server.listen(0, () => {
      const port = server.address().port

      // @ts-ignore
      webSocket = new WebSocket(`ws://localhost:${port}`)

    })
  })
}

const waitForWebSocketMessage = async (webSocket: any) => {
  const responsePromise = new Promise<any>(resolve => {
    webSocket.addEventListener('message', resolve, { once: true })
  })
  const nextResponse = await responsePromise
  // @ts-ignore
  const nextResponseString = nextResponse.data.toString()
  const nextResponseValue = JSON.parse(nextResponseString)
  return nextResponseValue

}

test('handleWebsocket', async () => {
  const server = http.createServer()
  const { httpRequest, webSocket } = await waitForFirstRequest(server)
  const request = getHandleMessage(httpRequest)
  const openPromise = new Promise(resolve => {
    webSocket.addEventListener('open', resolve, { once: true })
  })
  // @ts-ignore
  await HandleWebSocket.handleWebSocket(request, httpRequest.socket)
  await openPromise
  const responsePromise = waitForWebSocketMessage(webSocket)

  webSocket.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'Terminal.create',
    params: [2, process.cwd(), process.execPath, ['-e', 'console.log("test")']]
  }))
  const response = await responsePromise
  expect(response).toEqual({
    jsonrpc: '2.0',
    id: 1,
    result: null
  })
  const nextResponse = await waitForWebSocketMessage(webSocket)
  expect(nextResponse).toEqual({
    jsonrpc: '2.0',
    method: 'Viewlet.send',
    params: [2, 'handleData', {
      type: 'Buffer',
      data: [...Buffer.from('test\r\n')]
    }]
  })
  // @ts-ignore
  httpRequest.socket.destroy()
  server.close()
})