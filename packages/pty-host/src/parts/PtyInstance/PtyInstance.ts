import { DataEvent } from '../DataEvent/DataEvent.ts'
import { ExitEvent } from '../ExitEvent/ExitEvent.ts'

export class PtyInstance extends EventTarget {
  pty: any

  /**
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

  pause() {
    this.pty.pause()
  }

  resume() {
    this.pty.resume()
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
