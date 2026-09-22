import { beforeAll, expect, test } from '@jest/globals'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import * as Command from '../src/parts/Command/Command.ts'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.ts'
import * as HandleWebSocket from '../src/parts/HandleWebSocket/HandleWebSocket.ts'

beforeAll(() => Command.register(CommandMap.commandMap))

test('authenticated websocket reload retains an actual shell and running command', async () => {
  const server = createServer()
  const sockets = new Set<any>()
  server.on('upgrade', (request, socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    void HandleWebSocket.handleWebSocket(socket, {
      headers: request.headers,
      httpVersionMajor: request.httpVersionMajor,
      httpVersionMinor: request.httpVersionMinor,
      method: request.method,
      remoteAuthorityAuthenticated: true,
      url: request.url,
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as any
  const clients: WebSocket[] = []
  let requestId = 0
  const connect = async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    clients.push(socket)
    const pending = new Map<
      number,
      { resolve: (value: any) => void; reject: (error: Error) => void }
    >()
    let output = ''
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      const callback = pending.get(message.id)
      if (callback) {
        pending.delete(message.id)
        if (message.error) callback.reject(new Error(message.error.message))
        else callback.resolve(message.result)
      } else if (message.method === 'Viewlet.send') {
        const [, method, data] = message.params
        if (method === 'handleRestore') output += data.data
        else if (method === 'handleData')
          output +=
            typeof data === 'string'
              ? data
              : Buffer.from(data.data || data).toString()
      }
    })
    await new Promise<void>((resolve, reject) => {
      socket.onopen = () => resolve()
      socket.onerror = () => reject(new Error('WebSocket failed'))
    })
    return {
      invoke(method: string, ...params: unknown[]) {
        const id = ++requestId
        return new Promise<any>((resolve, reject) => {
          pending.set(id, { reject, resolve })
          socket.send(JSON.stringify({ id, jsonrpc: '2.0', method, params }))
        })
      },
      output: () => output,
      socket,
    }
  }
  const waitForOutput = async (
    client: Awaited<ReturnType<typeof connect>>,
    text: string,
  ) => {
    const deadline = Date.now() + 5000
    while (!client.output().includes(text) && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 20))
    expect(client.output()).toContain(text)
  }
  try {
    const sessionToken = randomBytes(32).toString('hex')
    const first = await connect()
    const command = process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
    const args = process.platform === 'win32' ? ['-NoLogo', '-NoProfile'] : []
    await first.invoke('Terminal.create', 1, process.cwd(), command, args, {
      sessionToken,
    })
    const script =
      process.platform === 'win32'
        ? "$savedPid=$PID; Write-Output ('START'+'ED'); Start-Sleep -Seconds 1; Write-Output ('FIN'+'ISHED')\r"
        : "savedPid=$$; printf 'START%s\\n' ED; sleep 1; printf 'FIN%s\\n' ISHED\r"
    await first.invoke('Terminal.write', 1, script)
    await waitForOutput(first, 'STARTED')
    await new Promise<void>((resolve) => {
      first.socket.onclose = () => resolve()
      first.socket.close()
    })
    const second = await connect()
    expect(
      await second.invoke('Terminal.create', 2, process.cwd(), command, args, {
        restoreOnly: true,
        sessionToken,
      }),
    ).toEqual({ attached: true })
    await waitForOutput(second, 'FINISHED')
    await second.invoke('Terminal.resize', 2, 100, 30)
    await second.invoke(
      'Terminal.write',
      2,
      process.platform === 'win32'
        ? "if ($savedPid -eq $PID) { Write-Output ('SAME'+'PROCESS') }\r"
        : 'test "$savedPid" = "$$" && printf \'SAME%s\\n\' PROCESS\r',
    )
    await waitForOutput(second, 'SAMEPROCESS')
    await second.invoke('Terminal.dispose', 2)
    expect(
      await second.invoke('Terminal.create', 3, process.cwd(), command, args, {
        restoreOnly: true,
        sessionToken,
      }),
    ).toEqual({ attached: false })
  } finally {
    for (const socket of clients) socket.close()
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}, 20_000)
