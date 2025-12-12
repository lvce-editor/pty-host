import { BaseCommand, CommandResult } from './BaseCommand.js'

export class CatCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return this.error('missing file operand')
    }

    const results: string[] = []
    let hasError = false

    for (const filePath of args) {
      const absolutePath = this.getAbsolutePath(filePath)

      if (!this.pathExists(absolutePath)) {
        results.push(`cat: ${filePath}: No such file or directory`)
        hasError = true
        continue
      }

      if (this.isDirectory(absolutePath)) {
        results.push(`cat: ${filePath}: Is a directory`)
        hasError = true
        continue
      }

      const content = this.readFile(absolutePath)
      if (content !== null) {
        results.push(content)
      } else {
        results.push(`cat: ${filePath}: Permission denied`)
        hasError = true
      }
    }

    return {
      output: results.join(''),
      exitCode: hasError ? 1 : 0
    }
  }
}


