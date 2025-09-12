import { BaseCommand, CommandResult } from './BaseCommand.js'
import { AnsiCodes } from '../AnsiCodes.js'

export class LsCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    const options = this.parseOptions(args)
    const paths = args.filter(arg => !arg.startsWith('-'))

    if (paths.length === 0) {
      paths.push('.')
    }

    const results: string[] = []
    let hasError = false

    for (const path of paths) {
      const absolutePath = this.getAbsolutePath(path)

      if (!this.pathExists(absolutePath)) {
        results.push(`ls: cannot access '${path}': No such file or directory\n`)
        hasError = true
        continue
      }

      if (this.isFile(absolutePath)) {
        // Single file
        const node = this.fs.listDirectory(this.getAbsolutePath(path.substring(0, path.lastIndexOf('/')) || '.'))
        const fileName = path.substring(path.lastIndexOf('/') + 1)
        const fileNode = node?.find(item => item.name === fileName)?.node

        if (fileNode) {
          if (options.long) {
            results.push(this.formatLongEntry(fileNode, fileName))
          } else {
            results.push(AnsiCodes.getFileTypeColor(fileName, fileNode.type === 'directory', fileNode.permissions) + '\n')
          }
        }
        continue
      }

      const entries = this.listDirectory(absolutePath)
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
          results.push(this.formatLongEntry(entry.node, entry.name))
        }
      } else {
        // Short format
        const coloredEntries = entries.map(entry =>
          AnsiCodes.getFileTypeColor(entry.name, entry.node.type === 'directory', entry.node.permissions)
        )

        if (options.all) {
          coloredEntries.unshift(AnsiCodes.blue('.'))
          coloredEntries.unshift(AnsiCodes.blue('..'))
        }

        // Sort entries
        coloredEntries.sort((a, b) => {
          const aName = a.replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes for sorting
          const bName = b.replace(/\x1b\[[0-9;]*m/g, '')
          return aName.localeCompare(bName)
        })

        // Format in columns
        const maxWidth = 80
        const entriesPerLine = Math.floor(maxWidth / 20)
        for (let i = 0; i < coloredEntries.length; i += entriesPerLine) {
          const line = coloredEntries.slice(i, i + entriesPerLine).join('  ')
          results.push(line + '\n')
        }
      }
    }

    return {
      output: results.join(''),
      exitCode: hasError ? 1 : 0
    }
  }

  private parseOptions(args: string[]): { long: boolean; all: boolean } {
    const long = args.includes('-l') || args.includes('--long')
    const all = args.includes('-a') || args.includes('--all')
    return { long, all }
  }

  private formatLongEntry(node: any, name: string): string {
    const permissions = node.permissions
    const owner = node.owner
    const group = node.group
    const size = this.formatFileSize(node.size)
    const date = this.formatDate(node.modified)
    const coloredName = AnsiCodes.getFileTypeColor(name, node.type === 'directory', permissions)

    return `${permissions} ${owner.padEnd(8)} ${group.padEnd(8)} ${size.padStart(8)} ${date} ${coloredName}\n`
  }
}


