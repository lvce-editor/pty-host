import * as Character from '../Character/Character.ts'
import * as ExitCode from '../ExitCode/ExitCode.ts'
import * as GetNewLineIndex from '../GetNewLineIndex/GetNewLineIndex.ts'
import * as IsIgnoredError from '../IsIgnoredError/IsIgnoredError.ts'
import * as Logger from '../Logger/Logger.ts'
import * as PrettyError from '../PrettyError/PrettyError.ts'
import * as Process from '../Process/Process.ts'

export const state = {
  seenErrors: [],
}

const preparePrettyError = (error) => {
  const cause = error.cause()
  return {
    message: error.message,
    codeFrame: cause.codeFrame,
    stack: cause.stack,
  }
}

const printPrettyError = (prettyError) => {
  console.error(
    `${prettyError.message}\n${prettyError.codeFrame}\n${prettyError.stack}`,
  )
}

export const handleError = (error) => {
  // @ts-ignore
  if (state.seenErrors.includes(error.message)) {
    return
  }
  // @ts-ignore
  state.seenErrors.push(error.message)
  const prettyError = preparePrettyError(error)
  // Socket.send({
  //   jsonrpc: JsonRpcVersion.Two,
  //   method: /* Dialog.showErrorDialogWithOptions */ 'Dialog.showMessage',
  //   params: [
  //     {
  //       message: prettyError.message,
  //       codeFrame: prettyError.codeFrame,
  //       stack: prettyError.stack,
  //     },
  //   ],
  // })
  printPrettyError(prettyError)
}

const firstErrorLine = (error) => {
  if (error.stack) {
    return error.stack.slice(0, GetNewLineIndex.getNewLineIndex(error.stack))
  }
  if (error.message) {
    return error.message
  }
  return `${error}`
}

// @ts-ignore
export const handleUncaughtExceptionMonitor = (error) => {
  Logger.info(`[pty host] uncaught exception: ${firstErrorLine(error)}`)
  if (IsIgnoredError.isIgnoredError(error)) {
    return
  }
  const prettyError = PrettyError.prepare(error)
  Logger.error(
    // @ts-ignore
    prettyError.codeFrame +
      Character.NewLine +
      prettyError.stack +
      Character.NewLine,
  )
  Process.setExitCode(ExitCode.Error)
}
