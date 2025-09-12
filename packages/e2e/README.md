# Terminal E2E Testing System

This package provides a comprehensive end-to-end testing system for the pty-host terminal functionality. It includes recording, replay, and visualization capabilities.

## Overview

The system consists of several components:

1. **Terminal Recorder** - Captures terminal output and events during execution
2. **Session Storage** - Stores recorded sessions as JSON files
3. **Terminal Replayer** - Replays recorded sessions for testing
4. **Visual Test Runner** - Provides a web interface to view and test scenarios
5. **E2E Tests** - Automated tests that record real terminal interactions

## Features

- **Cross-platform recording** - Works on Linux, macOS, and Windows
- **ANSI code capture** - Records all terminal output including colors and formatting
- **Event tracking** - Captures data, exit, resize, and write events
- **Web visualization** - View terminal scenarios in a browser
- **Replay system** - Replay recorded sessions at different speeds
- **Real terminal testing** - Test actual terminal commands and interactions

## Usage

### Recording Terminal Sessions

#### Simulated Scenarios
```bash
npm run terminal:record
```
This runs simulated terminal scenarios and saves them as JSON files in the `recordings/` directory.

#### Real Terminal Commands
```bash
npm run terminal:record-real
```
This runs actual terminal commands and records their output. This is useful for testing real-world scenarios.

### Viewing and Replaying Sessions

#### List Available Sessions
```bash
npm run terminal:list
```

#### Replay All Sessions
```bash
npm run terminal:all
```

#### Replay Specific Session
```bash
npm run terminal:replay --session=<session-id>
```

#### Web Visualization
```bash
npm run terminal:visualize
```
This opens a web interface where you can:
- Select and load recorded sessions
- Play/pause/stop replays
- Adjust playback speed
- View event logs
- See terminal output in real-time

### Running E2E Tests

The system integrates with the existing e2e test framework:

```bash
npm run e2e
```

## File Structure

```
packages/e2e/
├── src/
│   ├── terminal-scenarios.ts      # Simulated terminal scenarios
│   ├── terminal-e2e-real.ts       # Real terminal command tests
│   ├── terminal-test-runner.ts    # Test runner logic
│   ├── terminal-test-runner-cli.ts # CLI entry point
│   └── terminal-visualizer.html   # Web visualization interface
├── recordings/                    # Recorded session JSON files
└── README.md
```

## Session Data Format

Recorded sessions are stored as JSON files with the following structure:

```json
{
  "id": "session-id",
  "name": "Session Name",
  "description": "Session description",
  "platform": "linux",
  "command": "echo",
  "args": ["Hello World"],
  "cwd": "/path/to/working/directory",
  "events": [
    {
      "type": "data",
      "timestamp": 0,
      "data": "Hello World\r\n"
    },
    {
      "type": "exit",
      "timestamp": 100,
      "data": 0
    }
  ],
  "duration": 100,
  "exitCode": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Event Types

- **data** - Terminal output data (ANSI codes, text, etc.)
- **exit** - Process exit with exit code
- **command** - Command execution with arguments
- **resize** - Terminal resize events
- **write** - User input/write events

## Integration with pty-host

The recording system integrates with the pty-host by:

1. **PtyControllerRecording** - Modified controller that records events
2. **TerminalRecorder** - Singleton that captures all terminal events
3. **Session Storage** - Persists recordings for later use

## Web Environment Support

For web environments where native pty functionality isn't available, the system can:

1. Load recorded session JSON files
2. Replay events using the TerminalReplayer
3. Simulate terminal output without requiring native pty support

## Development

### Adding New Test Scenarios

1. Add a new test function in `terminal-scenarios.ts` or `terminal-e2e-real.ts`
2. Use `terminalRecorder.startSession()` to begin recording
3. Execute your terminal commands
4. Use `terminalRecorder.recordData()`, `terminalRecorder.recordExit()`, etc. to capture events
5. Call `terminalRecorder.endSession()` and save with `sessionStorage.saveSession()`

### Customizing the Visualizer

The web visualizer (`terminal-visualizer.html`) can be customized by:

1. Modifying the CSS styles for different terminal themes
2. Adding new playback controls
3. Implementing different output rendering (e.g., xterm.js integration)
4. Adding session management features

## Troubleshooting

### Common Issues

1. **Permission errors** - Ensure the recordings directory is writable
2. **Command not found** - Make sure the commands you're testing exist on the system
3. **Recording not saving** - Check that the session is properly ended with `endSession()`

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=terminal-recorder npm run terminal:record-real
```

## Future Enhancements

- Integration with xterm.js for better terminal rendering
- Support for multiple concurrent terminal sessions
- Automated screenshot capture during recording
- Integration with CI/CD pipelines
- Performance metrics and analysis
- Custom terminal themes and configurations


