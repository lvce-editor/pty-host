import { beforeEach, expect, jest, test } from '@jest/globals'
import { DataEvent } from '../src/parts/DataEvent/DataEvent.ts'
import { ExitEvent } from '../src/parts/ExitEvent/ExitEvent.ts'

class MockPty extends EventTarget {
  dispose = jest.fn()
  resize = jest.fn()
  write = jest.fn()
}

let mockPty: MockPty
const ptyCreate = jest.fn(async () => mockPty)

jest.unstable_mockModule('../src/parts/Pty/Pty.js', () => ({
  create: ptyCreate,
}))

const PtyController = await import('../src/parts/PtyController/PtyController.js')
const PtyState = await import('../src/parts/PtyState/PtyState.js')

beforeEach(() => {
  jest.clearAllMocks()
  mockPty = new MockPty()
  PtyState.remove(1)
})

test('create forwards data and exit events', async () => {
  const ipc = {
    send: jest.fn(),
  }
  await PtyController.create(ipc, 1, '/workspace', '/bin/bash', [])

  mockPty.dispatchEvent(new DataEvent('hello'))
  mockPty.dispatchEvent(new ExitEvent({ exitCode: 0, signal: 0 }))

  expect(ipc.send).toHaveBeenNthCalledWith(1, {
    jsonrpc: '2.0',
    method: 'Viewlet.send',
    params: [1, 'handleData', 'hello'],
  })
  expect(ipc.send).toHaveBeenNthCalledWith(2, {
    jsonrpc: '2.0',
    method: 'Viewlet.send',
    params: [1, 'handleExit', { exitCode: 0, signal: 0 }],
  })
  expect(PtyState.get(1)).toBeUndefined()
})

test('dispose kills and removes a running pty', async () => {
  await PtyController.create({ send: jest.fn() }, 1, '/workspace', '/bin/bash', [])

  PtyController.dispose(1)

  expect(mockPty.dispose).toHaveBeenCalledTimes(1)
  expect(PtyState.get(1)).toBeUndefined()
})

test('dispose does nothing after the pty has exited', async () => {
  await PtyController.create({ send: jest.fn() }, 1, '/workspace', '/bin/bash', [])
  mockPty.dispatchEvent(new ExitEvent({ exitCode: 0, signal: 0 }))

  expect(() => PtyController.dispose(1)).not.toThrow()
  expect(mockPty.dispose).not.toHaveBeenCalled()
})
