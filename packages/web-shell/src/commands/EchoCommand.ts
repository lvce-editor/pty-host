import { BaseCommand, CommandResult } from './BaseCommand.js'

export class EchoCommand extends BaseCommand {
  async execute(args: string[]): Promise<CommandResult> {
    const text = args.join(' ')
    return this.success(text + '\n')
  }
}


