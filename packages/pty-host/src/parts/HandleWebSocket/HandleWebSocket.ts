import * as Assert from '../Assert/Assert.ts'
import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const handleWebSocket = async (handle, request) => {
  Assert.object(handle)
  Assert.object(request)
  await IpcChild.listen({
    method: IpcChildType.WebSocket,
    request,
    handle,
  })
}
