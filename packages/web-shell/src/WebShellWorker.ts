import { FakeFileSystem } from './FakeFileSystem.js'
import { WebWorkerCommandManager, CommandResponse } from './WebWorkerCommand.js'

export interface ShellOptions {
  prompt?: string
  enableColors?: boolean
  enableHistory?: boolean
  maxHistorySize?: number
  commandBaseUrl?: string
}

export class WebShellWorker {
  private fs: FakeFileSystem
  private commandManager: WebWorkerCommandManager
  private history: string[] = []
  private options: Required<ShellOptions>

  constructor(options: ShellOptions = {}) {
    this.fs = new FakeFileSystem()
    this.options = {
      prompt: 'user@fake-terminal:~$ ',
      enableColors: true,
      enableHistory: true,
      maxHistorySize: 1000,
      commandBaseUrl: '/packages/',
      ...options
    }
    
    this.commandManager = new WebWorkerCommandManager(this.fs, this.fs.getCurrentPath())
    this.initializeCommands()
  }

  private async initializeCommands(): Promise<void> {
    // Install built-in commands
    const commands = [
      { name: 'echo', url: `${this.options.commandBaseUrl}webshell-echo/echo.js`, description: 'Display text', version: '1.0.0' },
      { name: 'cd', url: `${this.options.commandBaseUrl}webshell-cd/cd.js`, description: 'Change directory', version: '1.0.0' },
      { name: 'ls', url: `${this.options.commandBaseUrl}webshell-ls/ls.js`, description: 'List directory contents', version: '1.0.0' },
      { name: 'cat', url: `${this.options.commandBaseUrl}webshell-cat/cat.js`, description: 'Display file contents', version: '1.0.0' },
      { name: 'pwd', url: `${this.options.commandBaseUrl}webshell-pwd/pwd.js`, description: 'Print working directory', version: '1.0.0' }
    ]

    for (const cmd of commands) {
      try {
        await this.commandManager.installCommand(cmd.name, cmd.url, cmd.description, cmd.version)
        console.log(`Installed command: ${cmd.name}`)
      } catch (error) {
        console.error(`Failed to install command ${cmd.name}:`, error)
      }
    }
  }

