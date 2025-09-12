import * as Assert from '../Assert/Assert.ts'
import * as Pty from '../Pty/Pty.ts'
import * as PtyState from '../PtyState/PtyState.ts'
import { terminalRecorder } from '../TerminalRecorder/TerminalRecorder.ts'

// Recording-enabled version of PtyController
export const create = async (ipc, id, cwd, command, args, recordingSessionId?: string) => {
  Assert.number(id)
  Assert.string(cwd)
  Assert.string(command)
  Assert.array(args)
  Assert.object(ipc)

  // Start recording session if provided
  if (recordingSessionId) {
    terminalRecorder.startSession({
      id: recordingSessionId,
      name: `${command} ${args.join(' ')}`,
      description: `Terminal session for ${command}`,
      command,
      args,
      cwd,
    })
  }

  // Record the command
  terminalRecorder.recordCommand(command, args, id)

  // @ts-ignore
  const pty = await Pty.create({ cwd, command, args })

  const handleData = (event) => {
    // Record the data event
    terminalRecorder.recordData(event.data)

    ipc.send({
      jsonrpc: '2.0',
      method: 'Viewlet.send',
      params: [id, 'handleData', event.data],
    })
  }

  const handleExit = (event) => {
    // Record the exit event
    terminalRecorder.recordExit(event.data)
  }

  pty.addEventListener('data', handleData)
  pty.addEventListener('exit', handleExit)
  PtyState.set(id, pty)
}

export const write = (id, data) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }

  // Record the write event
  terminalRecorder.recordWrite(data)

  pty.write(data)
}

export const resize = (id, columns, rows) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }

  // Record the resize event
  terminalRecorder.recordResize(columns, rows)

  pty.resize(columns, rows)
}

export const dispose = (id) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }

  // End recording session if this was the last pty
  const allPtys = PtyState.getAll()
  if (Object.keys(allPtys).length === 1) {
    terminalRecorder.endSession()
  }

  pty.dispose()
  PtyState.remove(id)
}

export const disposeAll = () => {
  // End recording session
  terminalRecorder.endSession()

  for (const id in PtyState.getAll()) {
    dispose(id)
  }
}


