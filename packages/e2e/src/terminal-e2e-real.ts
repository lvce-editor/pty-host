import type { Test } from '@lvce-editor/test-with-playwright'
import { terminalRecorder } from '../../pty-host/src/parts/TerminalRecorder/TerminalRecorder.ts'
import { createSessionStorage } from '../../pty-host/src/parts/TerminalSessionStorage/TerminalSessionStorage.ts'
import * as path from 'path'
import { spawn } from 'child_process'

const sessionStorage = createSessionStorage({
  recordingsDir: path.join(process.cwd(), 'recordings')
})

export const name = 'terminal-e2e-real'

export const test: Test = async ({ FileSystem, Workspace, Locator, expect }) => {
  // Create recordings directory
  const recordingsDir = path.join(process.cwd(), 'recordings')
  await FileSystem.ensureDir(recordingsDir)

  // Test real terminal scenarios
  await testRealEchoCommand()
  await testRealErrorCommand()
  await testRealInteractiveCommand()
  await testRealLongRunningCommand()
}

async function testRealEchoCommand(): Promise<void> {
  console.log('Recording real echo command...')

  const sessionId = `real-echo-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Real Echo Command',
    description: 'Tests real echo command execution',
    command: 'echo',
    args: ['Hello from real terminal!'],
    cwd: process.cwd(),
  })

  try {
    const result = await runCommand('echo', ['Hello from real terminal!'])

    // Record the command
    terminalRecorder.recordCommand('echo', ['Hello from real terminal!'], 1)

    // Record the output
    if (result.stdout) {
      terminalRecorder.recordData(result.stdout)
    }
    if (result.stderr) {
      terminalRecorder.recordData(result.stderr)
    }

    // Record the exit
    terminalRecorder.recordExit(result.exitCode)

    console.log(`Echo command completed with exit code: ${result.exitCode}`)
  } catch (error) {
    console.error('Echo command failed:', error)
    terminalRecorder.recordExit(1)
  }

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved real echo session: ${session.id}`)
  }
}

async function testRealErrorCommand(): Promise<void> {
  console.log('Recording real error command...')

  const sessionId = `real-error-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Real Error Command',
    description: 'Tests real command that fails',
    command: 'ls',
    args: ['/nonexistent/directory/that/does/not/exist'],
    cwd: process.cwd(),
  })

  try {
    const result = await runCommand('ls', ['/nonexistent/directory/that/does/not/exist'])

    terminalRecorder.recordCommand('ls', ['/nonexistent/directory/that/does/not/exist'], 2)

    if (result.stdout) {
      terminalRecorder.recordData(result.stdout)
    }
    if (result.stderr) {
      terminalRecorder.recordData(result.stderr)
    }

    terminalRecorder.recordExit(result.exitCode)

    console.log(`Error command completed with exit code: ${result.exitCode}`)
  } catch (error) {
    console.error('Error command failed:', error)
    terminalRecorder.recordExit(1)
  }

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved real error session: ${session.id}`)
  }
}

async function testRealInteractiveCommand(): Promise<void> {
  console.log('Recording real interactive command...')

  const sessionId = `real-interactive-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Real Interactive Command',
    description: 'Tests real interactive command with input',
    command: 'node',
    args: ['-e', 'console.log("What is your name?"); process.stdin.on("data", (data) => { console.log("Hello", data.toString().trim() + "!"); process.exit(0); });'],
    cwd: process.cwd(),
  })

  try {
    const result = await runInteractiveCommand('node', ['-e', 'console.log("What is your name?"); process.stdin.on("data", (data) => { console.log("Hello", data.toString().trim() + "!"); process.exit(0); });'], 'TestUser\n')

    terminalRecorder.recordCommand('node', ['-e', 'console.log("What is your name?"); process.stdin.on("data", (data) => { console.log("Hello", data.toString().trim() + "!"); process.exit(0); });'], 3)

    if (result.stdout) {
      terminalRecorder.recordData(result.stdout)
    }
    if (result.stderr) {
      terminalRecorder.recordData(result.stderr)
    }

    // Record user input
    terminalRecorder.recordWrite('TestUser\n')

    terminalRecorder.recordExit(result.exitCode)

    console.log(`Interactive command completed with exit code: ${result.exitCode}`)
  } catch (error) {
    console.error('Interactive command failed:', error)
    terminalRecorder.recordExit(1)
  }

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved real interactive session: ${session.id}`)
  }
}

async function testRealLongRunningCommand(): Promise<void> {
  console.log('Recording real long running command...')

  const sessionId = `real-long-running-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Real Long Running Command',
    description: 'Tests real long running process with periodic output',
    command: 'node',
    args: ['-e', 'let i = 0; const interval = setInterval(() => { console.log("Tick", i++); if (i >= 3) { clearInterval(interval); process.exit(0); } }, 200);'],
    cwd: process.cwd(),
  })

  try {
    const result = await runCommand('node', ['-e', 'let i = 0; const interval = setInterval(() => { console.log("Tick", i++); if (i >= 3) { clearInterval(interval); process.exit(0); } }, 200);'])

    terminalRecorder.recordCommand('node', ['-e', 'let i = 0; const interval = setInterval(() => { console.log("Tick", i++); if (i >= 3) { clearInterval(interval); process.exit(0); } }, 200);'], 4)

    if (result.stdout) {
      terminalRecorder.recordData(result.stdout)
    }
    if (result.stderr) {
      terminalRecorder.recordData(result.stderr)
    }

    terminalRecorder.recordExit(result.exitCode)

    console.log(`Long running command completed with exit code: ${result.exitCode}`)
  } catch (error) {
    console.error('Long running command failed:', error)
    terminalRecorder.recordExit(1)
  }

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved real long running session: ${session.id}`)
  }
}

function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      })
    })

    child.on('error', (error) => {
      stderr += error.message
      resolve({
        stdout,
        stderr,
        exitCode: 1
      })
    })
  })
}

function runInteractiveCommand(command: string, args: string[], input: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    // Send input after a short delay
    setTimeout(() => {
      child.stdin?.write(input)
      child.stdin?.end()
    }, 100)

    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      })
    })

    child.on('error', (error) => {
      stderr += error.message
      resolve({
        stdout,
        stderr,
        exitCode: 1
      })
    })
  })
}


