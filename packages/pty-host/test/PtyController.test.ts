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
})

test('create forwards data and exit events', async () => {
  const ipc = {
    send: jest.fn(),
  }
  const mockPty = new MockPty()
  await PtyController.createWithDependencies(
    ipc,
    1,
    '/workspace',
    '/bin/bash',
    [],
    async () => mockPty,
  )

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
  expect(PtyState.get(ipc, 1)).toBeUndefined()
})

test('dispose kills and removes a running pty', async () => {
  const mockPty = new MockPty()
  const ipc = { send: jest.fn() }
  await PtyController.createWithDependencies(
    ipc,
    1,
    '/workspace',
    '/bin/bash',
    [],
    async () => mockPty,
  )

  PtyController.dispose(ipc, 1)

  expect(mockPty.dispose).toHaveBeenCalledTimes(1)
  expect(PtyState.get(ipc, 1)).toBeUndefined()
})

test('dispose does nothing after the pty has exited', async () => {
  const mockPty = new MockPty()
  const ipc = { send: jest.fn() }
  await PtyController.createWithDependencies(
    ipc,
    1,
    '/workspace',
    '/bin/bash',
    [],
    async () => mockPty,
  )
  mockPty.dispatchEvent(new ExitEvent({ exitCode: 0, signal: 0 }))

  expect(() => PtyController.dispose(ipc, 1)).not.toThrow()
  expect(mockPty.dispose).not.toHaveBeenCalled()
})

test('window close disposes its terminals but preserves another window', async () => {
  const first = { send: jest.fn() }
  const second = { send: jest.fn() }
  const firstPty = new MockPty()
  const secondPty = new MockPty()
  await PtyController.createWithDependencies(
    first,
    11,
    '/',
    'bash',
    [],
    async () => firstPty,
  )
  await PtyController.createWithDependencies(
    second,
    12,
    '/',
    'bash',
    [],
    async () => secondPty,
  )
  PtyController.disposeConnection(first)
  PtyController.disposeConnection(first)
  expect(firstPty.dispose).toHaveBeenCalledTimes(1)
  expect(secondPty.dispose).not.toHaveBeenCalled()
  firstPty.dispatchEvent(new DataEvent('late'))
  expect(first.send).not.toHaveBeenCalled()
  PtyController.disposeConnection(second)
})

test('window close during pty creation kills the late pty', async () => {
  const ipc = { send: jest.fn() }
  const ready = Promise.withResolvers<MockPty>()
  const opening = PtyController.createWithDependencies(
    ipc,
    13,
    '/',
    'bash',
    [],
    () => ready.promise,
  )
  PtyController.disposeConnection(ipc)
  const pty = new MockPty()
  ready.resolve(pty)
  await expect(opening).rejects.toThrow('connection closed')
  expect(pty.dispose).toHaveBeenCalledTimes(1)
  expect(PtyState.get(ipc, 13)).toBeUndefined()
})

test('terminal ids are scoped to their connection', async () => {
  const first = { send: jest.fn() }
  const second = { send: jest.fn() }
  const firstPty = new MockPty()
  const secondPty = new MockPty()
  await PtyController.createWithDependencies(
    first,
    21,
    '/',
    'bash',
    [],
    async () => firstPty,
  )
  await PtyController.createWithDependencies(
    second,
    21,
    '/',
    'bash',
    [],
    async () => secondPty,
  )
  PtyController.write(first, 21, 'first')
  PtyController.resize(second, 21, 100, 40)
  expect(firstPty.write).toHaveBeenCalledWith('first')
  expect(secondPty.write).not.toHaveBeenCalled()
  expect(secondPty.resize).toHaveBeenCalledWith(100, 40)
  PtyController.dispose(first, 21)
  expect(firstPty.dispose).toHaveBeenCalledTimes(1)
  expect(secondPty.dispose).not.toHaveBeenCalled()
  expect(PtyState.get(second, 21)).toBe(secondPty)
  PtyController.disposeConnection(second)
})
