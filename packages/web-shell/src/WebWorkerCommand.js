// WebWorkerCommand - JavaScript version
export class WebWorkerCommandManager {
  constructor(filesystem, initialPath = '/') {
    this.fs = filesystem
    this.currentPath = initialPath
    this.commands = new Map()
  }

  async installCommand(name, workerUrl, description, version = '1.0.0') {
    try {
      const worker = new Worker(workerUrl)
      const command = {
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

  async executeCommand(name, args) {
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

    const message = {
      type: 'execute',
      id: executionId,
      args,
      filesystem: this.fs,
      currentPath: this.currentPath
    }

    command.worker.postMessage(message)

    // Return a promise that resolves when the command completes
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.terminateCommand(name)
        reject(new Error(`Command ${name} timed out`))
      }, 30000) // 30 second timeout

      const handleResponse = (response) => {
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
      command.responseHandler = handleResponse
    })
  }

  terminateCommand(name) {
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

  terminateAllCommands() {
    for (const [name, command] of this.commands) {
      this.terminateCommand(name)
    }
  }

  getAvailableCommands() {
    return Array.from(this.commands.values()).map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      version: cmd.version,
      isRunning: cmd.isRunning
    }))
  }

  isCommandRunning(name) {
    const command = this.commands.get(name)
    return command ? command.isRunning : false
  }

  handleCommandResponse(response) {
    const command = Array.from(this.commands.values()).find(cmd => cmd.currentExecutionId === response.id)
    if (command && command.responseHandler) {
      command.responseHandler(response)
    }
  }

  handleCommandError(name, error) {
    const command = this.commands.get(name)
    if (command && command.responseHandler) {
      command.responseHandler({
        type: 'error',
        id: command.currentExecutionId || '',
        error
      })
    }
  }

  updateFilesystem(filesystem) {
    this.fs = filesystem
  }

  updateCurrentPath(path) {
    this.currentPath = path
  }
}

