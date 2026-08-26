import { beforeEach, expect, jest, test } from '@jest/globals'
import { DataEvent } from '../src/parts/DataEvent/DataEvent.ts'
import { ExitEvent } from '../src/parts/ExitEvent/ExitEvent.ts'
import * as PtyController from '../src/parts/PtyController/PtyController.ts'
import * as PtyState from '../src/parts/PtyState/PtyState.ts'

class MockPty extends EventTarget {
  dispose = jest.fn()
  resize = jest.fn()
  write = jest.fn()
}

beforeEach(() => {
  jest.clearAllMocks()
  PtyState.remove(1)
})

test('create forwards data and exit events', async () => {
  const ipc = {
    send: jest.fn(),
  }
  const mockPty = new MockPty()
  await PtyController.createWithDependencies(ipc, 1, '/workspace', '/bin/bash', [], async () => mockPty)

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
  const mockPty = new MockPty()
  await PtyController.createWithDependencies({ send: jest.fn() }, 1, '/workspace', '/bin/bash', [], async () => mockPty)

  PtyController.dispose(1)

  expect(mockPty.dispose).toHaveBeenCalledTimes(1)
  expect(PtyState.get(1)).toBeUndefined()
})

test('dispose does nothing after the pty has exited', async () => {
  const mockPty = new MockPty()
  await PtyController.createWithDependencies({ send: jest.fn() }, 1, '/workspace', '/bin/bash', [], async () => mockPty)
  mockPty.dispatchEvent(new ExitEvent({ exitCode: 0, signal: 0 }))

  expect(() => PtyController.dispose(1)).not.toThrow()
  expect(mockPty.dispose).not.toHaveBeenCalled()
})
