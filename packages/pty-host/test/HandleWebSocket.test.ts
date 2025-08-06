import { beforeAll, expect, test } from '@jest/globals'
import * as http from 'node:http'
import * as Command from '../src/parts/Command/Command.js'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.js'
import * as HandleWebSocket from '../src/parts/HandleWebSocket/HandleWebSocket.js'

beforeAll(() => {
  Command.register(CommandMap.commandMap)
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

const waitForFirstRequest = async (server) => {
  const { resolve, promise } = Promise.withResolvers<any>()
  let webSocket
  const handleUpgrade = (request) => {
    resolve({
      httpRequest: request,
      webSocket,
    })
  }
  server.on('upgrade', handleUpgrade)
  server.listen(0, () => {
    const { port } = server.address()

    // @ts-ignore
    webSocket = new WebSocket(`ws://localhost:${port}`)
  })
  return promise
}

const waitForWebSocketMessage = async (webSocket: any) => {
  const responsePromise = new Promise<any>((resolve) => {
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
  const { resolve, promise } = Promise.withResolvers()
  webSocket.addEventListener('open', resolve, { once: true })
  await HandleWebSocket.handleWebSocket(httpRequest.socket, request)
  await promise
  const responsePromise = waitForWebSocketMessage(webSocket)

  webSocket.send(
    JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'Terminal.create',
      params: [
        2,
        process.cwd(),
        process.execPath,
        ['-e', 'console.log("test")'],
      ],
    }),
  )
  const response = await responsePromise
  expect(response).toEqual({
    jsonrpc: '2.0',
    id: 1,
    result: null,
  })
  const nextResponse = await waitForWebSocketMessage(webSocket)
  const expectedValue =
    process.platform === 'win32'
      ? expect.anything() // TODO try to fix assertion on windows, it prints test on windows 2022 and 9001h1004h on windows 2025
      : {
          type: 'Buffer',
          data: [...Buffer.from('test\r\n')],
        }
  expect(nextResponse).toEqual({
    jsonrpc: '2.0',
    method: 'Viewlet.send',
    params: [2, 'handleData', expectedValue],
  })
  // @ts-ignore
  httpRequest.socket.destroy()
  server.close()
})

test('handleWebsocket - error - request is not defined', async () => {
  const request = undefined
  const socket = {}
  await expect(
    HandleWebSocket.handleWebSocket(socket, request),
  ).rejects.toThrow(new Error(`expected value to be of type object`))
})

test('handleWebsocket - error - socket is not defined', async () => {
  const request = {}
  const socket = undefined
  await expect(
    HandleWebSocket.handleWebSocket(socket, request),
  ).rejects.toThrow(new Error(`expected value to be of type object`))
})
