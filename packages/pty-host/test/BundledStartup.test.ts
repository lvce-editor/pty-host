import { expect, test } from '@jest/globals'
import { fork } from 'node:child_process'
import { once } from 'node:events'

test('the bundled terminal process starts and shuts down over its control connection', async () => {
  const child = fork(
    new URL('../../../.tmp/dist/dist/ptyHostMain.js', import.meta.url),
    ['--ipc-type=node-forked-process'],
    { execArgv: [], silent: true, timeout: 5000 },
  )
  let stderr = ''
  let ready = false
  child.stderr!.setEncoding('utf8')
  child.stderr!.on('data', (data: string) => {
    stderr += data
  })
  child.on('message', (message) => {
    if (message !== 'ready') {
    	return;
    }

    ready = true
    child.send({
      id: 1,
      jsonrpc: '2.0',
      method: 'TerminalProcess.dispose',
      params: [],
    })
  })
  try {
    const [code, signal] = await once(child, 'close')
    expect({ code, ready, signal, stderr }).toEqual({
      code: 0,
      ready: true,
      signal: null,
      stderr: '',
    })
  } finally {
    if (child.exitCode === null) child.kill()
  }
}, 10_000)
