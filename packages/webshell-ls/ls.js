// List directory command WebWorker
// Standalone JavaScript file for WebWorker execution

class LsCommand {
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
      
      const options = this.parseOptions(args)
      const paths = args.filter(arg => !arg.startsWith('-'))

      if (paths.length === 0) {
        paths.push('.')
      }

      const results = []
      let hasError = false

      for (const path of paths) {
        const absolutePath = this.getAbsolutePath(path, currentPath)
        
        if (!this.pathExists(filesystem, absolutePath)) {
          results.push(`ls: cannot access '${path}': No such file or directory\n`)
          hasError = true
          continue
        }

        if (this.isFile(filesystem, absolutePath)) {
          // Single file
          const fileName = path.substring(path.lastIndexOf('/') + 1)
          if (options.long) {
            const node = this.getNode(filesystem, absolutePath)
            if (node) {
              results.push(this.formatLongEntry(node, fileName))
            }
          } else {
            results.push(fileName + '\n')
          }
          continue
        }

        const entries = this.listDirectory(filesystem, absolutePath)
        if (!entries) {
          results.push(`ls: cannot access '${path}': Permission denied\n`)
          hasError = true
          continue
        }

          if (options.long) {
            // Long format
            const total = entries.reduce((sum, entry) => sum + entry.node.size, 0)
            results.push(`total ${Math.floor(total / 1024)}\n`)
            
            for (const entry of entries) {
              results.push(this.formatLongEntry(entry.node, entry.name, options))
            }
          } else {
            // Short format
            let names = entries.map(entry => entry.name)
            
            if (options.all) {
              names.unshift('.')
              names.unshift('..')
            }

            // Sort entries
            names.sort()

            // Apply colors if enabled
            if (options.color) {
              names = names.map(name => {
                const entry = entries.find(e => e.name === name)
                if (entry) {
                  return this.colorizeName(name, entry.node.type === 'directory', entry.node.permissions)
                }
                return name
              })
            }

            // Format in columns
            const maxWidth = 80
            const entriesPerLine = Math.floor(maxWidth / 20)
            for (let i = 0; i < names.length; i += entriesPerLine) {
              const line = names.slice(i, i + entriesPerLine).join('  ')
              results.push(line + '\n')
            }
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

  parseOptions(args) {
    const long = args.includes('-l') || args.includes('--long')
    const all = args.includes('-a') || args.includes('--all')
    const human = args.includes('-h') || args.includes('--human-readable')
    const color = !args.includes('--no-color')
    return { long, all, human, color }
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

  isFile(filesystem, path) {
    const node = this.getNode(filesystem, path)
    return node ? node.type === 'file' : false
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

  listDirectory(filesystem, path) {
    const node = this.getNode(filesystem, path)
    if (!node || node.type !== 'directory' || !node.children) {
      return null
    }

    return Array.from(node.children.entries()).map(([name, node]) => ({ name, node }))
  }

  formatLongEntry(node, name, options) {
    const permissions = node.permissions || '-rw-r--r--'
    const owner = node.owner || 'user'
    const group = node.group || 'user'
    const size = options.human ? this.formatFileSizeHuman(node.size || 0) : this.formatFileSize(node.size || 0)
    const date = this.formatDate(node.modified || new Date())
    
    let coloredName = name
    if (options.color) {
      coloredName = this.colorizeName(name, node.type === 'directory', permissions)
    }
    
    return `${permissions} ${owner.padEnd(8)} ${group.padEnd(8)} ${size.padStart(8)} ${date} ${coloredName}\n`
  }

  colorizeName(name, isDirectory, permissions) {
    if (isDirectory) {
      return `\x1b[34m${name}\x1b[0m` // Blue for directories
    }

    if (permissions.includes('x')) {
      return `\x1b[32m${name}\x1b[0m` // Green for executables
    }

    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'txt':
      case 'md':
      case 'log':
        return `\x1b[37m${name}\x1b[0m` // White
      case 'js':
      case 'ts':
      case 'json':
        return `\x1b[33m${name}\x1b[0m` // Yellow
      case 'html':
      case 'css':
        return `\x1b[35m${name}\x1b[0m` // Magenta
      case 'py':
      case 'sh':
      case 'bash':
        return `\x1b[32m${name}\x1b[0m` // Green
      case 'zip':
      case 'tar':
      case 'gz':
        return `\x1b[31m${name}\x1b[0m` // Red
      default:
        return `\x1b[37m${name}\x1b[0m` // White
    }
  }

  formatFileSize(size) {
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let fileSize = size

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
  }

  formatFileSizeHuman(size) {
    const units = ['B', 'K', 'M', 'G', 'T']
    let unitIndex = 0
    let fileSize = size

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
  }

  formatDate(date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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
new LsCommand()

