import {
  ElectronMessagePortRpcClient,
  ElectronUtilityProcessRpcClient,
  NodeForkedProcessRpcClient,
  NodeWebSocketRpcClient,
} from '@lvce-editor/rpc'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const getModule = (method) => {
  switch (method) {
    case IpcChildType.NodeForkedProcess:
      return NodeForkedProcessRpcClient
    case IpcChildType.WebSocket:
      return NodeWebSocketRpcClient
    case IpcChildType.ElectronUtilityProcess:
      return ElectronUtilityProcessRpcClient
    case IpcChildType.ElectronMessagePort:
      return ElectronMessagePortRpcClient
    default:
      throw new Error('unexpected ipc type')
  }
}
