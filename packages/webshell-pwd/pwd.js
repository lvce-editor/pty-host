// Print working directory command WebWorker
// Standalone JavaScript file for WebWorker execution

class PwdCommand {
  constructor() {
    this.setupMessageHandler()
  }

  setupMessageHandler() {
    self.onmessage = (event) => {
      const message = event.data
      
      switch (message.type) {
        case 'execute':
          this.execute(message)
          break
        case 'terminate':
          this.terminate()
          break
        case 'ping':
          this.pong(message.id)
          break
        default:
          this.sendError(message.id, 'Unknown message type')
      }
    }
  }

  execute(message) {
    try {
      const currentPath = message.currentPath || '/'
      
      this.sendStdout(message.id, currentPath + '\n')
      this.sendExit(message.id, 0)
    } catch (error) {
      this.sendError(message.id, error.message)
    }
  }

  terminate() {
    self.close()
  }

  pong(id) {
    this.sendResponse({
      type: 'pong',
      id: id
    })
  }

  sendResponse(response) {
    self.postMessage(response)
  }

  sendStdout(id, data) {
    this.sendResponse({
      type: 'stdout',
      id: id,
      data: data
    })
  }

  sendStderr(id, data) {
    this.sendResponse({
      type: 'stderr',
      id: id,
      data: data
    })
  }

  sendExit(id, exitCode) {
    this.sendResponse({
      type: 'exit',
      id: id,
      exitCode: exitCode
    })
  }

  sendError(id, error) {
    this.sendResponse({
      type: 'error',
      id: id,
      error: error
    })
  }
}

// Initialize the command
new PwdCommand()

