import { BaseCommand, CommandResult } from './BaseCommand.js'
import { AnsiCodes } from '../AnsiCodes.js'

export class GrepCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return this.error('missing pattern')
    }

    const options = this.parseOptions(args)
    const pattern = args[options.patternIndex]
    const files = args.slice(options.patternIndex + 1)

    if (files.length === 0) {
      return this.error('missing file operand')
    }

    const results: string[] = []
    let hasError = false
    let hasMatch = false

    for (const filePath of files) {
      const absolutePath = this.getAbsolutePath(filePath)

      if (!this.pathExists(absolutePath)) {
        results.push(`grep: ${filePath}: No such file or directory\n`)
        hasError = true
        continue
      }

      if (this.isDirectory(absolutePath)) {
        results.push(`grep: ${filePath}: Is a directory\n`)
        hasError = true
        continue
      }

      const content = this.readFile(absolutePath)
      if (content === null) {
        results.push(`grep: ${filePath}: Permission denied\n`)
        hasError = true
        continue
      }

      const lines = content.split('\n')
      let fileHasMatch = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNumber = i + 1

        if (this.matchesPattern(line, pattern, options.ignoreCase)) {
          fileHasMatch = true
          hasMatch = true

          let output = ''
          if (options.showLineNumbers) {
            output += `${lineNumber}:`
          }

          if (files.length > 1) {
            output += `${filePath}:`
          }

          if (options.highlight) {
            output += this.highlightMatch(line, pattern, options.ignoreCase)
          } else {
            output += line
          }

          results.push(output + '\n')
        }
      }

      if (!fileHasMatch && options.showOnlyFiles) {
        // -L option: show files that don't match
        results.push(`${filePath}\n`)
      }
    }

    return {
      output: results.join(''),
      exitCode: hasError ? 1 : (hasMatch ? 0 : 1)
    }
  }

  private parseOptions(args: string[]): {
    ignoreCase: boolean
    showLineNumbers: boolean
    highlight: boolean
    showOnlyFiles: boolean
    patternIndex: number
  } {
    let ignoreCase = false
    let showLineNumbers = false
    let highlight = true
    let showOnlyFiles = false
    let patternIndex = 0

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg.startsWith('-')) {
        if (arg.includes('i')) ignoreCase = true
        if (arg.includes('n')) showLineNumbers = true
        if (arg.includes('L')) showOnlyFiles = true
        if (arg.includes('--no-color')) highlight = false
      } else {
        patternIndex = i
        break
      }
    }

    return { ignoreCase, showLineNumbers, highlight, showOnlyFiles, patternIndex }
  }

  private matchesPattern(line: string, pattern: string, ignoreCase: boolean): boolean {
    const searchText = ignoreCase ? line.toLowerCase() : line
    const searchPattern = ignoreCase ? pattern.toLowerCase() : pattern

    // Simple pattern matching (could be enhanced with regex support)
    return searchText.includes(searchPattern)
  }

  private highlightMatch(line: string, pattern: string, ignoreCase: boolean): string {
    const searchText = ignoreCase ? line.toLowerCase() : line
    const searchPattern = ignoreCase ? pattern.toLowerCase() : pattern

    const index = searchText.indexOf(searchPattern)
    if (index === -1) {
      return line
    }

    const before = line.substring(0, index)
    const match = line.substring(index, index + pattern.length)
    const after = line.substring(index + pattern.length)

    return before + AnsiCodes.brightRed(match) + after
  }
}


