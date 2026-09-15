import { ElectronMessagePortRpcClient } from '@lvce-editor/rpc'
import * as Assert from '../Assert/Assert.ts'
import * as ConnectionLifecycle from '../ConnectionLifecycle/ConnectionLifecycle.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const handleMessagePortWithDependencies = async (
  messagePort,
  sourceRpcId: number | undefined,
  connectionId: number | undefined,
  createRpc,
): Promise<void> => {
  Assert.object(messagePort)
  const create = () =>
    createRpc({
      commandMap: {},
      messagePort,
      requiresSocket: RequiresSocket.requiresSocket,
    })
  if (sourceRpcId !== undefined) {
    // The control port is owned by shared-process, not by a terminal window.
    ConnectionLifecycle.setParent(await create())
    return
  }
  await ConnectionLifecycle.connect(messagePort, connectionId, create)
}

export const handleTerminalMessagePort = (
  messagePort,
  connectionId?: number,
): Promise<void> => {
  return handleMessagePortWithDependencies(
    messagePort,
    undefined,
    connectionId,
    ElectronMessagePortRpcClient.create,
  )
}

export const handleElectronMessagePort = (
  messagePort,
  sourceRpcId?: number,
): Promise<void> => {
  return handleMessagePortWithDependencies(
    messagePort,
    sourceRpcId,
    undefined,
    ElectronMessagePortRpcClient.create,
  )
}
