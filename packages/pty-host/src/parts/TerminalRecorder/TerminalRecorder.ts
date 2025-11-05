import * as Assert from '../Assert/Assert.ts'

export interface TerminalEvent {
  type: 'data' | 'exit' | 'command' | 'resize' | 'write'
  timestamp: number
  data?: any
  command?: string
  args?: any[]
  id?: number
  columns?: number
  rows?: number
}

export interface TerminalSession {
  id: string
  name: string
  description: string
  platform: string
  command: string
  args: string[]
  cwd: string
  events: TerminalEvent[]
  duration: number
  exitCode?: number
  createdAt: string
}

class TerminalRecorder {
  private session: TerminalSession | null = null
  private startTime: number = 0

  startSession(config: {
    id: string
    name: string
    description: string
    command: string
    args: string[]
    cwd: string
  }): void {
    Assert.string(config.id)
    Assert.string(config.name)
    Assert.string(config.description)
    Assert.string(config.command)
    Assert.array(config.args)
    Assert.string(config.cwd)

    this.startTime = Date.now()
    this.session = {
      ...config,
      platform: process.platform,
      events: [],
      duration: 0,
      createdAt: new Date().toISOString(),
    }
  }

  recordEvent(event: Omit<TerminalEvent, 'timestamp'>): void {
    if (!this.session) {
      throw new Error('No active session. Call startSession first.')
    }

    const timestamp = Date.now() - this.startTime
    this.session.events.push({
      ...event,
      timestamp,
    })
  }

  recordData(data: any): void {
    this.recordEvent({
      type: 'data',
      data,
    })
  }

  recordExit(exitCode: number): void {
    this.recordEvent({
      type: 'exit',
      data: exitCode,
    })
    if (this.session) {
      this.session.exitCode = exitCode
    }
  }

  recordCommand(command: string, args: any[], id: number): void {
    this.recordEvent({
      type: 'command',
      command,
      args,
      id,
    })
  }

  recordResize(columns: number, rows: number): void {
    this.recordEvent({
      type: 'resize',
      columns,
      rows,
    })
  }

  recordWrite(data: any): void {
    this.recordEvent({
      type: 'write',
      data,
    })
  }

  endSession(): TerminalSession | null {
    if (!this.session) {
      return null
    }

    this.session.duration = Date.now() - this.startTime
    const completedSession = this.session
    this.session = null
    return completedSession
  }

  getCurrentSession(): TerminalSession | null {
    return this.session
  }
}

export const terminalRecorder = new TerminalRecorder()


