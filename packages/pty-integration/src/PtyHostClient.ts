import { WebSocket } from 'ws'
// import { createServer } from 'http' // Not used currently
import { fork, spawn } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface PtyHostClientOptions {
  port?: number
  timeout?: number
}

export interface TerminalCreateParams {
  id: number
  cwd: string
  command: string
  args: string[]
}

export interface TerminalResizeParams {
  id: number
  columns: number
  rows: number
}

export interface TerminalWriteParams {
  id: number
  data: string
}

export interface TerminalDisposeParams {
  id: number
}

export interface ViewletSendMessage {
  jsonrpc: '2.0'
  method: 'Viewlet.send'
  params: [number, string, any]
}

export class PtyHostClient {
  private server: any
  private webSocket: WebSocket | null = null
  private ptyHostProcess: any = null
  private port: number
  private timeout: number
  private messageHandlers: Map<string, (data: any) => void> = new Map()
  private requestId = 0

  constructor(options: PtyHostClientOptions = {}) {
    this.port = options.port || 0 // 0 means random available port
    this.timeout = options.timeout || 10000
  }

  async start(): Promise<void> {
    // Start pty-host process first
    const ptyHostPath = join(__dirname, '../../pty-host/src/ptyHostMain.ts')
    this.ptyHostProcess = fork(ptyHostPath, ['--ipc-type=websocket'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Wait a bit for the process to start
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Create WebSocket connection to pty-host
    // The pty-host should be listening on a port
    // For now, let's assume it's listening on port 3000
    const wsUrl = `ws://localhost:3000`

    this.webSocket = new WebSocket(wsUrl)

    this.webSocket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())
        this.handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    })

    this.webSocket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    // Wait for WebSocket connection
    await this.waitForConnection()
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.timeout}ms`))
      }, this.timeout)

      const checkConnection = () => {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
          clearTimeout(timeout)
          resolve()
        } else {
          setTimeout(checkConnection, 10)
        }
      }

      checkConnection()
    })
  }

  private handleMessage(message: any): void {
    if (message.method === 'Viewlet.send') {
      const [id, eventType, data] = message.params
      const handlerKey = `${id}:${eventType}`
      const handler = this.messageHandlers.get(handlerKey)
      if (handler) {
        handler(data)
      }
    }
  }

  private async sendRequest(method: string, params: any[]): Promise<any> {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const id = ++this.requestId
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout after ${this.timeout}ms`))
      }, this.timeout)

      const handleMessage = (data: any) => {
        try {
          const message = JSON.parse(data.toString())
          if (message.id === id) {
            clearTimeout(timeout)
            this.webSocket?.off('message', handleMessage)
            if (message.error) {
              reject(new Error(message.error.message || 'RPC error'))
            } else {
              resolve(message.result)
            }
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      }

      this.webSocket?.on('message', handleMessage)
      this.webSocket?.send(JSON.stringify(request))
    })
  }

  async createTerminal(params: TerminalCreateParams): Promise<void> {
    await this.sendRequest('Terminal.create', [
      params.id,
      params.cwd,
      params.command,
      params.args,
    ])
  }

  async resizeTerminal(params: TerminalResizeParams): Promise<void> {
    await this.sendRequest('Terminal.resize', [
      params.id,
      params.columns,
      params.rows,
    ])
  }

  async writeToTerminal(params: TerminalWriteParams): Promise<void> {
    await this.sendRequest('Terminal.write', [params.id, params.data])
  }

  async disposeTerminal(params: TerminalDisposeParams): Promise<void> {
    await this.sendRequest('Terminal.dispose', [params.id])
  }

  onTerminalData(terminalId: number, callback: (data: any) => void): void {
    this.messageHandlers.set(`${terminalId}:handleData`, callback)
  }

  onTerminalExit(terminalId: number, callback: (data: any) => void): void {
    this.messageHandlers.set(`${terminalId}:handleExit`, callback)
  }

  async stop(): Promise<void> {
    if (this.webSocket) {
      this.webSocket.close()
      this.webSocket = null
    }

    if (this.ptyHostProcess) {
      this.ptyHostProcess.kill()
      this.ptyHostProcess = null
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve())
      })
      this.server = null
    }
  }

  getPort(): number {
    return this.port
  }
}
