import { FakeFileSystem } from './FakeFileSystem.js'
import { AnsiCodes } from './AnsiCodes.js'
import { EchoCommand } from './commands/EchoCommand.js'
import { CatCommand } from './commands/CatCommand.js'
import { LsCommand } from './commands/LsCommand.js'
import { GrepCommand } from './commands/GrepCommand.js'
import { PwdCommand } from './commands/PwdCommand.js'
import { CdCommand } from './commands/CdCommand.js'
import { MkdirCommand } from './commands/MkdirCommand.js'
import { TouchCommand } from './commands/TouchCommand.js'
import { BaseCommand, CommandResult } from './commands/BaseCommand.js'

export interface ShellOptions {
  prompt?: string
  enableColors?: boolean
  enableHistory?: boolean
  maxHistorySize?: number
}

export class WebShell {
  private fs: FakeFileSystem
  private commands: Map<string, BaseCommand>
  private history: string[] = []
  private options: Required<ShellOptions>

  constructor(options: ShellOptions = {}) {
    this.fs = new FakeFileSystem()
    this.options = {
      prompt: 'user@fake-terminal:~$ ',
      enableColors: true,
      enableHistory: true,
      maxHistorySize: 1000,
      ...options
    }

    this.initializeCommands()
  }

  private initializeCommands(): void {
    this.commands = new Map()
    this.commands.set('echo', new EchoCommand(this.fs))
    this.commands.set('cat', new CatCommand(this.fs))
    this.commands.set('ls', new LsCommand(this.fs))
    this.commands.set('grep', new GrepCommand(this.fs))
    this.commands.set('pwd', new PwdCommand(this.fs))
    this.commands.set('cd', new CdCommand(this.fs))
    this.commands.set('mkdir', new MkdirCommand(this.fs))
    this.commands.set('touch', new TouchCommand(this.fs))
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
      return { output: 'Goodbye!\n', exitCode: 0 }
    }

    if (trimmedInput === 'clear') {
      return { output: AnsiCodes.clearScreen(), exitCode: 0 }
    }

    if (trimmedInput === 'help') {
      return this.showHelp()
    }

    if (trimmedInput === 'history') {
      return this.showHistory()
    }

    // Parse command and arguments
    const parts = this.parseCommand(trimmedInput)
    const commandName = parts[0]
    const args = parts.slice(1)

    // Execute command
    const command = this.commands.get(commandName)
    if (!command) {
      return {
        output: `bash: ${commandName}: command not found\n`,
        exitCode: 127
      }
    }

    try {
      const result = await command.execute(args)
      return result
    } catch (error) {
      return {
        output: `bash: ${commandName}: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
        exitCode: 1
      }
    }
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
    const helpText = `Available commands:
  echo <text>           - Display text
  cat <file>            - Display file contents
  ls [options] [path]   - List directory contents
  grep <pattern> <file> - Search for pattern in file
  pwd                   - Print working directory
  cd <path>             - Change directory
  mkdir <dir>           - Create directory
  touch <file>          - Create or update file
  clear                 - Clear screen
  help                  - Show this help
  history               - Show command history
  exit/quit             - Exit shell

Options:
  ls -l                 - Long format
  ls -a                 - Show hidden files
  grep -i               - Case insensitive
  grep -n               - Show line numbers
`
    return { output: helpText, exitCode: 0 }
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


