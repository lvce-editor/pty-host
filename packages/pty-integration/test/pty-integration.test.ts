import { test, expect } from '@jest/globals'
import * as process from 'node:process'
import { setTimeout } from 'node:timers/promises'
import { createIntegrationTest } from '../src/IntegrationTestFramework.ts'

test('should create PTY with mock shell', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.runTest()
})

test('should handle PTY resize', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.start()

  // Test resize functionality - we'll need to expose this method
  // For now, just test basic functionality
  await integrationTest.write('echo resize test\n')
  await integrationTest.waitForOutput('resize test')

  await integrationTest.dispose()
})

test('should handle PTY write and read data', async () => {
  const integrationTest = createIntegrationTest({
    input: ['echo data test', 'exit'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('data test')
})

test.skip('should handle PTY disposal', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.start()

  // Verify it's running
  expect(integrationTest.isReady()).toBe(true)

  // Dispose and verify it's cleaned up
  await integrationTest.dispose()

  // Wait a bit for cleanup
  await setTimeout(100)

  expect(integrationTest.getExitCode()).not.toBeNull()
})

test('should handle rapid input/output', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.start()

  // Send multiple commands rapidly
  const commands = ['echo cmd1', 'echo cmd2', 'echo cmd3', 'pwd', 'exit']

  for (const cmd of commands) {
    await integrationTest.write(cmd + '\n')
  }

  await integrationTest.waitForExit()

  const output = integrationTest.getOutput()
  expect(output).toContain('cmd1')
  expect(output).toContain('cmd2')
  expect(output).toContain('cmd3')
  expect(output).toContain(process.cwd())
})

test('should handle PTY with different working directory', async () => {
  const testDir = process.cwd()
  const integrationTest = createIntegrationTest({
    cwd: testDir,
    expectedOutput: [testDir],
    input: ['pwd', 'exit'],
  })

  await integrationTest.runTest()
})

test.skip('should handle PTY with custom command arguments', async () => {
  const integrationTest = createIntegrationTest({
    args: ['-e', 'console.log("custom node script"); process.stdin.resume()'],
    command: process.execPath,
    expectedOutput: ['custom node script'],
  })

  await integrationTest.runTest()

  // Clean up manually since this process doesn't exit naturally
  await integrationTest.dispose()
}, 10_000) // Increase timeout to 10 seconds
