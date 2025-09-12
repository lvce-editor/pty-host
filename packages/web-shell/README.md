# Web Shell

A JavaScript-based terminal emulator with WebWorker-based commands for web environments. Each command runs in a separate WebWorker for isolation, security, and parallelism.

## Features

- **WebWorker-based Commands**: Each command runs in isolation
- **Pure JavaScript**: No compilation or bundling required
- **Modular Architecture**: Commands are separate packages
- **Runtime Installation**: Install new commands dynamically
- **Fake Filesystem**: Complete file system simulation
- **ANSI Support**: Colors and terminal formatting
- **Command History**: Built-in command history
- **Parallel Execution**: Commands can run simultaneously

## Quick Start

### Standalone Demo (No Setup Required)

Open `demo-standalone.html` in your browser - it contains everything in one file!

### Using with Modules

```html
<!DOCTYPE html>
<html>
<head>
    <title>Web Shell Demo</title>
</head>
<body>
    <div id="terminal"></div>
    <script type="module">
        import { WebShellWorker } from './src/WebShellWorker.js'

        const shell = new WebShellWorker()
        // Use the shell...
    </script>
</body>
</html>
```

## Architecture

### Core Components

- **FakeFileSystem**: Simulates a complete file system
- **WebWorkerCommandManager**: Manages command execution
- **WebShellWorker**: Main shell interface
- **AnsiCodes**: Terminal formatting utilities

### Command Structure

Each command is a separate package with:
- `package.json` - Package metadata
- `command.js` - WebWorker implementation

Example command structure:
```
packages/webshell-echo/
├── package.json
└── echo.js
```

## Available Commands

### Built-in Commands

- **echo** - Display text
- **cd** - Change directory
- **ls** - List directory contents
- **cat** - Display file contents
- **pwd** - Print working directory

### Special Commands

- **help** - Show available commands
- **history** - Show command history
- **commands** - List installed commands
- **clear** - Clear screen
- **exit/quit** - Exit shell

## Creating Custom Commands

### 1. Create Command Package

```bash
mkdir packages/webshell-mycommand
cd packages/webshell-mycommand
```

### 2. Create package.json

```json
{
  "name": "webshell-mycommand",
  "version": "1.0.0",
  "description": "My custom command",
  "main": "mycommand.js",
  "type": "module"
}
```

### 3. Implement Command

```javascript
// mycommand.js
class MyCommand {
  constructor() {
    self.onmessage = (event) => {
      const message = event.data

      switch (message.type) {
        case 'execute':
          this.execute(message)
          break
        case 'terminate':
          this.terminate()
          break
        case 'ping':
          this.pong(message.id)
          break
        default:
          this.sendError(message.id, 'Unknown message type')
      }
    }
  }

  execute(message) {
    try {
      const args = message.args || []

      // Your command logic here
      const result = this.processCommand(args)

      // Send output
      this.sendStdout(message.id, result)

      // Send exit code
      this.sendExit(message.id, 0)
    } catch (error) {
      this.sendError(message.id, error.message)
    }
  }

  processCommand(args) {
    return `My command executed with args: ${args.join(' ')}\n`
  }

  sendStdout(id, data) {
    self.postMessage({
      type: 'stdout',
      id: id,
      data: data
    })
  }

  sendStderr(id, data) {
    self.postMessage({
      type: 'stderr',
      id: id,
      data: data
    })
  }

  sendExit(id, exitCode) {
    self.postMessage({
      type: 'exit',
      id: id,
      exitCode: exitCode
    })
  }

  sendError(id, error) {
    self.postMessage({
      type: 'error',
      id: id,
      error: error
    })
  }

  terminate() {
    self.close()
  }

  pong(id) {
    self.postMessage({
      type: 'pong',
      id: id
    })
  }
}

// Initialize the command
new MyCommand()
```

### 4. Install Command

```javascript
const shell = new WebShellWorker()

// Install from URL
await shell.installCommand(
  'mycommand',
  '/path/to/webshell-mycommand/mycommand.js',
  'My custom command',
  '1.0.0'
)

// Or install from code
const commandCode = `/* your command code */`
const blob = new Blob([commandCode], { type: 'application/javascript' })
const url = URL.createObjectURL(blob)
await shell.installCommand('mycommand', url, 'My custom command')
```

## API Reference

### WebShellWorker

```javascript
const shell = new WebShellWorker(options)

// Execute command
const result = await shell.executeCommand('ls -la')

// Install command
await shell.installCommand(name, workerUrl, description, version)

// Get current path
const path = shell.getCurrentPath()

// Get prompt
const prompt = shell.getPrompt()

// Get command history
const history = shell.getHistory()
```

### Command Message Protocol

Commands communicate via messages:

```javascript
// Execute command
{
  type: 'execute',
  id: 'exec_1234567890_abc123',
  args: ['arg1', 'arg2'],
  filesystem: filesystemObject,
  currentPath: '/current/path'
}

// Response types
{
  type: 'stdout',    // Standard output
  id: 'exec_1234567890_abc123',
  data: 'output text'
}

{
  type: 'stderr',    // Error output
  id: 'exec_1234567890_abc123',
  data: 'error text'
}

{
  type: 'exit',      // Command finished
  id: 'exec_1234567890_abc123',
  exitCode: 0
}

{
  type: 'error',     // Command error
  id: 'exec_1234567890_abc123',
  error: 'error message'
}
```

## File System API

Commands can access the fake file system:

```javascript
// Check if path exists
const exists = filesystem.pathExists('/path/to/file')

// Check if directory
const isDir = filesystem.isDirectory('/path/to/dir')

// Check if file
const isFile = filesystem.isFile('/path/to/file')

// Read file
const content = filesystem.readFile('/path/to/file')

// List directory
const entries = filesystem.listDirectory('/path/to/dir')

// Get absolute path
const absPath = filesystem.getAbsolutePath('relative/path')
```

## Examples

### Basic Usage

```javascript
import { WebShellWorker } from './src/WebShellWorker.js'

const shell = new WebShellWorker()

// Execute commands
await shell.executeCommand('ls')
await shell.executeCommand('cd Documents')
await shell.executeCommand('cat readme.txt')
```

### Custom Command Installation

```javascript
const customCommand = `
class GreetCommand {
  constructor() {
    self.onmessage = (event) => {
      if (event.data.type === 'execute') {
        const name = event.data.args[0] || 'World'
        self.postMessage({
          type: 'stdout',
          id: event.data.id,
          data: \`Hello, \${name}!\\n\`
        })
        self.postMessage({
          type: 'exit',
          id: event.data.id,
          exitCode: 0
        })
      }
    }
  }
}
new GreetCommand()
`

const blob = new Blob([customCommand], { type: 'application/javascript' })
const url = URL.createObjectURL(blob)

await shell.installCommand('greet', url, 'Greet someone')
await shell.executeCommand('greet Alice')
```

## Browser Compatibility

- Modern browsers with WebWorker support
- ES6 modules support
- No external dependencies

## Development

### File Structure

```
packages/web-shell/
├── src/
│   ├── FakeFileSystem.js
│   ├── AnsiCodes.js
│   ├── WebWorkerCommand.js
│   ├── WebShellWorker.js
│   └── index.js
├── demo-simple.html
├── demo-standalone.html
└── README.md

packages/webshell-*/
├── package.json
└── command.js
```

### Adding New Commands

1. Create new package directory
2. Implement command as WebWorker
3. Add to command registry
4. Test with demo

## License

MIT