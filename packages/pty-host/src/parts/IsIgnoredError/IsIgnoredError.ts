import * as ErrorCodes from '../ErrorCodes/ErrorCodes.ts'
import * as Process from '../Process/Process.ts'

export const isIgnoredError = (error) => {
  if (error && error.code === ErrorCodes.EPIPE && !process.connected) {
    // parent process is disposed, ignore
    return true
  }
  if (
    error &&
    error.code === ErrorCodes.ERR_IPC_CHANNEL_CLOSED &&
    !Process.isConnected()
  ) {
    // parent process is disposed, ignore
    return true
  }
  return false
}
