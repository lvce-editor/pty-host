import { FakeFileSystem } from '../FakeFileSystem.js'
import { AnsiCodes } from '../AnsiCodes.js'

export interface CommandResult {
  output: string
  exitCode: number
}

export abstract class BaseCommand {
  protected fs: FakeFileSystem

  constructor(fs: FakeFileSystem) {
    this.fs = fs
  }

  abstract execute(args: string[]): Promise<CommandResult>

  protected getCurrentPath(): string {
    return this.fs.getCurrentPath()
  }

  protected getAbsolutePath(path: string): string {
    return this.fs.getAbsolutePath(path)
  }

  protected pathExists(path: string): boolean {
    return this.fs.pathExists(path)
  }

  protected isDirectory(path: string): boolean {
    return this.fs.isDirectory(path)
  }

  protected isFile(path: string): boolean {
    return this.fs.isFile(path)
  }

  protected readFile(path: string): string | null {
    return this.fs.readFile(path)
  }

  protected writeFile(path: string, content: string): boolean {
    return this.fs.writeFile(path, content)
  }

  protected createDirectory(path: string): boolean {
    return this.fs.createDirectory(path)
  }

  protected listDirectory(path: string) {
    return this.fs.listDirectory(path)
  }

  protected deleteNode(path: string): boolean {
    return this.fs.deleteNode(path)
  }

  protected error(message: string): CommandResult {
    return {
      output: `${this.constructor.name.toLowerCase()}: ${message}\n`,
      exitCode: 1
    }
  }

  protected success(output: string): CommandResult {
    return {
      output,
      exitCode: 0
    }
  }

  protected formatFileSize(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let unitIndex = 0
    let fileSize = size

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024
      unitIndex++
    }

    return `${fileSize.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}


