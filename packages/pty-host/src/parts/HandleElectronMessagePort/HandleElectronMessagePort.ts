import { ElectronMessagePortRpcClient } from '@lvce-editor/rpc'
import * as Assert from '../Assert/Assert.ts'
import * as ConnectionLifecycle from '../ConnectionLifecycle/ConnectionLifecycle.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const handleElectronMessagePort = async (
  messagePort,
  connectionId?: number,
) => {
  Assert.object(messagePort)
  await ConnectionLifecycle.connect(messagePort, connectionId, () =>
    ElectronMessagePortRpcClient.create({
      commandMap: {},
      messagePort,
      requiresSocket: RequiresSocket.requiresSocket,
    }),
  )
}
