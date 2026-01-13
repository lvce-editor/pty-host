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
    expectedOutput: ['hello world', 'testuser $'],
    input: ['echo hello world'],
  })

  await integrationTest.runTest()
})

test.skip('should handle pwd command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: [process.cwd()],
    input: ['pwd'],
  })

  await integrationTest.runTest()
})

test.skip('should handle ls command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: ['package.json', 'testuser $'],
    input: ['ls'],
  })

  await integrationTest.runTest()
})

test.skip('should handle cd command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')],
    input: ['cd ..', 'pwd'],
  })

  await integrationTest.runTest()
})

test.skip('should handle unknown command', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: ['Command not found: unknown-command'],
    input: ['unknown-command'],
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
    expectedOutput: ['first command', 'second command', process.cwd()],
    input: ['echo first command', 'echo second command', 'pwd', 'exit'],
  })

  await integrationTest.runTest()
})

test.skip('should handle test-command for verification', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: ['test-output'],
    input: ['test-command'],
  })

  await integrationTest.runTest()
})

test.skip('should handle terminal resize', async () => {
  const integrationTest = createSimpleIntegrationTest({
    expectedOutput: ['resize test'],
    input: ['echo resize test'],
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
    expectedOutput: ['Command failed'],
    input: ['error-command'],
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})
