import * as Assert from '../Assert/Assert.ts'
import * as fs from 'fs'
import * as path from 'path'
import type { TerminalSession } from '../TerminalRecorder/TerminalRecorder.ts'

export interface SessionStorageConfig {
  recordingsDir: string
}

class TerminalSessionStorage {
  private recordingsDir: string

  constructor(config: SessionStorageConfig) {
    Assert.string(config.recordingsDir)
    this.recordingsDir = config.recordingsDir
    this.ensureRecordingsDir()
  }

  private ensureRecordingsDir(): void {
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true })
    }
  }

  async saveSession(session: TerminalSession): Promise<string> {
    Assert.object(session)

    const filename = `${session.id}.json`
    const filepath = path.join(this.recordingsDir, filename)

    const sessionData = {
      ...session,
      // Add metadata for easier browsing
      metadata: {
        platform: session.platform,
        command: session.command,
        args: session.args,
        duration: session.duration,
        eventCount: session.events.length,
        exitCode: session.exitCode,
        createdAt: session.createdAt,
      }
    }

    await fs.promises.writeFile(filepath, JSON.stringify(sessionData, null, 2))
    return filepath
  }

  async loadSession(sessionId: string): Promise<TerminalSession | null> {
    Assert.string(sessionId)

    const filename = `${sessionId}.json`
    const filepath = path.join(this.recordingsDir, filename)

    try {
      const data = await fs.promises.readFile(filepath, 'utf-8')
      const sessionData = JSON.parse(data)
      // Remove metadata when loading
      const { metadata, ...session } = sessionData
      return session as TerminalSession
    } catch (error) {
      return null
    }
  }

  async listSessions(): Promise<Array<{ id: string; metadata: any }>> {
    try {
      const files = await fs.promises.readdir(this.recordingsDir)
      const sessions = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.recordingsDir, file)
          try {
            const data = await fs.promises.readFile(filepath, 'utf-8')
            const sessionData = JSON.parse(data)
            sessions.push({
              id: sessionData.id,
              metadata: sessionData.metadata,
            })
          } catch (error) {
            // Skip corrupted files
            continue
          }
        }
      }

      return sessions.sort((a, b) =>
        new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
      )
    } catch (error) {
      return []
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    Assert.string(sessionId)

    const filename = `${sessionId}.json`
    const filepath = path.join(this.recordingsDir, filename)

    try {
      await fs.promises.unlink(filepath)
      return true
    } catch (error) {
      return false
    }
  }

  getRecordingsDir(): string {
    return this.recordingsDir
  }
}

export const createSessionStorage = (config: SessionStorageConfig): TerminalSessionStorage => {
  return new TerminalSessionStorage(config)
}


