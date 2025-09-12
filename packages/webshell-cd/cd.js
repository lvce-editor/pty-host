// Change directory command WebWorker
// Standalone JavaScript file for WebWorker execution

class CdCommand {
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
      const args = message.args || []
      const targetPath = args.length > 0 ? args[0] : '/home/user'
      const filesystem = message.filesystem
      const currentPath = message.currentPath || '/'
      
      const absolutePath = this.getAbsolutePath(targetPath, currentPath)
      
      if (!this.pathExists(filesystem, absolutePath)) {
        this.sendStderr(message.id, `cd: ${targetPath}: No such file or directory\n`)
        this.sendExit(message.id, 1)
        return
      }

      if (!this.isDirectory(filesystem, absolutePath)) {
        this.sendStderr(message.id, `cd: ${targetPath}: Not a directory\n`)
        this.sendExit(message.id, 1)
        return
      }

      // Update current path in filesystem
      if (filesystem.setCurrentPath) {
        const success = filesystem.setCurrentPath(absolutePath)
        if (!success) {
          this.sendStderr(message.id, `cd: ${targetPath}: Permission denied\n`)
          this.sendExit(message.id, 1)
          return
        }
      }

      // Send success (no output for successful cd)
      this.sendExit(message.id, 0)
    } catch (error) {
      this.sendError(message.id, error.message)
    }
  }

  getAbsolutePath(path, currentPath) {
    if (path.startsWith('/')) {
      return path
    }

    const parts = currentPath.split('/').filter(part => part !== '')
    const pathParts = path.split('/').filter(part => part !== '')

    for (const part of pathParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }

    return '/' + parts.join('/')
  }

  pathExists(filesystem, path) {
    if (path === '/') {
      return true
    }

    const parts = path.split('/').filter(part => part !== '')
    let current = filesystem.root

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) {
        return false
      }
      current = current.children.get(part)
    }

    return true
  }

  isDirectory(filesystem, path) {
    if (path === '/') {
      return true
    }

    const parts = path.split('/').filter(part => part !== '')
    let current = filesystem.root

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) {
        return false
      }
      current = current.children.get(part)
    }

    return current && current.type === 'directory'
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
new CdCommand()

