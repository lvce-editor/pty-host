import { expect, jest, test } from '@jest/globals'
import { EventEmitter } from 'node:events'
import * as ConnectionLifecycle from '../src/parts/ConnectionLifecycle/ConnectionLifecycle.ts'

test.each(['Electron message port', 'WebSocket socket'])(
  '%s closes release once',
  async () => {
    const handle = new EventEmitter()
    const parent = { send: jest.fn() }
    ConnectionLifecycle.setParent(parent)
    await ConnectionLifecycle.connect(handle, 17, async () => ({
      dispose: jest.fn(),
      ipc: {},
    }))
    handle.emit('close')
    handle.emit('close')
    expect(parent.send).toHaveBeenCalledTimes(1)
    expect(parent.send).toHaveBeenCalledWith('PtyHost.release', 17)
    expect(handle.listenerCount('close')).toBe(0)
  },
)

test('close during initialization disposes the eventual rpc', async () => {
  const handle = new EventEmitter()
  const parent = { send: jest.fn() }
  ConnectionLifecycle.setParent(parent)
  const ready = Promise.withResolvers<any>()
  const opening = ConnectionLifecycle.connect(handle, 18, () => ready.promise)
  handle.emit('close')
  const rpc = { dispose: jest.fn(), ipc: {} }
  ready.resolve(rpc)
  await opening
  expect(rpc.dispose).toHaveBeenCalledTimes(1)
  expect(parent.send).toHaveBeenCalledTimes(1)
})

test('failed initialization releases the reservation and removes the listener', async () => {
  const handle = new EventEmitter()
  const parent = { send: jest.fn() }
  ConnectionLifecycle.setParent(parent)
  await expect(
    ConnectionLifecycle.connect(handle, 19, async () => {
      throw new Error('upgrade failed')
    }),
  ).rejects.toThrow('upgrade failed')
  expect(parent.send).toHaveBeenCalledWith('PtyHost.release', 19)
  expect(handle.listenerCount('close')).toBe(0)
})
