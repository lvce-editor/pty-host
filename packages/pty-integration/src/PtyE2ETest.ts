import { expect } from '@jest/globals'
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
  private output: string = ''
  private error: string = ''
  private ready: boolean = false
  private isExited: boolean = false
  private exitCode: number | null = null

  constructor(private options: PtyE2ETestOptions) {}

  async start(): Promise<void> {
    try {
      // Note: node-pty is not available in this test environment
      // This is a placeholder for when node-pty is properly installed
      throw new Error('node-pty is not available in test environment')
    } catch (error) {
      throw new Error(`Failed to import node-pty: ${error instanceof Error ? error.message : String(error)}`)
    }
  }


  async write(input: string): Promise<void> {
    throw new Error('PTY is not available in test environment')
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
    // PTY is not available in test environment
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
