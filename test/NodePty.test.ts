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
    args: []
  })

  let allData = ''
  Pty.onData(pty, (data) => {
    allData += data
  })
  Pty.write(pty, 'abc')
  // @ts-ignore
  await waitForExpect(() => {
    expect(allData).toContain('abc')
  })

  pty.kill()
})



test('print data', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = Pty.create({
    cwd: process.cwd(),
    command: process.execPath,
    args: ['-e', 'console.log("abc")']
  })

  let allData = ''
  Pty.onData(pty, (data) => {
    allData += data
  })
  // @ts-ignore
  await waitForExpect(() => {
    expect(allData).toContain('abc')
  })

  pty.kill()
})



test('handle exec error', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = Pty.create({
    cwd: process.cwd(),
    command: '/test/does-not-exist',
    args: []
  })

  let exited = null
  pty.onExit((event) => {
    // @ts-ignore
    exited = event
  })
  // @ts-ignore
  await waitForExpect(() => {
    // @ts-ignore
    expect(exited.exitCode).toBe(1)
  })
  pty.kill()
})
