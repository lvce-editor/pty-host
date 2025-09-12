import { BaseCommand, CommandResult } from './BaseCommand.js'

export class PwdCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    return this.success(this.getCurrentPath() + '\n')
  }
}


