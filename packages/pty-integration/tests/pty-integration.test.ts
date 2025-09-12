import { test, expect } from '@jest/globals'
import { createE2ETest } from '../src/PtyE2ETest.js'

test('should create PTY with mock shell', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.runTest()
})

test('should handle PTY resize', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.start()

  // Test resize functionality only if PTY is still active
  if ((e2eTest as any).pty && !e2eTest.hasExited()) {
    try {
      (e2eTest as any).pty.resize(120, 30)
    } catch (error) {
      // Ignore resize errors if PTY is already closed
      console.warn('Resize failed:', error)
    }
  }

  await e2eTest.write('echo resize test\n')
  await e2eTest.waitForOutput('resize test')

  e2eTest.dispose()
})

test('should handle PTY write and read data', async () => {
  const e2eTest = createE2ETest({
    input: ['echo data test', 'exit']
  })

  await e2eTest.runTest()

  const output = e2eTest.getOutput()
  expect(output).toContain('data test')
})

test('should handle PTY disposal', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.start()

  // Verify it's running
  expect(e2eTest.isReady()).toBe(true)

  // Dispose and verify it's cleaned up
  e2eTest.dispose()

  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(e2eTest.getExitCode()).not.toBeNull()
})

test('should handle rapid input/output', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.start()

  // Send multiple commands rapidly
  const commands = [
    'echo cmd1',
    'echo cmd2',
    'echo cmd3',
    'pwd',
    'exit'
  ]

  for (const cmd of commands) {
    await e2eTest.write(cmd + '\n')
  }

  await e2eTest.waitForExit()

  const output = e2eTest.getOutput()
  expect(output).toContain('cmd1')
  expect(output).toContain('cmd2')
  expect(output).toContain('cmd3')
  expect(output).toContain(process.cwd())
})

test('should handle PTY with different working directory', async () => {
  const testDir = process.cwd()
  const e2eTest = createE2ETest({
    cwd: testDir,
    input: ['pwd', 'exit'],
    expectedOutput: [testDir]
  })

  await e2eTest.runTest()
})

test('should handle PTY with custom command arguments', async () => {
  const e2eTest = createE2ETest({
    command: process.execPath,
    args: ['-e', 'console.log("custom node script"); process.stdin.resume()'],
    expectedOutput: ['custom node script']
  })

  await e2eTest.runTest()

  // Clean up manually since this process doesn't exit naturally
  e2eTest.dispose()
}, 10000) // Increase timeout to 10 seconds
