import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function createMockShellPath(): string {
  return join(__dirname, 'mock-shell.js')
}
