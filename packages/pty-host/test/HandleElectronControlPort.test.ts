import { expect, jest, test } from '@jest/globals'
import { EventEmitter } from 'node:events'

const rpc = { dispose: jest.fn(), ipc: {}, send: jest.fn() }
const create = jest.fn(async () => rpc)
const Handler = await import('../src/parts/HandleElectronMessagePort/HandleElectronMessagePort.ts')

test('control port receives releases for terminal ports and is never ref-counted as a terminal', async () => {
  const control = new EventEmitter()
  await Handler.handleMessagePortWithDependencies(control, 1, undefined, create)
  expect(control.listenerCount('close')).toBe(0)
  const terminal = new EventEmitter()
  await Handler.handleMessagePortWithDependencies(terminal, undefined, 25, create)
  terminal.emit('close')
  expect(rpc.send).toHaveBeenCalledWith('PtyHost.release', 25)
  expect(rpc.send).toHaveBeenCalledTimes(1)
})
