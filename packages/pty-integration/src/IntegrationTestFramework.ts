import { PtyHostClient, TerminalCreateParams } from './PtyHostClient.js'
import { createMockShellPath } from './MockShellUtils.js'

export interface IntegrationTestOptions {
  command?: string
  args?: string[]
  cwd?: string
  timeout?: number
  expectedOutput?: string[]
  expectedError?: string[]
  input?: string[]
}

export class IntegrationTestFramework {
  private client: PtyHostClient
  private terminalId: number
  private output: string = ''
  private error: string = ''
  private ready: boolean = false
  private isExited: boolean = false
  private exitCode: number | null = null

  constructor(private options: IntegrationTestOptions) {
    this.client = new PtyHostClient({
      timeout: options.timeout || 10000
    })
    this.terminalId = Math.floor(Math.random() * 10000) + 1000 // Random ID between 1000-10999
  }

  async start(): Promise<void> {
    await this.client.start()

    // Set up event handlers
    this.client.onTerminalData(this.terminalId, (data) => {
      this.output += data.toString()
      // Check if we've received the initial prompt
      if (data.toString().includes('$ ') && !this.ready) {
        this.ready = true
      }
    })

    this.client.onTerminalExit(this.terminalId, (data) => {
      this.isExited = true
      this.exitCode = data.exitCode || 0
    })

    // Create terminal
    const createParams: TerminalCreateParams = {
      id: this.terminalId,
      cwd: this.options.cwd || process.cwd(),
      command: this.options.command || process.execPath,
      args: this.options.args || [createMockShellPath()]
    }

    await this.client.createTerminal(createParams)

    // Wait for terminal to be ready
    await this.waitForReady()
  }

  private async waitForReady(timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.ready && !this.isExited && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!this.ready && !this.isExited) {
      throw new Error(`Terminal did not become ready within ${timeout}ms`)
    }
  }

  async write(input: string): Promise<void> {
    if (this.isExited) {
      throw new Error('Terminal has exited')
    }

    await this.client.writeToTerminal({
      id: this.terminalId,
      data: input
    })
  }

  async waitForOutput(expected: string, timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.output.includes(expected) && !this.isExited && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!this.output.includes(expected)) {
      throw new Error(`Expected output "${expected}" not found within ${timeout}ms. Got: ${this.output}`)
    }
  }

  async waitForExit(timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.isExited && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    if (!this.isExited) {
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

  async dispose(): Promise<void> {
    if (!this.isExited) {
      await this.client.disposeTerminal({ id: this.terminalId })
    }
    await this.client.stop()
  }

  async runTest(): Promise<void> {
    try {
      await this.start()

      // Send input commands if provided
      if (this.options.input) {
        for (const input of this.options.input) {
          if (this.isExited) break
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
          if (!this.error.includes(expected)) {
            throw new Error(`Expected error "${expected}" not found. Got: ${this.error}`)
          }
        }
      }

      // Wait for exit if expected
      if (this.options.input && this.options.input.includes('exit')) {
        await this.waitForExit()
      }

    } finally {
      await this.dispose()
    }
  }
}

export function createIntegrationTest(options: Partial<IntegrationTestOptions>): IntegrationTestFramework {
  const defaultOptions: IntegrationTestOptions = {
    timeout: 10000
  }

  return new IntegrationTestFramework({ ...defaultOptions, ...options })
}
