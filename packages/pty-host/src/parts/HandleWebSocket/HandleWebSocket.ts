import { NodeWebSocketRpcClient } from '@lvce-editor/rpc'
import * as Assert from '../Assert/Assert.ts'
import * as ConnectionLifecycle from '../ConnectionLifecycle/ConnectionLifecycle.ts'
import * as PersistentTerminals from '../PersistentTerminals/PersistentTerminals.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const handleWebSocket = async (
  handle,
  request,
  connectionId?: number,
) => {
  Assert.object(handle)
  Assert.object(request)
  await ConnectionLifecycle.connect(handle, connectionId, async () => {
    const rpc: any = await NodeWebSocketRpcClient.create({
      commandMap: {},
      handle,
      request,
      requiresSocket: RequiresSocket.requiresSocket,
    })
    if (request.remoteAuthorityAuthenticated === true)
      PersistentTerminals.authorize(rpc.ipc)
    return rpc
  })
}
