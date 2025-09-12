import type { Test } from '@lvce-editor/test-with-playwright'
import { terminalRecorder } from '../../pty-host/src/parts/TerminalRecorder/TerminalRecorder.ts'
import { createSessionStorage } from '../../pty-host/src/parts/TerminalSessionStorage/TerminalSessionStorage.ts'
import * as path from 'path'

const sessionStorage = createSessionStorage({
  recordingsDir: path.join(process.cwd(), 'recordings')
})

export const name = 'terminal-scenarios'

export const test: Test = async ({ FileSystem, Workspace, Locator, expect }) => {
  // Create recordings directory
  const recordingsDir = path.join(process.cwd(), 'recordings')
  await FileSystem.ensureDir(recordingsDir)

  // Test scenarios
  await testBasicCommand()
  await testErrorScenario()
  await testInteractiveCommand()
  await testLongRunningProcess()
  await testResizeScenario()
}

async function testBasicCommand(): Promise<void> {
  console.log('Recording basic command scenario...')

  const sessionId = `basic-command-${Date.now()}`

  // This would normally be called through the pty-host system
  // For now, we'll simulate the recording
  terminalRecorder.startSession({
    id: sessionId,
    name: 'Basic Command Test',
    description: 'Tests basic command execution with simple output',
    command: 'echo',
    args: ['Hello World'],
    cwd: process.cwd(),
  })

  // Simulate terminal events
  terminalRecorder.recordCommand('echo', ['Hello World'], 1)

  // Simulate data output
  terminalRecorder.recordData('Hello World\r\n')

  // Simulate exit
  terminalRecorder.recordExit(0)

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved basic command session: ${session.id}`)
  }
}

async function testErrorScenario(): Promise<void> {
  console.log('Recording error scenario...')

  const sessionId = `error-scenario-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Error Scenario Test',
    description: 'Tests command that fails with error output',
    command: 'ls',
    args: ['/nonexistent/directory'],
    cwd: process.cwd(),
  })

  terminalRecorder.recordCommand('ls', ['/nonexistent/directory'], 2)

  // Simulate error output
  terminalRecorder.recordData('ls: cannot access \'/nonexistent/directory\': No such file or directory\r\n')

  terminalRecorder.recordExit(2)

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved error scenario session: ${session.id}`)
  }
}

async function testInteractiveCommand(): Promise<void> {
  console.log('Recording interactive command scenario...')

  const sessionId = `interactive-command-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Interactive Command Test',
    description: 'Tests interactive command with user input',
    command: 'node',
    args: ['-e', 'console.log("Enter your name:"); process.stdin.on("data", (data) => { console.log("Hello", data.toString().trim()); process.exit(0); });'],
    cwd: process.cwd(),
  })

  terminalRecorder.recordCommand('node', ['-e', 'console.log("Enter your name:"); process.stdin.on("data", (data) => { console.log("Hello", data.toString().trim()); process.exit(0); });'], 3)

  // Simulate prompt
  terminalRecorder.recordData('Enter your name:\r\n')

  // Simulate user input
  terminalRecorder.recordWrite('John\r\n')

  // Simulate response
  terminalRecorder.recordData('Hello John\r\n')

  terminalRecorder.recordExit(0)

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved interactive command session: ${session.id}`)
  }
}

async function testLongRunningProcess(): Promise<void> {
  console.log('Recording long running process scenario...')

  const sessionId = `long-running-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Long Running Process Test',
    description: 'Tests process that runs for a while with periodic output',
    command: 'node',
    args: ['-e', 'let i = 0; setInterval(() => { console.log("Tick", i++); if (i > 5) process.exit(0); }, 100);'],
    cwd: process.cwd(),
  })

  terminalRecorder.recordCommand('node', ['-e', 'let i = 0; setInterval(() => { console.log("Tick", i++); if (i > 5) process.exit(0); }, 100);'], 4)

  // Simulate periodic output
  for (let i = 0; i <= 5; i++) {
    terminalRecorder.recordData(`Tick ${i}\r\n`)
  }

  terminalRecorder.recordExit(0)

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved long running process session: ${session.id}`)
  }
}

async function testResizeScenario(): Promise<void> {
  console.log('Recording resize scenario...')

  const sessionId = `resize-scenario-${Date.now()}`

  terminalRecorder.startSession({
    id: sessionId,
    name: 'Resize Scenario Test',
    description: 'Tests terminal resize functionality',
    command: 'bash',
    args: ['-c', 'echo "Terminal size:"; tput cols; tput lines; sleep 1; echo "Resized!"; tput cols; tput lines'],
    cwd: process.cwd(),
  })

  terminalRecorder.recordCommand('bash', ['-c', 'echo "Terminal size:"; tput cols; tput lines; sleep 1; echo "Resized!"; tput cols; tput lines'], 5)

  // Initial size
  terminalRecorder.recordResize(80, 24)
  terminalRecorder.recordData('Terminal size:\r\n')
  terminalRecorder.recordData('80\r\n')
  terminalRecorder.recordData('24\r\n')

  // Resize
  terminalRecorder.recordResize(120, 30)
  terminalRecorder.recordData('Resized!\r\n')
  terminalRecorder.recordData('120\r\n')
  terminalRecorder.recordData('30\r\n')

  terminalRecorder.recordExit(0)

  const session = terminalRecorder.endSession()
  if (session) {
    await sessionStorage.saveSession(session)
    console.log(`Saved resize scenario session: ${session.id}`)
  }
}


