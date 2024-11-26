import * as Command from '../Command/Command.js'
import * as CommandMap from '../CommandMap/CommandMap.js'
import * as Listen from '../Listen/Listen.js'
import * as ProcessListeners from '../ProcessListeners/ProcessListeners.js'

export const main = async () => {
  process.on(
    'uncaughtExceptionMonitor',
    ProcessListeners.handleUncaughtExceptionMonitor,
  )
  process.on('disconnect', ProcessListeners.handleDisconnect)
  Command.register(CommandMap.commandMap)
  await Listen.listen()
}
