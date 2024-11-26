import * as Callback from '../Callback/Callback.js'
import * as Command from '../Command/Command.js'
import * as JsonRpc from '../JsonRpc/JsonRpc.js'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.js'

const preparePrettyError = (error) => {
  return error
}

const logError = (error) => {
  // PrintPrettyError.printPrettyError(prettyError, `[terminal-process] `)
}

export const handleMessage = (event) => {
  return JsonRpc.handleJsonRpcMessage(
    event.target,
    event.data,
    Command.execute,
    Callback.resolve,
    preparePrettyError,
    logError,
    RequiresSocket.requiresSocket,
  )
}
