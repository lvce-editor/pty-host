// Remove files command WebWorker
// Standalone JavaScript file for WebWorker execution

class RmCommand {
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
        this.sendStderr(message.id, 'rm: missing operand\n')
        this.sendExit(message.id, 1)
        return
      }

      const options = this.parseOptions(args)
      const paths = args.filter(arg => !arg.startsWith('-'))

      const results = []
      let hasError = false

      for (const filePath of paths) {
        const absolutePath = this.getAbsolutePath(filePath, currentPath)
        
        if (!this.pathExists(filesystem, absolutePath)) {
          results.push(`rm: cannot remove '${filePath}': No such file or directory\n`)
          hasError = true
          continue
        }

        if (this.isDirectory(filesystem, absolutePath)) {
          if (options.recursive) {
            const success = this.removeDirectory(filesystem, absolutePath)
            if (!success) {
              results.push(`rm: cannot remove '${filePath}': Permission denied\n`)
              hasError = true
            }
          } else {
            results.push(`rm: cannot remove '${filePath}': Is a directory\n`)
            hasError = true
          }
          continue
        }

        const success = this.removeFile(filesystem, absolutePath)
        if (!success) {
          results.push(`rm: cannot remove '${filePath}': Permission denied\n`)
          hasError = true
        }
      }

      const output = results.join('')
      if (output) {
        this.sendStderr(message.id, output)
      }
      
      this.sendExit(message.id, hasError ? 1 : 0)
    } catch (error) {
      this.sendError(message.id, error.message)
    }
  }

  parseOptions(args) {
    const recursive = args.includes('-r') || args.includes('-R') || args.includes('--recursive')
    const force = args.includes('-f') || args.includes('--force')
    return { recursive, force }
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

  removeFile(filesystem, path) {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const fileName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (fileName === '' || fileName === '/') {
      return false
    }

    const parent = this.getNode(filesystem, parentPath)
    if (!parent || parent.type !== 'directory' || !parent.children) {
      return false
    }

    return parent.children.delete(fileName)
  }

  removeDirectory(filesystem, path) {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const dirName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (dirName === '' || dirName === '/') {
      return false
    }

    const parent = this.getNode(filesystem, parentPath)
    if (!parent || parent.type !== 'directory' || !parent.children) {
      return false
    }

    return parent.children.delete(dirName)
  }

  normalizePath(path) {
    if (path.startsWith('/')) {
      return path
    }
    return path
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
new RmCommand()
