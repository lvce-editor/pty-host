import { test, expect } from '@jest/globals'
import { createSocketBasedIntegrationTest } from '../src/SocketBasedIntegrationTestFramework.ts'

test.skip('should start ptyHost and show prompt via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('testuser $')
})

test.skip('should execute simple command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['echo hello world'],
    expectedOutput: ['hello world', 'testuser $'],
  })

  await integrationTest.runTest()
})

test.skip('should handle pwd command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['pwd'],
    expectedOutput: [process.cwd()],
  })

  await integrationTest.runTest()
})

test.skip('should handle ls command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['ls'],
    expectedOutput: ['package.json', 'testuser $'],
  })

  await integrationTest.runTest()
})

test.skip('should handle cd command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['cd ..', 'pwd'],
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')],
  })

  await integrationTest.runTest()
})

test.skip('should handle unknown command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['unknown-command'],
    expectedOutput: ['Command not found: unknown-command'],
  })

  await integrationTest.runTest()
})

test.skip('should handle exit command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['exit'],
  })

  await integrationTest.runTest()

  const exitCode = integrationTest.getExitCode()
  expect(exitCode).toBe(0)
})

test.skip('should handle multiple commands in sequence via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['echo first command', 'echo second command', 'pwd', 'exit'],
    expectedOutput: ['first command', 'second command', process.cwd()],
  })

  await integrationTest.runTest()
})

test.skip('should handle test-command for verification via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['test-command'],
    expectedOutput: ['test-output'],
  })

  await integrationTest.runTest()
})

test.skip('should handle terminal resize via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['echo resize test'],
    expectedOutput: ['resize test'],
  })

  await integrationTest.start()

  // Test resize functionality
  await integrationTest.resize(120, 30)
  await integrationTest.write('echo after resize\n')
  await integrationTest.waitForOutput('after resize')

  await integrationTest.dispose()
})

test.skip('should handle error command via socket', async () => {
  const integrationTest = createSocketBasedIntegrationTest({
    input: ['error-command'],
    expectedOutput: ['Command failed'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})
