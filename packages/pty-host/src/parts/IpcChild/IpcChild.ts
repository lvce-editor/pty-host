import * as IpcChildModule from '../IpcChildModule/IpcChildModule.ts'

export const listen = async ({ method, ...params }) => {
  const module = IpcChildModule.getModule(method)
  // @ts-ignore
  const rpc = await module.create(params)
  if (params.requiresSocket) {
    ;(rpc as any).ipc.requiresSocket = params.requiresSocket
  }
  return rpc
}
