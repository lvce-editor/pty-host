import { spawn } from 'child_process'
import { setTimeout } from 'node:timers/promises'
import { createMockShellPath } from './MockShellUtils.ts'

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
  private ptyHostProcess: any = null
  private output: string = ''
  private error: string = ''
  private ready: boolean = false
  private isExited: boolean = false
  private exitCode: number | null = null
  private mockShellProcess: any = null

  constructor(private options: IntegrationTestOptions) {}

  async start(): Promise<void> {
    // Start the mock shell process directly
    const mockShellPath = createMockShellPath()
    this.mockShellProcess = spawn('node', [mockShellPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: this.options.cwd || process.cwd(),
    })

    // Set up event handlers
    this.mockShellProcess.stdout.on('data', (data: Buffer) => {
      this.output += data.toString()
      // Check if we've received the initial prompt
      if (data.toString().includes('$ ') && !this.ready) {
        this.ready = true
      }
    })

    this.mockShellProcess.stderr.on('data', (data: Buffer) => {
      this.error += data.toString()
    })

    this.mockShellProcess.on('exit', (code: number) => {
      this.isExited = true
      this.exitCode = code
    })

    // Wait for terminal to be ready
    await this.waitForReady()
  }

  private async waitForReady(timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.ready && !this.isExited && Date.now() - start < timeout) {
      await setTimeout(10)
    }

    if (!this.ready && !this.isExited) {
      throw new Error(`Terminal did not become ready within ${timeout}ms`)
    }
  }

  async write(input: string): Promise<void> {
    if (this.isExited) {
      throw new Error('Terminal has exited')
    }

    if (this.mockShellProcess && this.mockShellProcess.stdin) {
      this.mockShellProcess.stdin.write(input)
    }
  }

  async waitForOutput(expected: string, timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (
      !this.output.includes(expected) &&
      !this.isExited &&
      Date.now() - start < timeout
    ) {
      await setTimeout(10)
    }

    if (!this.output.includes(expected)) {
      throw new Error(
        `Expected output "${expected}" not found within ${timeout}ms. Got: ${this.output}`,
      )
    }
  }

  async waitForExit(timeout: number = 5000): Promise<void> {
    const start = Date.now()
    while (!this.isExited && Date.now() - start < timeout) {
      await setTimeout(10)
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
    if (this.mockShellProcess && !this.isExited) {
      this.mockShellProcess.kill()
    }
    if (this.ptyHostProcess && !this.isExited) {
      this.ptyHostProcess.kill()
    }
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
          await setTimeout(50)
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
            throw new Error(
              `Expected error "${expected}" not found. Got: ${this.error}`,
            )
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

export function createIntegrationTest(
  options: Partial<IntegrationTestOptions>,
): IntegrationTestFramework {
  const defaultOptions: IntegrationTestOptions = {
    timeout: 10_000,
  }

  return new IntegrationTestFramework({ ...defaultOptions, ...options })
}
