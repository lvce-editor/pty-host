import { NodeWebSocketRpcClient } from '@lvce-editor/rpc'
import * as Assert from '../Assert/Assert.ts'
import * as ConnectionLifecycle from '../ConnectionLifecycle/ConnectionLifecycle.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const handleWebSocket = async (
  handle,
  request,
  connectionId?: number,
) => {
  Assert.object(handle)
  Assert.object(request)
  await ConnectionLifecycle.connect(handle, connectionId, () =>
    NodeWebSocketRpcClient.create({
      commandMap: {},
      handle,
      request,
      requiresSocket: RequiresSocket.requiresSocket,
    }),
  )
}
