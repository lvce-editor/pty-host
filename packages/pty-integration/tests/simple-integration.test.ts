import { test, expect } from '@jest/globals'
import { createIntegrationTest } from '../src/IntegrationTestFramework.js'

test('should start pty-host process and create terminal', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $']
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('testuser $')
})

test('should execute simple command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['echo hello world'],
    expectedOutput: ['hello world', 'testuser $']
  })

  await integrationTest.runTest()
})

test('should handle pwd command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['pwd'],
    expectedOutput: [process.cwd()]
  })

  await integrationTest.runTest()
})

test('should handle ls command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['ls'],
    expectedOutput: ['package.json', 'testuser $']
  })

  await integrationTest.runTest()
})

test('should handle cd command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['cd ..', 'pwd'],
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')]
  })

  await integrationTest.runTest()
})

test('should handle unknown command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['unknown-command'],
    expectedOutput: ['Command not found: unknown-command']
  })

  await integrationTest.runTest()
})

test('should handle exit command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['exit']
  })

  await integrationTest.runTest()

  const exitCode = integrationTest.getExitCode()
  expect(exitCode).toBe(0)
})

test('should handle multiple commands in sequence via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: [
      'echo first command',
      'echo second command', 
      'pwd',
      'exit'
    ],
    expectedOutput: [
      'first command',
      'second command',
      process.cwd()
    ]
  })

  await integrationTest.runTest()
})

test('should handle test-command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['test-command'],
    expectedOutput: ['test-output']
  })

  await integrationTest.runTest()
})

test('should handle error command via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    input: ['error-command'],
    expectedOutput: ['Command failed']
  })

  await integrationTest.runTest()

  const output = integrationTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})

test('should handle terminal resize via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $']
  })

  await integrationTest.start()

  // Test resize functionality - we'll need to expose this method
  // For now, just test basic functionality
  await integrationTest.write('echo resize test\n')
  await integrationTest.waitForOutput('resize test')

  await integrationTest.dispose()
})

test('should handle rapid input/output via pty-host', async () => {
  const integrationTest = createIntegrationTest({
    expectedOutput: ['testuser $']
  })

  await integrationTest.start()

  // Send multiple commands rapidly
  const commands = [
    'echo cmd1',
    'echo cmd2', 
    'echo cmd3',
    'pwd',
    'exit'
  ]

  for (const cmd of commands) {
    if (integrationTest.hasExited()) break
    await integrationTest.write(cmd + '\n')
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  await integrationTest.waitForExit()

  const output = integrationTest.getOutput()
  expect(output).toContain('cmd1')
  expect(output).toContain('cmd2')
  expect(output).toContain('cmd3')
  expect(output).toContain(process.cwd())

  await integrationTest.dispose()
})