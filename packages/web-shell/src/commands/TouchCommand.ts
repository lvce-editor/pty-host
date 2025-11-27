import { BaseCommand, CommandResult } from './BaseCommand.js'

export class TouchCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return this.error('missing file operand')
    }

    const results: string[] = []
    let hasError = false

    for (const filePath of args) {
      const absolutePath = this.getAbsolutePath(filePath)

      if (this.pathExists(absolutePath)) {
        // Update modification time (simulated by updating the file)
        const content = this.readFile(absolutePath) || ''
        const success = this.writeFile(absolutePath, content)
        if (!success) {
          results.push(`touch: ${filePath}: Permission denied\n`)
          hasError = true
        }
      } else {
        // Create new file
        const success = this.createFile(absolutePath, '')
        if (!success) {
          results.push(`touch: ${filePath}: Permission denied\n`)
          hasError = true
        }
      }
    }

    return {
      output: results.join(''),
      exitCode: hasError ? 1 : 0
    }
  }

  private createFile(path: string, content: string = ''): boolean {
    return this.fs.createFile(path, content)
  }
}


