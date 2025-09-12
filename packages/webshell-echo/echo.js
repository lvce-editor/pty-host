// Echo command WebWorker with redirection support
// Standalone JavaScript file for WebWorker execution

class EchoCommand {
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
      
      // Parse for redirection
      const { text, redirection, filename } = this.parseArgs(args)
      
      if (redirection === '>') {
        // Overwrite file
        const absolutePath = this.getAbsolutePath(filename, currentPath)
        const success = this.writeFile(filesystem, absolutePath, text)
        
        if (!success) {
          this.sendStderr(message.id, `echo: cannot create file '${filename}': Permission denied\n`)
          this.sendExit(message.id, 1)
          return
        }
        
        this.sendExit(message.id, 0)
      } else if (redirection === '>>') {
        // Append to file
        const absolutePath = this.getAbsolutePath(filename, currentPath)
        const existingContent = this.readFile(filesystem, absolutePath) || ''
        const newContent = existingContent + text
        const success = this.writeFile(filesystem, absolutePath, newContent)
        
        if (!success) {
          this.sendStderr(message.id, `echo: cannot write to file '${filename}': Permission denied\n`)
          this.sendExit(message.id, 1)
          return
        }
        
        this.sendExit(message.id, 0)
      } else {
        // Normal echo to stdout
        this.sendStdout(message.id, text + '\n')
        this.sendExit(message.id, 0)
      }
    } catch (error) {
      this.sendError(message.id, error.message)
    }
  }

  parseArgs(args) {
    let text = ''
    let redirection = null
    let filename = ''
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      
      if (arg === '>') {
        redirection = '>'
        if (i + 1 < args.length) {
          filename = args[i + 1]
        }
        break
      } else if (arg === '>>') {
        redirection = '>>'
        if (i + 1 < args.length) {
          filename = args[i + 1]
        }
        break
      } else if (arg.startsWith('>')) {
        redirection = '>'
        filename = arg.substring(1)
        break
      } else if (arg.startsWith('>>')) {
        redirection = '>>'
        filename = arg.substring(2)
        break
      } else {
        text += (text ? ' ' : '') + arg
      }
    }
    
    return { text, redirection, filename }
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

  writeFile(filesystem, path, content) {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const fileName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (fileName === '' || fileName === '/') {
      return false
    }

    const parent = this.getNode(filesystem, parentPath)
    if (!parent || parent.type !== 'directory') {
      return false
    }

    if (!parent.children) {
      parent.children = new Map()
    }

    parent.children.set(fileName, {
      type: 'file',
      name: fileName,
      content,
      permissions: '-rw-r--r--',
      owner: 'user',
      group: 'user',
      size: new TextEncoder().encode(content).length,
      modified: new Date()
    })

    return true
  }

  readFile(filesystem, path) {
    const node = this.getNode(filesystem, path)
    return node && node.type === 'file' ? node.content || '' : null
  }

  normalizePath(path) {
    if (path.startsWith('/')) {
      return path
    }
    return path
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
new EchoCommand()

