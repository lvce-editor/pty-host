#!/usr/bin/env node

/**
 * Mock shell for e2e testing
 * Provides consistent, predictable output across all platforms
 */

import { spawn } from 'child_process'
import readline from 'readline'
import fs from 'fs'
import path from 'path'

// Mock shell state
let currentDir = process.cwd()
let prompt = 'testuser $ '
let isInteractive = true

// Command handlers
const commands = {
  'pwd': () => currentDir,
  'ls': (args) => {
    try {
      const files = fs.readdirSync(currentDir)
      return files.join('\n')
    } catch (error) {
      return `ls: ${error.message}`
    }
  },
  'cd': (args) => {
    const targetPath = args[0] || process.env.HOME || '/'
    const newPath = path.resolve(currentDir, targetPath)

    try {
      if (fs.statSync(newPath).isDirectory()) {
        currentDir = newPath
        return ''
      } else {
        return `cd: ${targetPath}: Not a directory`
      }
    } catch (error) {
      return `cd: ${targetPath}: No such file or directory`
    }
  },
  'echo': (args) => args.join(' '),
  'exit': () => {
    isInteractive = false
    process.exit(0)
  },
  'help': () => `Available commands: ${Object.keys(commands).join(', ')}`,
  'test-command': () => 'test-output',
  'error-command': () => {
    process.stderr.write('Error: This is a test error\n')
    return 'Command failed'
  }
}

function processCommand(input) {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/)
  const command = parts[0]
  const args = parts.slice(1)

  if (commands[command]) {
    const result = commands[command](args)
    return result ? result + '\n' : ''
  } else {
    return `Command not found: ${command}\n`
  }
}

function writePrompt() {
  process.stdout.write(prompt)
}

// Main shell loop
function startShell() {
  writePrompt()

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  })

  rl.on('line', (input) => {
    const output = processCommand(input)
    if (output) {
      process.stdout.write(output)
    }
    if (isInteractive) {
      writePrompt()
    }
  })

  rl.on('close', () => {
    process.exit(0)
  })
}

// Handle different execution modes
if (process.argv.length > 2) {
  // Non-interactive mode - execute command and exit
  const command = process.argv.slice(2).join(' ')
  const output = processCommand(command)
  if (output) {
    process.stdout.write(output)
  }
  process.exit(0)
} else {
  // Interactive mode
  startShell()
}

// Handle cleanup
process.on('SIGINT', () => {
  process.exit(0)
})

process.on('SIGTERM', () => {
  process.exit(0)
})
