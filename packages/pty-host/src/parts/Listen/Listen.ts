import * as ConnectionLifecycle from '../ConnectionLifecycle/ConnectionLifecycle.ts'
import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const listen = async () => {
  const rpc = await IpcChild.listen({ method: IpcChildType.Auto() })
  ConnectionLifecycle.setParent(rpc)
}
