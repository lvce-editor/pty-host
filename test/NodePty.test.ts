import waitForExpect from 'wait-for-expect'
import * as Pty from '../src/parts/Pty/Pty.js'
import { test, expect } from '@jest/globals'

test('pty', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = Pty.create({
    cwd: process.cwd(),
    command: '/bin/bash',
    args: [],
  })

  let allData = ''
  pty.addEventListener('data', (event) => {
    // @ts-ignore
    allData += event.data
  })

  pty.write('abc')

  // @ts-ignore
  await waitForExpect(() => {
    expect(allData).toContain('abc')
  })

  pty.dispose()
})

test('print data', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = Pty.create({
    cwd: process.cwd(),
    command: process.execPath,
    args: ['-e', 'console.log("abc")'],
  })

  let allData = ''
  pty.addEventListener('data', (event) => {
    // @ts-ignore
    allData += event.data
  })
  // @ts-ignore
  await waitForExpect(() => {
    expect(allData).toContain('abc')
  })

  pty.dispose()
})

test('handle exec error', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = Pty.create({
    cwd: process.cwd(),
    command: '/test/does-not-exist',
    args: [],
  })

  let exited = null
  pty.addEventListener('exit', (event) => {
    // @ts-ignore
    exited = event.data
  })
  // @ts-ignore
  await waitForExpect(() => {
    // @ts-ignore
    expect(exited.exitCode).toBe(1)
  })

  pty.dispose()
})
