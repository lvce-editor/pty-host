import { test, expect } from '@jest/globals'
import { createIntegrationTest } from '../src/IntegrationTestFramework.js'

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
    input: ['echo hello world'],
    expectedOutput: ['hello world', 'testuser $'],
  })

  await integrationTest.runTest()
})

test('should handle pwd command', async () => {
  const integrationTest = createIntegrationTest({
    input: ['pwd'],
    expectedOutput: [process.cwd()],
  })

  await integrationTest.runTest()
})

test('should handle ls command', async () => {
  const integrationTest = createIntegrationTest({
    input: ['ls'],
    expectedOutput: ['package.json', 'testuser $'],
  })

  await integrationTest.runTest()
})

test('should handle cd command', async () => {
  const integrationTest = createIntegrationTest({
    input: ['cd ..', 'pwd'],
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')],
  })

  await integrationTest.runTest()
})

test('should handle unknown command', async () => {
  const integrationTest = createIntegrationTest({
    input: ['unknown-command'],
    expectedOutput: ['Command not found: unknown-command'],
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
    input: ['echo first command', 'echo second command', 'pwd', 'exit'],
    expectedOutput: ['first command', 'second command', process.cwd()],
  })

  await integrationTest.runTest()
})

test('should handle test-command for verification', async () => {
  const integrationTest = createIntegrationTest({
    input: ['test-command'],
    expectedOutput: ['test-output'],
  })

  await integrationTest.runTest()
})

test.skip('should handle error command', async () => {
  const integrationTest = createIntegrationTest({
    input: ['error-command'],
    expectedOutput: ['Command failed'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})
