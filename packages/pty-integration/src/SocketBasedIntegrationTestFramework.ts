import type { ChildProcess } from 'child_process'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import * as http from 'http'
import { setTimeout } from 'node:timers/promises'
import { WebSocket } from 'ws'
import { createMockShellPath, root } from './MockShellUtils.ts'
import { join } from 'node:path'

export interface SocketBasedIntegrationTestOptions {
  command?: string
  args?: string[]
  cwd?: string
  timeout?: number
  expectedOutput?: string[]
  expectedError?: string[]
  input?: string[]
  port?: number
}

export class SocketBasedIntegrationTestFramework {
  private ptyHostProcess: ChildProcess | null = null
  private websocket: WebSocket | null = null
  private server: http.Server | null = null
  private output: string = ''
  private error: string = ''
  private ready: boolean = false
  private isExited: boolean = false
  private exitCode: number | null = null
  private terminalId: number = 1
  private port: number
  private messageHandlers: Map<string, (data: any) => void> = new Map()

  constructor(private options: SocketBasedIntegrationTestOptions) {
    this.port = options.port || 0 // 0 means let the system choose a free port
  }

  async start(): Promise<void> {
    // Start WebSocket server
    await this.startWebSocketServer()

    // Start ptyHost process and connect it to our WebSocket server
    await this.startPtyHost()

    // Wait for terminal to be ready
    await this.waitForReady()
  }

  private async startWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer()

      this.server.on('upgrade', (request, socket, head) => {
        // Create WebSocket connection using the ws library
        const ws = new WebSocket(null)
        ws.setSocket(socket, request, head)

        // Store the WebSocket for communication
        this.websocket = ws

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString())
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        })

        ws.on('close', () => {
          this.isExited = true
        })

        ws.on('error', (error) => {
          console.error('WebSocket error:', error)
        })
      })

      this.server.listen(this.port, () => {
        const address = this.server!.address()
        if (typeof address === 'object' && address) {
          this.port = address.port
        }
        resolve()
      })

      this.server.on('error', reject)
    })
  }

  private async startPtyHost(): Promise<void> {
    // Start ptyHost with WebSocket IPC and connect it to our server
    const ptyHostPath = join(root, 'packages/pty-host/src/ptyHostMain.ts')

    this.ptyHostProcess = spawn(
      'node',
      [
        ptyHostPath,
        '--ipc-type=websocket',
        `--websocket-url=ws://localhost:${this.port}`,
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      },
    )

    // Wait a bit for ptyHost to connect
    await setTimeout(1000)

    // Create terminal with mockshell
    await this.createTerminal()
  }

  private handleMessage(message: any): void {
    if (message.jsonrpc === '2.0' && message.method === 'Viewlet.send') {
      const [terminalId, method, data] = message.params

      if (method === 'handleData') {
        this.output += data
        // Check if we've received the initial prompt
        if (data.includes('$ ') && !this.ready) {
          this.ready = true
        }
      }
    }

    // Handle other message types as needed
    const messageId = message.id
    if (messageId && this.messageHandlers.has(messageId)) {
      const handler = this.messageHandlers.get(messageId)!
      handler(message)
      this.messageHandlers.delete(messageId)
    }
  }

  private async createTerminal(): Promise<void> {
    const mockShellPath = createMockShellPath()

    const message = {
      jsonrpc: '2.0',
      id: randomUUID(),
      method: 'Terminal.create',
      params: [this.terminalId, process.cwd(), 'node', [mockShellPath]],
    }

    await this.sendMessage(message)
  }

  private async sendMessage(message: any): Promise<any> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    return new Promise((resolve, reject) => {
      const messageId = message.id
      if (messageId) {
        this.messageHandlers.set(messageId, (response) => {
          if (response.error) {
            reject(new Error(response.error.message))
          } else {
            resolve(response.result)
          }
        })
      }

      this.websocket!.send(JSON.stringify(message))
    })
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

    const message = {
      jsonrpc: '2.0',
      id: randomUUID(),
      method: 'Terminal.write',
      params: [this.terminalId, input],
    }

    await this.sendMessage(message)
  }

  async resize(columns: number, rows: number): Promise<void> {
    const message = {
      jsonrpc: '2.0',
      id: randomUUID(),
      method: 'Terminal.resize',
      params: [this.terminalId, columns, rows],
    }

    await this.sendMessage(message)
  }

  async dispose(): Promise<void> {
    if (this.terminalId) {
      const message = {
        jsonrpc: '2.0',
        id: randomUUID(),
        method: 'Terminal.dispose',
        params: [this.terminalId],
      }

      try {
        await this.sendMessage(message)
      } catch {
        // Ignore errors when disposing
      }
    }

    if (this.websocket) {
      this.websocket.close()
    }

    if (this.ptyHostProcess && !this.isExited) {
      this.ptyHostProcess.kill()
    }

    if (this.server) {
      this.server.close()
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

export function createSocketBasedIntegrationTest(
  options: Partial<SocketBasedIntegrationTestOptions>,
): SocketBasedIntegrationTestFramework {
  const defaultOptions: SocketBasedIntegrationTestOptions = {
    timeout: 10_000,
  }

  return new SocketBasedIntegrationTestFramework({
    ...defaultOptions,
    ...options,
  })
}
