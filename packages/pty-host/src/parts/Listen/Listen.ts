import * as ConnectionLifecycle from '../ConnectionLifecycle/ConnectionLifecycle.ts'
import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const listen = async () => {
  const method = IpcChildType.Auto()
  const rpc = await IpcChild.listen({
    method,
    requiresSocket: RequiresSocket.requiresSocket,
  })
  if (method !== IpcChildType.ElectronUtilityProcess)
    ConnectionLifecycle.setParent(rpc)
}
