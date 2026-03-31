import { expect, test } from '@jest/globals'
import * as ExecuteShellCommand from '../src/parts/ExecuteShellCommand/ExecuteShellCommand.js'

test('executeShellCommand - success', async () => {
  const result = await ExecuteShellCommand.executeShellCommand({
    args: ['-e', 'process.stdout.write("out"); process.stderr.write("err")'],
    cwd: process.cwd(),
    toSpawn: process.execPath,
  })

  expect(result).toEqual({
    exitCode: 0,
    stderr: 'err',
    stdout: 'out',
  })
})

test('executeShellCommand - error', async () => {
  const result = await ExecuteShellCommand.executeShellCommand({
    args: [],
    cwd: process.cwd(),
    toSpawn: 'command-that-does-not-exist',
  })

  expect(result).toMatchObject({
    error: {
      code: 'ENOENT',
      path: 'command-that-does-not-exist',
      syscall: 'spawn command-that-does-not-exist',
    },
  })
})
