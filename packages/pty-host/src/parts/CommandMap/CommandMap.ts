import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as HandleNodeMessagePort from '../HandleNodeMessagePort/HandleNodeMessagePort.ts'
import * as HandleWebSocket from '../HandleWebSocket/HandleWebSocket.ts'
import * as PtyController from '../PtyController/PtyController.ts'
import * as TerminalProcessCommandType from '../TerminalProcessCommandType/TerminalProcessCommandType.ts'

export const commandMap = {
  [TerminalProcessCommandType.HandleElectronMessagePort]:
    HandleElectronMessagePort.handleElectronMessagePort,
  [TerminalProcessCommandType.HandleNodeMessagePort]:
    HandleNodeMessagePort.handleNodeMessagePort,
  [TerminalProcessCommandType.HandleWebSocket]: HandleWebSocket.handleWebSocket,
  [TerminalProcessCommandType.TerminalCreate]: PtyController.create,
  [TerminalProcessCommandType.TerminalResize]: PtyController.resize,
  [TerminalProcessCommandType.TerminalWrite]: PtyController.write,
  [TerminalProcessCommandType.TerminalDispose]: PtyController.dispose,
}
