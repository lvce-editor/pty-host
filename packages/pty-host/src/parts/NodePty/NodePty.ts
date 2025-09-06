import * as Assert from '../Assert/Assert.ts'
import { DataEvent } from '../DataEvent/DataEvent.ts'
import { ExitEvent } from '../ExitEvent/ExitEvent.ts'
import { VError } from '../VError/VError.ts'

class Pty extends EventTarget {
  pty: any
  /**
   *
   * @param {import('node-pty').IPty} pty
   */
  constructor(pty) {
    super()
    this.pty = pty

    const handleData = (data) => {
      this.dispatchEvent(new DataEvent(data))
    }
    const handleExit = (data) => {
      this.dispatchEvent(new ExitEvent(data))
    }
    this.pty.onData(handleData)
    this.pty.onExit(handleExit)
  }

  resize(columns, rows) {
    this.pty.resize(columns, rows)
  }

  dispose() {
    this.pty.kill()
  }

  write(data) {
    this.pty.write(data)
  }
}

/**
 *
 * @param {*} param0
 * @returns {Promise<any>}
 */
export const create = async ({ cwd, command, args }: any = {}) => {
  try {
    Assert.string(cwd)
    Assert.string(command)
    Assert.array(args)
    const { spawn } = await import('node-pty')

    const pty = spawn(command, args, {
      encoding: null,
      cwd,
      // cols: 10,
      // rows: 10,
    })
    const wrapped = new Pty(pty)
    return wrapped
  } catch (error) {
    throw new VError(error, `Failed to create terminal`)
  }
}
