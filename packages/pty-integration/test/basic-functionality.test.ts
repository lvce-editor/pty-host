import { test, expect } from '@jest/globals'
import { createIntegrationTest } from '../src/IntegrationTestFramework.ts'

test('should start pty-host process and show prompt', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('testuser $')
})

test('should execute simple command', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['hello world', 'testuser $'],
    input: ['echo hello world'],
  })

  await integrationTest.runTest()
})

test('should handle pwd command', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: [process.cwd()],
    input: ['pwd'],
  })

  await integrationTest.runTest()
})

test('should handle ls command', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['package.json', 'testuser $'],
    input: ['ls'],
  })

  await integrationTest.runTest()
})

test('should handle cd command', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')],
    input: ['cd ..', 'pwd'],
  })

  await integrationTest.runTest()
})

test('should handle unknown command', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['Command not found: unknown-command'],
    input: ['unknown-command'],
  })

  await integrationTest.runTest()
})

test('should handle exit command', async () => {
  const integrationTest = createIntegrationTest({
    input: ['exit'],
  })

  await integrationTest.runTest()

  const exitCode = integrationTest.getExitCode()
  expect(exitCode).toBe(0)
})

test('should handle multiple commands in sequence', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['first command', 'second command', process.cwd()],
    input: ['echo first command', 'echo second command', 'pwd', 'exit'],
  })

  await integrationTest.runTest()
})

test('should handle test-command for verification', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['test-output'],
    input: ['test-command'],
  })

  await integrationTest.runTest()
})

test.skip('should handle error command', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['Command failed'],
    input: ['error-command'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})
