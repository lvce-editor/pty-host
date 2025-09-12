import { test, expect } from '@jest/globals'
import { createE2ETest } from '../src/PtyE2ETest.js'
import { platform } from 'os'

test('should work on all platforms', async () => {
  const e2eTest = createE2ETest({
    input: ['echo platform test', 'exit'],
    expectedOutput: ['platform test']
  })

  await e2eTest.runTest()

  const output = e2eTest.getOutput()
  expect(output).toContain('platform test')
  expect(output).toContain('testuser $')
})

test('should handle Windows-style paths on Windows', async () => {
  if (platform() !== 'win32') {
    return
  }

  const e2eTest = createE2ETest({
    input: ['cd C:\\', 'pwd', 'exit'],
    expectedOutput: ['C:\\']
  })

  await e2eTest.runTest()
})

test('should handle Unix-style paths on Unix systems', async () => {
  if (platform() === 'win32') {
    return
  }

  const e2eTest = createE2ETest({
    input: ['cd /tmp', 'pwd', 'exit'],
    expectedOutput: ['/tmp']
  })

  await e2eTest.runTest()
})

test('should handle different line endings', async () => {
  const e2eTest = createE2ETest({
    input: ['echo line1', 'echo line2', 'exit'],
    expectedOutput: ['line1', 'line2']
  })

  await e2eTest.runTest()

  const output = e2eTest.getOutput()
  // Should handle both \n and \r\n line endings
  expect(output).toContain('line1')
  expect(output).toContain('line2')
})

test('should handle platform-specific commands', async () => {
  const e2eTest = createE2ETest({
    input: ['help', 'exit'],
    expectedOutput: ['Available commands:']
  })

  await e2eTest.runTest()

  const output = e2eTest.getOutput()
  expect(output).toContain('pwd, ls, cd, echo, exit, help, test-command, error-command')
})

test('should handle different terminal sizes', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.start()

  // Test different terminal sizes
  const sizes = [
    { cols: 40, rows: 10 },
    { cols: 80, rows: 24 },
    { cols: 120, rows: 30 },
    { cols: 200, rows: 50 }
  ]

  for (const size of sizes) {
    if ((e2eTest as any).pty && !e2eTest.hasExited()) {
      try {
        (e2eTest as any).pty.resize(size.cols, size.rows)
      } catch (error) {
        // Ignore resize errors if PTY is already closed
        console.warn('Resize failed:', error)
      }
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  await e2eTest.write('echo size test\n')
  await e2eTest.waitForOutput('size test')

  e2eTest.dispose()
})

test('should handle different encoding', async () => {
  const e2eTest = createE2ETest({
    input: ['echo unicode: 你好世界', 'exit'],
    expectedOutput: ['unicode: 你好世界']
  })

  await e2eTest.runTest()
})

test('should handle special characters in commands', async () => {
  const e2eTest = createE2ETest({
    input: [
      'echo "quoted string"',
      'echo unquoted string',
      'echo $special$chars',
      'exit'
    ],
    expectedOutput: [
      'quoted string',
      'unquoted string',
      '$special$chars'
    ]
  })

  await e2eTest.runTest()
})
