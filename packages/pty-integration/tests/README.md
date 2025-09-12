# E2E Testing for PTY Host

This directory contains comprehensive end-to-end tests for the PTY Host package. The tests are designed to work consistently across all platforms (Windows, macOS, Linux) by using a custom mock shell instead of relying on system shells.

## Approach

### Mock Shell Strategy

Instead of using real shells (bash, cmd, PowerShell) which have different configurations and outputs across users and platforms, we use a **custom mock shell** (`mock-shell.js`) that provides:

- **Consistent behavior** across all platforms
- **Predictable output** regardless of user configuration
- **Controlled testing environment** with known commands
- **Fast execution** without heavy shell initialization

### Test Structure

```
test/e2e/
├── README.md                    # This documentation
├── PtyE2ETest.ts               # Core e2e test framework
├── basic-functionality.test.ts  # Basic shell functionality tests
├── pty-integration.test.ts      # PTY-specific integration tests
├── cross-platform.test.ts      # Cross-platform compatibility tests
└── run-e2e-tests.ts            # Test runner script
```

## Mock Shell Features

The mock shell (`../mock-shell.js`) supports:

- **Basic commands**: `pwd`, `ls`, `cd`, `echo`, `help`
- **Test commands**: `test-command`, `error-command`
- **Exit handling**: `exit` command
- **Error simulation**: Commands that write to stderr
- **Interactive mode**: Prompts and command processing
- **Non-interactive mode**: Execute single command and exit

## Running Tests

### All E2E Tests
```bash
npm run test:e2e
```

### Watch Mode
```bash
npm run test:e2e:watch
```

### All Tests (Unit + E2E)
```bash
npm run test:all
```

### Individual Test Files
```bash
npm run test:e2e -- --testPathPattern=basic-functionality
```

## Test Categories

### 1. Basic Functionality Tests
- Shell startup and prompt display
- Command execution (`echo`, `pwd`, `ls`, `cd`)
- Error handling (unknown commands)
- Exit functionality
- Multiple command sequences

### 2. PTY Integration Tests
- PTY creation and lifecycle
- Data writing and reading
- PTY resize functionality
- PTY disposal and cleanup
- Rapid input/output handling
- Custom command execution

### 3. Cross-Platform Tests
- Platform-specific path handling
- Line ending compatibility
- Terminal size variations
- Character encoding support
- Special character handling

## Writing New E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@jest/globals'
import { createE2ETest } from './PtyE2ETest.js'

test('should execute command and get output', async () => {
  const e2eTest = createE2ETest({
    input: ['echo hello world'],
    expectedOutput: ['hello world']
  })

  await e2eTest.runTest()
})
```

### Advanced Test Structure

```typescript
test('should handle complex interaction', async () => {
  const e2eTest = createE2ETest({
    input: [
      'echo first command',
      'cd ..',
      'pwd',
      'exit'
    ],
    expectedOutput: [
      'first command',
      process.cwd().split('/').slice(0, -1).join('/')
    ]
  })

  await e2eTest.runTest()

  expect(e2eTest.getExitCode()).toBe(0)
})
```

### Manual PTY Control

```typescript
test('should handle manual PTY control', async () => {
  const e2eTest = createE2ETest({
    expectedOutput: ['testuser $']
  })

  await e2eTest.start()

  // Manual operations
  await e2eTest.write('echo manual test\n')
  await e2eTest.waitForOutput('manual test')

  // Cleanup
  e2eTest.dispose()
})
```

## Configuration Options

The `PtyE2ETest` class accepts these options:

```typescript
interface PtyE2ETestOptions {
  command: string           // Command to execute (default: node)
  args: string[]           // Command arguments (default: [mock-shell.js])
  cwd?: string            // Working directory
  timeout?: number         // Test timeout (default: 10000ms)
  expectedOutput?: string[] // Expected output patterns
  expectedError?: string[] // Expected error patterns
  input?: string[]         // Input commands to send
}
```

## Benefits of This Approach

1. **Consistency**: Same behavior across all platforms
2. **Reliability**: No dependency on user shell configuration
3. **Speed**: Fast execution without heavy shell initialization
4. **Control**: Predictable commands and outputs
5. **Maintainability**: Easy to add new test scenarios
6. **CI/CD Friendly**: Works reliably in automated environments

## Troubleshooting

### Common Issues

1. **PTY not ready**: Increase timeout or check command arguments
2. **Output not found**: Verify expected output patterns match actual output
3. **Process not exiting**: Ensure proper cleanup with `dispose()`
4. **Resize errors**: Check if PTY is still active before resizing

### Debug Tips

- Use `console.log(e2eTest.getOutput())` to see actual output
- Check `e2eTest.hasExited()` before operations
- Increase timeouts for slow operations
- Use `e2eTest.isReady()` to verify PTY is ready

## Integration with CI

The e2e tests are designed to work in CI environments:

- No external dependencies on system shells
- Consistent behavior across different OS
- Proper cleanup and resource management
- Configurable timeouts for different environments

Add to your CI pipeline:
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
```
