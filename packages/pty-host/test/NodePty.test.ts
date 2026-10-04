import { test, expect } from '@jest/globals'
import waitForExpect from 'wait-for-expect'
import * as Pty from '../src/parts/Pty/Pty.js'

// TODO move this to integration test / e2e test

test('pty', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = await Pty.create({
    args: [],
    command: '/bin/bash',
    // @ts-ignore
    cwd: process.cwd(),
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
  const pty = await Pty.create({
    args: ['-e', 'console.log("abc")'],
    command: process.execPath,
    // @ts-ignore
    cwd: process.cwd(),
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
  const pty = await Pty.create({
    args: [],
    command: '/test/does-not-exist',
    // @ts-ignore
    cwd: process.cwd(),
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

test('applies child environment overrides while retaining the host environment', async () => {
  if (process.platform === 'win32') return
  const previous = process.env.LVCE_TEST_TERMINAL_INHERITED
  process.env.LVCE_TEST_TERMINAL_INHERITED = 'inherited'
  let pty
  try {
    pty = await Pty.create({
      args: [
        '-e',
        'process.stdin.resume(); console.log(process.env.LVCE_TEST_TERMINAL_CHILD + ":" + process.env.LVCE_TEST_TERMINAL_INHERITED)',
      ],
      command: process.execPath,
      cwd: process.cwd(),
      env: { LVCE_TEST_TERMINAL_CHILD: 'child' },
    })
    let data = ''
    pty.addEventListener('data', (event) => {
      data += (event as any).data
    })
    await waitForExpect(() => expect(data).toContain('child:inherited'))
    expect(process.env.LVCE_TEST_TERMINAL_CHILD).toBeUndefined()
  } finally {
    pty?.dispose()
    if (previous === undefined) delete process.env.LVCE_TEST_TERMINAL_INHERITED
    else process.env.LVCE_TEST_TERMINAL_INHERITED = previous
  }
})
