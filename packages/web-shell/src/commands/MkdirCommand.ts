import { BaseCommand, CommandResult } from './BaseCommand.js'

export class MkdirCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return this.error('missing operand')
    }

    const results: string[] = []
    let hasError = false

    for (const dirPath of args) {
      const absolutePath = this.getAbsolutePath(dirPath)

      if (this.pathExists(absolutePath)) {
        results.push(`mkdir: cannot create directory '${dirPath}': File exists\n`)
        hasError = true
        continue
      }

      const success = this.createDirectory(absolutePath)
      if (!success) {
        results.push(`mkdir: cannot create directory '${dirPath}': Permission denied\n`)
        hasError = true
      }
    }

    return {
      output: results.join(''),
      exitCode: hasError ? 1 : 0
    }
  }
}


