import { test, expect } from '@jest/globals'
import { createE2ETest } from '../src/PtyE2ETest.js'

test('should start mock shell and show prompt', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.runTest()

  const output = e2eTest.getOutput()
  expect(output).toContain('testuser $')
})

test('should execute simple command', async () => {
  const e2eTest = createE2ETest({
    input: ['echo hello world'],
    expectedOutput: ['hello world', 'testuser $']
  })

  await e2eTest.runTest()
})

test('should handle pwd command', async () => {
  const e2eTest = createE2ETest({
    input: ['pwd'],
    expectedOutput: [process.cwd()]
  })

  await e2eTest.runTest()
})

test('should handle ls command', async () => {
  const e2eTest = createE2ETest({
    input: ['ls'],
    expectedOutput: ['package.json', 'testuser $']
  })

  await e2eTest.runTest()
})

test('should handle cd command', async () => {
  const e2eTest = createE2ETest({
    input: ['cd ..', 'pwd'],
    expectedOutput: [process.cwd().split('/').slice(0, -1).join('/')]
  })

  await e2eTest.runTest()
})

test('should handle unknown command', async () => {
  const e2eTest = createE2ETest({
    input: ['unknown-command'],
    expectedOutput: ['Command not found: unknown-command']
  })

  await e2eTest.runTest()
})

test('should handle exit command', async () => {
  const e2eTest = createE2ETest({
    input: ['exit']
  })

  await e2eTest.runTest()

  const exitCode = e2eTest.getExitCode()
  expect(exitCode).toBe(0)
})

test('should handle multiple commands in sequence', async () => {
  const e2eTest = createE2ETest({
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

  await e2eTest.runTest()
})

test('should handle test-command for verification', async () => {
  const e2eTest = createE2ETest({
    input: ['test-command'],
    expectedOutput: ['test-output']
  })

  await e2eTest.runTest()
})

test('should handle error command', async () => {
  const e2eTest = createE2ETest({
    input: ['error-command'],
    expectedOutput: ['Command failed']
  })

  await e2eTest.runTest()

  const output = e2eTest.getOutput()
  expect(output).toContain('Error: This is a test error')
})
