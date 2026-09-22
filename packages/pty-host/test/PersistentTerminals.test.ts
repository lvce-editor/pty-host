/* eslint-disable jest/no-restricted-jest-methods -- Virtual time verifies the exact two-minute expiry without sleeping in CI. */
import { afterEach, expect, jest, test } from '@jest/globals'
import { DataEvent } from '../src/parts/DataEvent/DataEvent.ts'
import { ExitEvent } from '../src/parts/ExitEvent/ExitEvent.ts'
import * as PersistentTerminals from '../src/parts/PersistentTerminals/PersistentTerminals.ts'
import * as PtyController from '../src/parts/PtyController/PtyController.ts'
import * as PtyState from '../src/parts/PtyState/PtyState.ts'

class MockPty extends EventTarget {
  dispose = jest.fn()
  pause = jest.fn()
  resume = jest.fn()
  resize = jest.fn()
  write = jest.fn()
}
const owners: object[] = []
const connect = () => {
  const ipc = { send: jest.fn() }
  owners.push(ipc)
  PersistentTerminals.authorize(ipc)
  return ipc
}
const token = (n: number) => n.toString(16).padStart(64, '0')
const flush = () => new Promise((resolve) => setTimeout(resolve, 20))
afterEach(() => {
  for (const ipc of owners) {
    for (let id = 1; id <= 4; id++) PtyController.dispose(ipc, id)
    void PtyController.disposeConnection(ipc)
  }
  owners.length = 0
  jest.useRealTimers()
})

test('only authenticated SSH connections can retain terminals', async () => {
  await expect(
    PersistentTerminals.create(
      {},
      1,
      token(1),
      false,
      async () => new MockPty(),
    ),
  ).rejects.toThrow('authenticated SSH')
  await expect(
    PersistentTerminals.create(
      connect(),
      1,
      'guessable',
      false,
      async () => new MockPty(),
    ),
  ).rejects.toThrow('capability')
})

test('reload restores the same process and screen, with input and resize', async () => {
  const first = connect()
  const pty = new MockPty()
  const spawn = jest.fn(async () => pty)
  await PersistentTerminals.create(first, 1, token(2), false, spawn)
  pty.dispatchEvent(new DataEvent('before\r\n'))
  const released = PtyController.disposeConnection(first)
  pty.dispatchEvent(new DataEvent('during'))
  const second = connect()
  expect(
    await PersistentTerminals.create(second, 2, token(2), true, spawn),
  ).toEqual({ attached: true })
  await released
  expect(spawn).toHaveBeenCalledTimes(1)
  expect(pty.dispose).not.toHaveBeenCalled()
  expect(second.send.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      params: [
        2,
        'handleRestore',
        {
          columns: 80,
          data: expect.stringContaining('before\r\nduring'),
          rows: 24,
        },
      ],
    }),
  )
  PtyController.write(second, 2, 'echo test\r')
  PtyController.resize(second, 2, 100, 30)
  expect(pty.write).toHaveBeenCalledWith('echo test\r')
  expect(pty.resize).toHaveBeenCalledWith(100, 30)
  pty.dispatchEvent(new DataEvent('after'))
  await flush()
  expect(second.send.mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({ params: [2, 'handleData', 'after'] }),
  )
})

test('new owner fences delayed close and dispose from the previous connection', async () => {
  const first = connect()
  const second = connect()
  const pty = new MockPty()
  await PersistentTerminals.create(first, 1, token(3), false, async () => pty)
  await PersistentTerminals.create(second, 1, token(3), true, async () => {
    throw new Error('must not spawn')
  })
  PtyController.dispose(first, 1)
  void PtyController.disposeConnection(first)
  expect(pty.dispose).not.toHaveBeenCalled()
  expect(PtyState.get(first, 1)).toBeUndefined()
  PtyController.dispose(second, 1)
  expect(pty.dispose).toHaveBeenCalledTimes(1)
  expect(
    await PersistentTerminals.create(
      connect(),
      1,
      token(3),
      true,
      async () => pty,
    ),
  ).toEqual({ attached: false })
})

