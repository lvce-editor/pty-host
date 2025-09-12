// Cat command WebWorker
// Standalone JavaScript file for WebWorker execution

class CatCommand {
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
      const filesystem = message.filesystem
      const currentPath = message.currentPath || '/'
      
      if (args.length === 0) {
        this.sendStderr(message.id, 'cat: missing file operand\n')
        this.sendExit(message.id, 1)
        return
      }

      const results = []
      let hasError = false

      for (const filePath of args) {
        const absolutePath = this.getAbsolutePath(filePath, currentPath)
        
        if (!this.pathExists(filesystem, absolutePath)) {
          results.push(`cat: ${filePath}: No such file or directory`)
          hasError = true
          continue
        }

        if (this.isDirectory(filesystem, absolutePath)) {
          results.push(`cat: ${filePath}: Is a directory`)
          hasError = true
          continue
        }

        const content = this.readFile(filesystem, absolutePath)
        if (content !== null) {
          results.push(content)
        } else {
          results.push(`cat: ${filePath}: Permission denied`)
          hasError = true
        }
      }

      const output = results.join('')
      if (output) {
        this.sendStdout(message.id, output)
      }
      
      this.sendExit(message.id, hasError ? 1 : 0)
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
    const node = this.getNode(filesystem, path)
    return node ? node.type === 'directory' : false
  }

  getNode(filesystem, path) {
    if (path === '/') {
      return filesystem.root
    }

    const parts = path.split('/').filter(part => part !== '')
    let current = filesystem.root

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) {
        return null
      }
      current = current.children.get(part)
    }

    return current
  }

  readFile(filesystem, path) {
    const node = this.getNode(filesystem, path)
    return node && node.type === 'file' ? node.content || '' : null
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
new CatCommand()

