import { test, expect } from '@jest/globals'
import { platform } from 'node:os'
import { setTimeout } from 'node:timers/promises'
import { createIntegrationTest } from '../src/IntegrationTestFramework.ts'

test('should work on all platforms', async () => {
  const integrationTest = createIntegrationTest({
    input: ['echo platform test', 'exit'],
    expectedOutput: ['platform test'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('platform test')
  expect(output).toContain('testuser $')
})

test('should handle Windows-style paths on Windows', async () => {
  if (platform() !== 'win32') {
    return
  }

  const integrationTest = createIntegrationTest({
    input: ['cd C:\\', 'pwd', 'exit'],
    expectedOutput: ['C:\\'],
  })

  await integrationTest.runTest()
})

test('should handle Unix-style paths on Unix systems', async () => {
  if (platform() === 'win32') {
    return
  }

  const integrationTest = createIntegrationTest({
    input: ['cd /tmp', 'pwd', 'exit'],
    expectedOutput: ['/tmp'],
  })

  await integrationTest.runTest()
})

test('should handle different line endings', async () => {
  const integrationTest = createIntegrationTest({
    input: ['echo line1', 'echo line2', 'exit'],
    expectedOutput: ['line1', 'line2'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  // Should handle both \n and \r\n line endings
  expect(output).toContain('line1')
  expect(output).toContain('line2')
})

test('should handle platform-specific commands', async () => {
  const integrationTest = createIntegrationTest({
    input: ['help', 'exit'],
    expectedOutput: ['Available commands:'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain(
    'pwd, ls, cd, echo, exit, help, test-command, error-command',
  )
})

test('should handle different terminal sizes', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.start()

  // Test different terminal sizes
  const sizes = [
    { cols: 40, rows: 10 },
    { cols: 80, rows: 24 },
    { cols: 120, rows: 30 },
    { cols: 200, rows: 50 },
  ]

  for (const size of sizes) {
    if ((integrationTest as any).pty && !integrationTest.hasExited()) {
      try {
        ;(integrationTest as any).pty.resize(size.cols, size.rows)
      } catch (error) {
        // Ignore resize errors if PTY is already closed
        console.warn('Resize failed:', error)
      }
    }
    await setTimeout(50)
  }

  await integrationTest.write('echo size test\n')
  await integrationTest.waitForOutput('size test')

  await integrationTest.dispose()
})

test('should handle different encoding', async () => {
  const integrationTest = createIntegrationTest({
    input: ['echo unicode: 你好世界', 'exit'],
    expectedOutput: ['unicode: 你好世界'],
  })

  await integrationTest.runTest()
})

test('should handle special characters in commands', async () => {
  const integrationTest = createIntegrationTest({
    input: [
      'echo "quoted string"',
      'echo unquoted string',
      'echo $special$chars',
      'exit',
    ],
    expectedOutput: ['quoted string', 'unquoted string', '$special$chars'],
  })

  await integrationTest.runTest()
})
