import type { TerminalSession, TerminalEvent } from '../TerminalRecorder/TerminalRecorder.ts'

export interface ReplayConfig {
  speed?: number // Multiplier for replay speed (1 = real time, 2 = 2x speed, 0.5 = half speed)
  loop?: boolean // Whether to loop the replay
  onData?: (data: any) => void // Callback for data events
  onExit?: (exitCode: number) => void // Callback for exit events
  onResize?: (columns: number, rows: number) => void // Callback for resize events
  onWrite?: (data: any) => void // Callback for write events
}

class TerminalReplayer {
  private session: TerminalSession | null = null
  private config: ReplayConfig = {}
  private timeouts: NodeJS.Timeout[] = []
  private isPlaying = false
  private currentEventIndex = 0

  loadSession(session: TerminalSession): void {
    this.session = session
    this.currentEventIndex = 0
    this.stop()
  }

  play(config: ReplayConfig = {}): void {
    if (!this.session) {
      throw new Error('No session loaded. Call loadSession first.')
    }

    this.config = { speed: 1, loop: false, ...config }
    this.isPlaying = true
    this.currentEventIndex = 0

    this.playNextEvent()
  }

  private playNextEvent(): void {
    if (!this.session || !this.isPlaying) {
      return
    }

    if (this.currentEventIndex >= this.session.events.length) {
      if (this.config.loop) {
        this.currentEventIndex = 0
        this.playNextEvent()
      } else {
        this.isPlaying = false
      }
      return
    }

    const event = this.session.events[this.currentEventIndex]
    const delay = this.calculateDelay(event)

    const timeout = setTimeout(() => {
      this.handleEvent(event)
      this.currentEventIndex++
      this.playNextEvent()
    }, delay)

    this.timeouts.push(timeout)
  }

  private calculateDelay(event: TerminalEvent): number {
    if (this.currentEventIndex === 0) {
      return 0
    }

    const previousEvent = this.session!.events[this.currentEventIndex - 1]
    const timeDiff = event.timestamp - previousEvent.timestamp
    const adjustedDelay = timeDiff / (this.config.speed || 1)

    return Math.max(0, adjustedDelay)
  }

  private handleEvent(event: TerminalEvent): void {
    switch (event.type) {
      case 'data':
        if (this.config.onData) {
          this.config.onData(event.data)
        }
        break
      case 'exit':
        if (this.config.onExit) {
          this.config.onExit(event.data)
        }
        break
      case 'resize':
        if (this.config.onResize) {
          this.config.onResize(event.columns!, event.rows!)
        }
        break
      case 'write':
        if (this.config.onWrite) {
          this.config.onWrite(event.data)
        }
        break
      case 'command':
        // Command events are informational, no callback needed
        break
    }
  }

  pause(): void {
    this.isPlaying = false
    this.clearTimeouts()
  }

  stop(): void {
    this.isPlaying = false
    this.currentEventIndex = 0
    this.clearTimeouts()
  }

  private clearTimeouts(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts = []
  }

  seekToEvent(eventIndex: number): void {
    if (!this.session) {
      return
    }

    this.currentEventIndex = Math.max(0, Math.min(eventIndex, this.session.events.length - 1))
  }

  seekToTime(timestamp: number): void {
    if (!this.session) {
      return
    }

    const eventIndex = this.session.events.findIndex(event => event.timestamp >= timestamp)
    this.seekToEvent(eventIndex >= 0 ? eventIndex : this.session.events.length - 1)
  }

  getCurrentEvent(): TerminalEvent | null {
    if (!this.session || this.currentEventIndex >= this.session.events.length) {
      return null
    }
    return this.session.events[this.currentEventIndex]
  }

  getProgress(): { current: number; total: number; percentage: number } {
    if (!this.session) {
      return { current: 0, total: 0, percentage: 0 }
    }

    const current = this.currentEventIndex
    const total = this.session.events.length
    const percentage = total > 0 ? (current / total) * 100 : 0

    return { current, total, percentage }
  }

  isReplaying(): boolean {
    return this.isPlaying
  }

  getSession(): TerminalSession | null {
    return this.session
  }
}

export const terminalReplayer = new TerminalReplayer()