  async executeCommand(input: string): Promise<{ output: string; exitCode: number }> {
    const trimmedInput = input.trim()
    
    if (trimmedInput === '') {
      return { output: '', exitCode: 0 }
    }

    // Add to history
    if (this.options.enableHistory) {
      this.history.push(trimmedInput)
      if (this.history.length > this.options.maxHistorySize) {
        this.history.shift()
      }
    }

    // Handle special commands
    if (trimmedInput === 'exit' || trimmedInput === 'quit') {
      this.terminateAllCommands()
      return { output: 'Goodbye!\n', exitCode: 0 }
    }

    if (trimmedInput === 'clear') {
      return { output: '\x1b[2J', exitCode: 0 }
    }

    if (trimmedInput === 'help') {
      return this.showHelp()
    }

    if (trimmedInput === 'history') {
      return this.showHistory()
    }

    if (trimmedInput === 'commands') {
      return this.showCommands()
    }

    // Parse command and arguments
    const parts = this.parseCommand(trimmedInput)
    const commandName = parts[0]
    const args = parts.slice(1)

    // Execute command using WebWorker
    try {
      const result = await this.executeWebWorkerCommand(commandName, args)
      return result
    } catch (error) {
      return {
        output: `bash: ${commandName}: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
        exitCode: 127
      }
    }
  }

  private async executeWebWorkerCommand(commandName: string, args: string[]): Promise<{ output: string; exitCode: number }> {
    const availableCommands = this.commandManager.getAvailableCommands()
    const command = availableCommands.find(cmd => cmd.name === commandName)
    
    if (!command) {
      throw new Error('command not found')
    }

    if (command.isRunning) {
      throw new Error('command is already running')
    }

    // Update filesystem state in command manager
    this.commandManager.updateFilesystem(this.fs)
    this.commandManager.updateCurrentPath(this.fs.getCurrentPath())

    // Execute the command
    const result = await this.commandManager.executeCommand(commandName, args)
    
    // Process the result
    let output = ''
    let exitCode = 0

    // Handle streaming responses
    const handleResponse = (response: CommandResponse) => {
      switch (response.type) {
        case 'stdout':
          output += response.data || ''
          break
        case 'stderr':
          output += response.data || ''
          break
        case 'exit':
          exitCode = response.exitCode || 0
          break
        case 'error':
          throw new Error(response.error || 'Unknown error')
      }
    }

    // Set up response handler
    const commandInfo = this.commandManager as any
    if (commandInfo.commands && commandInfo.commands.has(commandName)) {
      const cmd = commandInfo.commands.get(commandName)
      cmd.responseHandler = handleResponse
    }

    // Wait for completion
    await result

    return { output, exitCode }
  }

  private parseCommand(input: string): string[] {
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < input.length; i++) {
      const char = input[i]
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false
        quoteChar = ''
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          parts.push(current)
          current = ''
        }
      } else {
        current += char
      }
    }

    if (current) {
      parts.push(current)
    }

    return parts
  }

  private showHelp(): { output: string; exitCode: number } {
    const availableCommands = this.commandManager.getAvailableCommands()
    const commandList = availableCommands.map(cmd => `  ${cmd.name.padEnd(12)} - ${cmd.description}`).join('\n')
    
    const helpText = `Available commands:
${commandList}

Special commands:
  clear                 - Clear screen
  help                  - Show this help
  history               - Show command history
  commands              - List installed commands
  exit/quit             - Exit shell
`
    return { output: helpText, exitCode: 0 }
  }

  private showCommands(): { output: string; exitCode: number } {
    const availableCommands = this.commandManager.getAvailableCommands()
    const commandList = availableCommands.map(cmd => 
      `${cmd.name.padEnd(12)} v${cmd.version.padEnd(8)} ${cmd.isRunning ? '[RUNNING]' : '[READY]'} - ${cmd.description}`
    ).join('\n')
    
    return { output: commandList + '\n', exitCode: 0 }
  }

  private showHistory(): { output: string; exitCode: number } {
    if (this.history.length === 0) {
      return { output: 'No commands in history\n', exitCode: 0 }
    }

    const historyText = this.history
      .map((cmd, index) => `${(index + 1).toString().padStart(4)}  ${cmd}`)
      .join('\n') + '\n'

    return { output: historyText, exitCode: 0 }
  }

  async installCommand(name: string, workerUrl: string, description: string, version: string = '1.0.0'): Promise<boolean> {
    return this.commandManager.installCommand(name, workerUrl, description, version)
  }

  terminateCommand(name: string): boolean {
    return this.commandManager.terminateCommand(name)
  }

  terminateAllCommands(): void {
    this.commandManager.terminateAllCommands()
  }

  getPrompt(): string {
    const currentPath = this.fs.getCurrentPath()
    const shortPath = currentPath === '/home/user' ? '~' : 
                     currentPath.startsWith('/home/user/') ? '~' + currentPath.substring(10) :
                     currentPath
    
    return this.options.prompt.replace('~', shortPath)
  }

  getCurrentPath(): string {
    return this.fs.getCurrentPath()
  }

  getFileSystem(): FakeFileSystem {
    return this.fs
  }

  getHistory(): string[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }

  setPrompt(prompt: string): void {
    this.options.prompt = prompt
  }

  getAvailableCommands(): Array<{ name: string; description: string; version: string; isRunning: boolean }> {
    return this.commandManager.getAvailableCommands()
  }

  // For integration with terminal recording/replay
  async simulateInput(input: string): Promise<{ output: string; exitCode: number }> {
    const result = await this.executeCommand(input)
    
    // Add prompt for next command
    const fullOutput = result.output + (result.exitCode === 0 ? this.getPrompt() : '')
    
    return {
      output: fullOutput,
      exitCode: result.exitCode
    }
  }
}

