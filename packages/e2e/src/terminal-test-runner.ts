import { createSessionStorage } from '../../pty-host/src/parts/TerminalSessionStorage/TerminalSessionStorage.ts'
import { terminalReplayer } from '../../pty-host/src/parts/TerminalReplayer/TerminalReplayer.ts'
import type { TerminalSession } from '../../pty-host/src/parts/TerminalRecorder/TerminalRecorder.ts'
import * as path from 'path'

export interface TestRunnerConfig {
  recordingsDir: string
  port?: number
}

export class TerminalTestRunner {
  private sessionStorage: ReturnType<typeof createSessionStorage>
  private sessions: Array<{ id: string; metadata: any }> = []
  private currentSession: TerminalSession | null = null
  private isReplaying = false

  constructor(config: TestRunnerConfig) {
    this.sessionStorage = createSessionStorage({
      recordingsDir: config.recordingsDir
    })
  }

  async initialize(): Promise<void> {
    this.sessions = await this.sessionStorage.listSessions()
    console.log(`Loaded ${this.sessions.length} terminal sessions`)
  }

  async loadSession(sessionId: string): Promise<TerminalSession | null> {
    this.currentSession = await this.sessionStorage.loadSession(sessionId)
    return this.currentSession
  }

  getSessions(): Array<{ id: string; metadata: any }> {
    return this.sessions
  }

  getCurrentSession(): TerminalSession | null {
    return this.currentSession
  }

  async replaySession(sessionId: string, options: {
    speed?: number
    loop?: boolean
    onData?: (data: any) => void
    onExit?: (exitCode: number) => void
    onResize?: (columns: number, rows: number) => void
    onWrite?: (data: any) => void
  } = {}): Promise<void> {
    const session = await this.loadSession(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    terminalReplayer.loadSession(session)

    terminalReplayer.play({
      speed: options.speed || 1,
      loop: options.loop || false,
      onData: (data) => {
        console.log(`[DATA] ${JSON.stringify(data)}`)
        if (options.onData) {
          options.onData(data)
        }
      },
      onExit: (exitCode) => {
        console.log(`[EXIT] Code: ${exitCode}`)
        if (options.onExit) {
          options.onExit(exitCode)
        }
      },
      onResize: (columns, rows) => {
        console.log(`[RESIZE] ${columns}x${rows}`)
        if (options.onResize) {
          options.onResize(columns, rows)
        }
      },
      onWrite: (data) => {
        console.log(`[WRITE] ${JSON.stringify(data)}`)
        if (options.onWrite) {
          options.onWrite(data)
        }
      }
    })
  }

  pauseReplay(): void {
    terminalReplayer.pause()
  }

  stopReplay(): void {
    terminalReplayer.stop()
  }

  getReplayProgress(): { current: number; total: number; percentage: number } {
    return terminalReplayer.getProgress()
  }

  isReplaying(): boolean {
    return terminalReplayer.isReplaying()
  }

  async runAllScenarios(): Promise<void> {
    console.log('Running all terminal scenarios...')

    for (const session of this.sessions) {
      console.log(`\n=== Running scenario: ${session.metadata.command} ===`)
      console.log(`Description: ${session.metadata.description || 'No description'}`)
      console.log(`Platform: ${session.metadata.platform}`)
      console.log(`Duration: ${session.metadata.duration}ms`)
      console.log(`Events: ${session.metadata.eventCount}`)

      try {
        await this.replaySession(session.id, {
          speed: 2, // 2x speed for demo
          onData: (data) => {
            // Simulate terminal output rendering
            process.stdout.write(data)
          }
        })

        // Wait a bit between scenarios
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error replaying session ${session.id}:`, error)
      }
    }
  }

  async runScenario(sessionId: string): Promise<void> {
    const session = this.sessions.find(s => s.id === sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    console.log(`\n=== Running scenario: ${session.metadata.command} ===`)
    console.log(`Description: ${session.metadata.description || 'No description'}`)
    console.log(`Platform: ${session.metadata.platform}`)
    console.log(`Duration: ${session.metadata.duration}ms`)
    console.log(`Events: ${session.metadata.eventCount}`)

    await this.replaySession(sessionId, {
      speed: 1, // Real time for individual scenarios
      onData: (data) => {
        process.stdout.write(data)
      }
    })
  }

  printSessionList(): void {
    console.log('\n=== Available Terminal Sessions ===')
    this.sessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.metadata.command} (${session.id})`)
      console.log(`   Platform: ${session.metadata.platform}`)
      console.log(`   Duration: ${session.metadata.duration}ms`)
      console.log(`   Events: ${session.metadata.eventCount}`)
      console.log(`   Created: ${session.metadata.createdAt}`)
      console.log('')
    })
  }
}

// CLI interface
export async function runTerminalTestRunner(): Promise<void> {
  const recordingsDir = path.join(process.cwd(), 'recordings')
  const runner = new TerminalTestRunner({ recordingsDir })

  await runner.initialize()

  if (process.argv.includes('--list')) {
    runner.printSessionList()
    return
  }

  if (process.argv.includes('--all')) {
    await runner.runAllScenarios()
    return
  }

  const sessionId = process.argv.find(arg => arg.startsWith('--session='))?.split('=')[1]
  if (sessionId) {
    await runner.runScenario(sessionId)
    return
  }

  // Default: show help
  console.log('Terminal Test Runner')
  console.log('Usage:')
  console.log('  --list                    List all available sessions')
  console.log('  --all                     Run all scenarios')
  console.log('  --session=<id>            Run specific session')
  console.log('')

  runner.printSessionList()
}


