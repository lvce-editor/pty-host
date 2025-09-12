import { BaseCommand, CommandResult } from './BaseCommand.js'

export class CdCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    const targetPath = args.length > 0 ? args[0] : '/home/user'
    const absolutePath = this.getAbsolutePath(targetPath)

    if (!this.pathExists(absolutePath)) {
      return this.error(`cd: ${targetPath}: No such file or directory`)
    }

    if (!this.isDirectory(absolutePath)) {
      return this.error(`cd: ${targetPath}: Not a directory`)
    }

    const success = this.fs.setCurrentPath(absolutePath)
    if (!success) {
      return this.error(`cd: ${targetPath}: Permission denied`)
    }

    return this.success('')
  }
}