test('different window capabilities never attach to one another', async () => {
  const first = connect()
  const second = connect()
  const pty = new MockPty()
  await PersistentTerminals.create(first, 1, token(4), false, async () => pty)
  expect(
    await PersistentTerminals.create(
      second,
      1,
      token(5),
      true,
      async () => pty,
    ),
  ).toEqual({ attached: false })
  expect(PtyState.get(second, 1)).toBeUndefined()
  expect(PtyState.get(first, 1)).toBeDefined()
})

test('abandoned terminal expires once within two minutes', async () => {
  const ipc = connect()
  const pty = new MockPty()
  await PersistentTerminals.create(ipc, 1, token(6), false, async () => pty)
  jest.useFakeTimers()
  const released = PtyController.disposeConnection(ipc)
  jest.advanceTimersByTime(PersistentTerminals.reconnectTimeout - 1)
  expect(pty.dispose).not.toHaveBeenCalled()
  jest.advanceTimersByTime(1)
  await released
  expect(pty.dispose).toHaveBeenCalledTimes(1)
  expect(
    await PersistentTerminals.create(
      connect(),
      1,
      token(6),
      true,
      async () => pty,
    ),
  ).toEqual({ attached: false })
})

test('detached process exit cancels expiry and releases resources', async () => {
  const ipc = connect()
  const pty = new MockPty()
  await PersistentTerminals.create(ipc, 1, token(7), false, async () => pty)
  const released = PtyController.disposeConnection(ipc)
  pty.dispatchEvent(new ExitEvent({ exitCode: 0, signal: 0 }))
  await released
  expect(pty.dispose).not.toHaveBeenCalled()
  expect(
    await PersistentTerminals.create(
      connect(),
      1,
      token(7),
      true,
      async () => pty,
    ),
  ).toEqual({ attached: false })
})

test('repeated reconnects cancel old expiry timers and preserve only the newest binding', async () => {
  const pty = new MockPty()
  let ipc = connect()
  await PersistentTerminals.create(ipc, 1, token(8), false, async () => pty)
  for (let index = 0; index < 10; index++) {
    const released = PtyController.disposeConnection(ipc)
    ipc = connect()
    await PersistentTerminals.create(ipc, 1, token(8), true, async () => pty)
    await released
  }
  expect(pty.dispose).not.toHaveBeenCalled()
  PtyController.dispose(ipc, 1)
  expect(pty.dispose).toHaveBeenCalledTimes(1)
})

test('expiry while spawning kills the eventual process and never binds it', async () => {
  const ipc = connect()
  const opening = Promise.withResolvers<MockPty>()
  const result = PersistentTerminals.create(
    ipc,
    1,
    token(9),
    false,
    () => opening.promise,
  )
  jest.useFakeTimers()
  const released = PtyController.disposeConnection(ipc)
  jest.advanceTimersByTime(PersistentTerminals.reconnectTimeout)
  await released
  const pty = new MockPty()
  opening.resolve(pty)
  expect(await result).toEqual({ attached: false })
  expect(pty.dispose).toHaveBeenCalledTimes(1)
  expect(PtyState.get(ipc, 1)).toBeUndefined()
})

test('snapshot bounds scrollback and preserves dimensions', async () => {
  const first = connect()
  const pty = new MockPty()
  await PersistentTerminals.create(first, 1, token(10), false, async () => pty)
  PtyController.resize(first, 1, 100, 30)
  pty.dispatchEvent(
    new DataEvent('old-marker\r\n' + 'line\r\n'.repeat(3000) + 'new-marker'),
  )
  const released = PtyController.disposeConnection(first)
  const second = connect()
  await PersistentTerminals.create(second, 1, token(10), true, async () => pty)
  await released
  const snapshot = (second.send.mock.calls[0][0] as any).params[2]
  expect(snapshot.columns).toBe(100)
  expect(snapshot.rows).toBe(30)
  expect(snapshot.data).not.toContain('old-marker')
  expect(snapshot.data).toContain('new-marker')
  expect(snapshot.data.length).toBeLessThan(10_000)
})

test('parser backpressure pauses and resumes high-volume output', async () => {
  const ipc = connect()
  const pty = new MockPty()
  await PersistentTerminals.create(ipc, 1, token(11), false, async () => pty)
  pty.dispatchEvent(new DataEvent('x'.repeat(70_000)))
  expect(pty.pause).toHaveBeenCalled()
  await flush()
  expect(pty.resume).toHaveBeenCalled()
})
