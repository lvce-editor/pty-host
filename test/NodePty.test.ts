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

// test.skip('Terminal echo', async () => {
//   await new Promise((resolve) => {
//     // @ts-ignore
//     const terminal = create({
//       env: {
//         TEST: '`',
//       },
//       handleData(data) {
//         if (data.toString().includes('`')) {
//           terminal.dispose()
//           // @ts-ignore
//           resolve()
//         }
//       },
//     })
//     terminal.write('echo $TEST\n')
//   })
// })
