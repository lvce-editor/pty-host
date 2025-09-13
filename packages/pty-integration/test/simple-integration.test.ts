import { test, expect } from '@jest/globals'
import { createSimpleIntegrationTest } from '../src/SimpleIntegrationTestFramework.ts'

test.skip('should start ptyHost and show prompt', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: ['testuser $'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('testuser $')
})

test.skip('should execute simple command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['echo hello world'],
    expectedOutput: ['hello world', 'testuser $'],
  })

  await integrationTest.runTest()
})

test.skip('should handle pwd command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['pwd'],
    expectedOutput: [process.cwd()],
  })

  await integrationTest.runTest()
})

test.skip('should handle ls command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['ls'],
    expectedOutput: ['package.json', 'testuser $'],
  })

  await integrationTest.runTest()
})

test.skip('should handle cd command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['cd ..', 'pwd'],
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')],
  })

  await integrationTest.runTest()
})

test.skip('should handle unknown command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['unknown-command'],
    expectedOutput: ['Command not found: unknown-command'],
  })

  await integrationTest.runTest()
})

test.skip('should handle exit command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['exit'],
  })

  await integrationTest.runTest()

  const exitCode = integrationTest.getExitCode()
  expect(exitCode).toBe(0)
})

test.skip('should handle multiple commands in sequence', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['echo first command', 'echo second command', 'pwd', 'exit'],
    expectedOutput: ['first command', 'second command', process.cwd()],
  })

  await integrationTest.runTest()
})

test.skip('should handle test-command for verification', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['test-command'],
    expectedOutput: ['test-output'],
  })

  await integrationTest.runTest()
})

test.skip('should handle terminal resize', async () => {
  const integrationTest = createSimpleIntegrationTest({
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

test.skip('should handle error command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    input: ['error-command'],
    expectedOutput: ['Command failed'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})
