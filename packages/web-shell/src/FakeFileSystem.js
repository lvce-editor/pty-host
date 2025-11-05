// FakeFileSystem - JavaScript version
export class FakeFileSystem {
  constructor() {
    this.currentPath = '/'
    this.root = this.createRoot()
    this.initializeDefaultStructure()
  }

  createRoot() {
    return {
      type: 'directory',
      name: '/',
      children: new Map(),
      permissions: 'drwxr-xr-x',
      owner: 'root',
      group: 'root',
      size: 4096,
      modified: new Date()
    }
  }

  initializeDefaultStructure() {
    // Create common directories
    this.createDirectory('/home')
    this.createDirectory('/home/user')
    this.createDirectory('/home/user/Documents')
    this.createDirectory('/home/user/Downloads')
    this.createDirectory('/home/user/Desktop')
    this.createDirectory('/etc')
    this.createDirectory('/var')
    this.createDirectory('/tmp')
    this.createDirectory('/usr')
    this.createDirectory('/usr/bin')
    this.createDirectory('/usr/local')
    this.createDirectory('/opt')

    // Create some sample files
    this.createFile('/home/user/Documents/readme.txt', 'This is a sample readme file.\nIt contains multiple lines.\nFor testing purposes.')
    this.createFile('/home/user/Documents/notes.md', '# My Notes\n\n- Important task 1\n- Important task 2\n- Meeting at 3 PM')
    this.createFile('/home/user/Downloads/sample.log', '2024-01-01 10:00:00 INFO: Application started\n2024-01-01 10:01:00 DEBUG: Loading configuration\n2024-01-01 10:02:00 ERROR: Connection failed\n2024-01-01 10:03:00 INFO: Retrying connection')
    this.createFile('/etc/hostname', 'fake-terminal')
    this.createFile('/etc/os-release', 'NAME="Fake Linux"\nVERSION="1.0"\nID=fake\nPRETTY_NAME="Fake Linux 1.0"')
    this.createFile('/home/user/.bashrc', 'export PS1="\\u@\\h:\\w$ "\nexport PATH="/usr/bin:/usr/local/bin"\nalias ll="ls -la"')
    this.createFile('/home/user/.profile', 'source ~/.bashrc')
  }

  getCurrentPath() {
    return this.currentPath
  }

  setCurrentPath(path) {
    const normalizedPath = this.normalizePath(path)
    if (this.pathExists(normalizedPath)) {
      const node = this.getNode(normalizedPath)
      if (node && node.type === 'directory') {
        this.currentPath = normalizedPath
        return true
      }
    }
    return false
  }

  normalizePath(path) {
    if (path.startsWith('/')) {
      return path
    }

    if (this.currentPath === '/') {
      return '/' + path
    }

    return this.currentPath + '/' + path
  }

  getNode(path) {
    if (path === '/') {
      return this.root
    }

    const parts = path.split('/').filter(part => part !== '')
    let current = this.root

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) {
        return null
      }
      current = current.children.get(part)
    }

    return current
  }

  pathExists(path) {
    return this.getNode(this.normalizePath(path)) !== null
  }

  isDirectory(path) {
    const node = this.getNode(this.normalizePath(path))
    return node ? node.type === 'directory' : false
  }

  isFile(path) {
    const node = this.getNode(this.normalizePath(path))
    return node ? node.type === 'file' : false
  }

  createFile(path, content = '') {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const fileName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (fileName === '' || fileName === '/') {
      return false
    }

    const parent = this.getNode(parentPath)
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

  createDirectory(path) {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const dirName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (dirName === '' || dirName === '/') {
      return false
    }

    const parent = this.getNode(parentPath)
    if (!parent || parent.type !== 'directory') {
      return false
    }

    if (!parent.children) {
      parent.children = new Map()
    }

    parent.children.set(dirName, {
      type: 'directory',
      name: dirName,
      children: new Map(),
      permissions: 'drwxr-xr-x',
      owner: 'user',
      group: 'user',
      size: 4096,
      modified: new Date()
    })

    return true
  }

  readFile(path) {
    const node = this.getNode(this.normalizePath(path))
    return node && node.type === 'file' ? node.content || '' : null
  }

  writeFile(path, content) {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const fileName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (fileName === '' || fileName === '/') {
      return false
    }

    const parent = this.getNode(parentPath)
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

  listDirectory(path) {
    const node = this.getNode(this.normalizePath(path))
    if (!node || node.type !== 'directory' || !node.children) {
      return null
    }

    return Array.from(node.children.entries()).map(([name, node]) => ({ name, node }))
  }

  deleteNode(path) {
    const normalizedPath = this.normalizePath(path)
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    const nodeName = normalizedPath.substring(normalizedPath.lastIndexOf('/') + 1)

    if (nodeName === '' || nodeName === '/') {
      return false
    }

    const parent = this.getNode(parentPath)
    if (!parent || parent.type !== 'directory' || !parent.children) {
      return false
    }

    return parent.children.delete(nodeName)
  }

  getAbsolutePath(path) {
    if (path.startsWith('/')) {
      return path
    }

    const parts = this.currentPath.split('/').filter(part => part !== '')
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

  getRelativePath(path) {
    const absolutePath = this.getAbsolutePath(path)
    const currentParts = this.currentPath.split('/').filter(part => part !== '')
    const targetParts = absolutePath.split('/').filter(part => part !== '')

    let commonLength = 0
    while (commonLength < currentParts.length &&
           commonLength < targetParts.length &&
           currentParts[commonLength] === targetParts[commonLength]) {
      commonLength++
    }

    const upLevels = currentParts.length - commonLength
    const downParts = targetParts.slice(commonLength)

    if (upLevels === 0 && downParts.length === 0) {
      return '.'
    }

    const upPath = '../'.repeat(upLevels)
    const downPath = downParts.join('/')

    return upPath + downPath
  }
}

