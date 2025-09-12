import { test, expect } from '@jest/globals'
import { spawn } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface PtyE2ETestOptions {
  command: string
  args: string[]
  cwd?: string
  timeout?: number
  expectedOutput?: string[]
  expectedError?: string[]
  input?: string[]
}

export class PtyE2ETest {
  private pty: any
  private output: string = ''
  private error: string = ''
  private ready: boolean = false
  private isExited: boolean = false
  private exitCode: number | null = null

  constructor(private options: PtyE2ETestOptions) {}

  async start(): Promise<void> {
    try {
      const { spawn: nodePtySpawn } = await import('node-pty')

      this.pty = nodePtySpawn(this.options.command, this.options.args, {
        cwd: this.options.cwd || process.cwd(),
        encoding: 'utf8',
        cols: 80,
        rows: 24
      })
    } catch (error) {
      throw new Error(`Failed to import node-pty: ${error instanceof Error ? error.message : String(error)}`)
    }

    this.pty.onData((data: string) => {
      this.output += data
      // Check if we've received the initial prompt or any output
      if ((data.includes('$ ') || data.includes('custom node script') || data.trim().length > 0) && !this.ready) {
        this.ready = true
      }
    })

    this.pty.onExit((code: any) => {
      this.isExited = true
      this.exitCode = typeof code === 'object' ? code.exitCode : code
    })

    // Wait for the shell to be ready
    await this.waitForReady()
  }

  private async waitForReady(timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.ready && !this.isExited && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!this.ready && !this.isExited) {
      throw new Error(`Shell did not become ready within ${timeout}ms`)
    }
  }

  async write(input: string): Promise<void> {
    if (!this.pty || this.hasExited()) {
      throw new Error('PTY is not available or has exited')
    }
    this.pty.write(input)
  }

  async waitForOutput(expected: string, timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.output.includes(expected) && !this.hasExited() && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!this.output.includes(expected)) {
      throw new Error(`Expected output "${expected}" not found within ${timeout}ms. Got: ${this.output}`)
    }
  }

  async waitForExit(timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.hasExited() && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!this.hasExited()) {
      throw new Error(`Process did not exit within ${timeout}ms`)
    }
  }

  getOutput(): string {
    return this.output
  }

  getError(): string {
    return this.error
  }

  getExitCode(): number | null {
    return this.exitCode
  }

  isReady(): boolean {
    return this.ready
  }

  hasExited(): boolean {
    return this.isExited
  }

  dispose(): void {
    if (this.pty && !this.hasExited()) {
      this.pty.kill()
    }
  }

  async runTest(): Promise<void> {
    try {
      await this.start()

      // Send input commands if provided
      if (this.options.input) {
        for (const input of this.options.input) {
          if (this.hasExited()) break
          await this.write(input + '\n')
          // Small delay between commands
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      // Check expected output
      if (this.options.expectedOutput) {
        for (const expected of this.options.expectedOutput) {
          await this.waitForOutput(expected)
        }
      }

      // Check expected error
      if (this.options.expectedError) {
        for (const expected of this.options.expectedError) {
          expect(this.error).toContain(expected)
        }
      }

      // Wait for exit if expected
      if (this.options.input && this.options.input.includes('exit')) {
        await this.waitForExit()
      }

    } finally {
      this.dispose()
    }
  }
}

export function createMockShellPath(): string {
  return join(__dirname, 'mock-shell.js')
}

export function createE2ETest(options: Partial<PtyE2ETestOptions>): PtyE2ETest {
  const defaultOptions: PtyE2ETestOptions = {
    command: process.execPath,
    args: [createMockShellPath()],
    timeout: 10000
  }

  return new PtyE2ETest({ ...defaultOptions, ...options })
}
