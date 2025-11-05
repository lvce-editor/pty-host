export interface CommandMessage {
  type: 'execute' | 'terminate' | 'ping'
  id: string
  args?: string[]
  filesystem?: any
  currentPath?: string
}

export interface CommandResponse {
  type: 'stdout' | 'stderr' | 'exit' | 'error' | 'pong'
  id: string
  data?: any
  exitCode?: number
  error?: string
}

export interface WebWorkerCommand {
  name: string
  description: string
  version: string
  worker: Worker
  isRunning: boolean
  currentExecutionId: string | null
}

export class WebWorkerCommandManager {
  private commands: Map<string, WebWorkerCommand> = new Map()
  private filesystem: any
  private currentPath: string = '/'

  constructor(filesystem: any, initialPath: string = '/') {
    this.filesystem = filesystem
    this.currentPath = initialPath
  }

  async installCommand(name: string, workerUrl: string, description: string, version: string = '1.0.0'): Promise<boolean> {
    try {
      const worker = new Worker(workerUrl)
      const command: WebWorkerCommand = {
        name,
        description,
        version,
        worker,
        isRunning: false,
        currentExecutionId: null
      }

      // Set up message handling
      worker.onmessage = (event) => {
        this.handleCommandResponse(event.data)
      }

      worker.onerror = (error) => {
        console.error(`Worker error for command ${name}:`, error)
        this.handleCommandError(name, error.message)
      }

      this.commands.set(name, command)
      return true
    } catch (error) {
      console.error(`Failed to install command ${name}:`, error)
      return false
    }
  }

  async executeCommand(name: string, args: string[]): Promise<Promise<CommandResponse>> {
    const command = this.commands.get(name)
    if (!command) {
      throw new Error(`Command ${name} not found`)
    }

    if (command.isRunning) {
      throw new Error(`Command ${name} is already running`)
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    command.isRunning = true
    command.currentExecutionId = executionId

    const message: CommandMessage = {
      type: 'execute',
      id: executionId,
      args,
      filesystem: this.filesystem,
      currentPath: this.currentPath
    }

    command.worker.postMessage(message)

    // Return a promise that resolves when the command completes
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.terminateCommand(name)
        reject(new Error(`Command ${name} timed out`))
      }, 30000) // 30 second timeout

      const handleResponse = (response: CommandResponse) => {
        if (response.id === executionId) {
          if (response.type === 'exit') {
            clearTimeout(timeout)
            command.isRunning = false
            command.currentExecutionId = null
            resolve(response)
          } else if (response.type === 'error') {
            clearTimeout(timeout)
            command.isRunning = false
            command.currentExecutionId = null
            reject(new Error(response.error || 'Unknown error'))
          }
        }
      }

      // Store the handler temporarily
      ;(command as any).responseHandler = handleResponse
    })
  }

  terminateCommand(name: string): boolean {
    const command = this.commands.get(name)
    if (!command) {
      return false
    }

    if (command.isRunning) {
      command.worker.postMessage({ type: 'terminate', id: command.currentExecutionId })
      command.isRunning = false
      command.currentExecutionId = null
    }

    command.worker.terminate()
    this.commands.delete(name)
    return true
  }

  terminateAllCommands(): void {
    for (const [name, command] of this.commands) {
      this.terminateCommand(name)
    }
  }

  getAvailableCommands(): Array<{ name: string; description: string; version: string; isRunning: boolean }> {
    return Array.from(this.commands.values()).map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      version: cmd.version,
      isRunning: cmd.isRunning
    }))
  }

  isCommandRunning(name: string): boolean {
    const command = this.commands.get(name)
    return command ? command.isRunning : false
  }

  private handleCommandResponse(response: CommandResponse): void {
    const command = Array.from(this.commands.values()).find(cmd => cmd.currentExecutionId === response.id)
    if (command && (command as any).responseHandler) {
      (command as any).responseHandler(response)
    }
  }

  private handleCommandError(name: string, error: string): void {
    const command = this.commands.get(name)
    if (command && (command as any).responseHandler) {
      (command as any).responseHandler({
        type: 'error',
        id: command.currentExecutionId || '',
        error
      })
    }
  }

  updateFilesystem(filesystem: any): void {
    this.filesystem = filesystem
  }

  updateCurrentPath(path: string): void {
    this.currentPath = path
  }
}

