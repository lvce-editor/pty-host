import type { ChildProcess } from 'child_process'
import { fork } from 'node:child_process'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { createMockShellPath, root } from './MockShellUtils.ts'

export interface SimpleIntegrationTestOptions {
  command?: string
  args?: string[]
  cwd?: string
  timeout?: number
  expectedOutput?: string[]
  expectedError?: string[]
  input?: string[]
}

export class SimpleIntegrationTestFramework {
  private ptyHostProcess: ChildProcess | null = null
  private output: string = ''
  private error: string = ''
  private ready: boolean = false
  private isExited: boolean = false
  private exitCode: number | null = null

  constructor(private options: SimpleIntegrationTestOptions) {}

  async start(): Promise<void> {
    // Start ptyHost process
    await this.startPtyHost()

    // Wait for terminal to be ready
    await this.waitForReady()
  }

  private async startPtyHost(): Promise<void> {
    // Start ptyHost with mockshell
    // const mockShellPath = createMockShellPath()
    const ptyHostPath = join(root, 'packages/pty-host/src/ptyHostMain.ts')
    this.ptyHostProcess = fork(
      ptyHostPath,
      ['--ipc-type=node-forked-process'],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.options.cwd || process.cwd(),
      },
    )

    if (
      !this.ptyHostProcess ||
      !this.ptyHostProcess.stdout ||
      !this.ptyHostProcess.stderr
    ) {
      throw new Error(`failed to spawn`)
    }

    // Set up event handlers
    this.ptyHostProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('STDOUT:', output)
      this.output += output
      // Check if we've received the initial prompt
      if (output.includes('$ ') && !this.ready) {
        this.ready = true
      }
    })

    this.ptyHostProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString()
      console.log('STDERR:', error)
      this.error += error
    })

    this.ptyHostProcess.on('exit', (code: number) => {
      this.isExited = true
      this.exitCode = code
    })

    // Send command to create terminal with mockshell
    await this.createTerminal()
  }

  private async createTerminal(): Promise<void> {
    const mockShellPath = createMockShellPath()

    // Send JSON-RPC message to create terminal
    const message = {
      jsonrpc: '2.0',
      id: 1,
      method: 'Terminal.create',
      params: [1, process.cwd(), 'node', [mockShellPath]],
    }

    console.log('Sending message:', JSON.stringify(message))
    if (this.ptyHostProcess && this.ptyHostProcess.stdin) {
      this.ptyHostProcess.stdin.write(JSON.stringify(message) + '\n')
    }
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

    // Send JSON-RPC message to write to terminal
    const message = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'Terminal.write',
      params: [1, input],
    }

    if (this.ptyHostProcess && this.ptyHostProcess.stdin) {
      this.ptyHostProcess.stdin.write(JSON.stringify(message) + '\n')
    }
  }

  async resize(columns: number, rows: number): Promise<void> {
    const message = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'Terminal.resize',
      params: [1, columns, rows],
    }

    if (this.ptyHostProcess && this.ptyHostProcess.stdin) {
      this.ptyHostProcess.stdin.write(JSON.stringify(message) + '\n')
    }
  }

  async dispose(): Promise<void> {
    if (this.ptyHostProcess && !this.isExited) {
      // Send dispose message
      const message = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'Terminal.dispose',
        params: [1],
      }

      if (this.ptyHostProcess.stdin) {
        this.ptyHostProcess.stdin.write(JSON.stringify(message) + '\n')
      }

      // Wait a bit for cleanup
      await setTimeout(100)

      this.ptyHostProcess.kill()
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

export function createSimpleIntegrationTest(
  options: Partial<SimpleIntegrationTestOptions>,
): SimpleIntegrationTestFramework {
  const defaultOptions: SimpleIntegrationTestOptions = {
    timeout: 10_000,
  }

  return new SimpleIntegrationTestFramework({
    ...defaultOptions,
    ...options,
  })
}
