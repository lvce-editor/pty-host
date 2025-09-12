// AnsiCodes - JavaScript version
export class AnsiCodes {
  // Reset codes
  static RESET = '\x1b[0m'
  static BOLD = '\x1b[1m'
  static DIM = '\x1b[2m'
  static ITALIC = '\x1b[3m'
  static UNDERLINE = '\x1b[4m'
  static BLINK = '\x1b[5m'
  static REVERSE = '\x1b[7m'
  static STRIKETHROUGH = '\x1b[9m'

  // Foreground colors
  static FG_BLACK = '\x1b[30m'
  static FG_RED = '\x1b[31m'
  static FG_GREEN = '\x1b[32m'
  static FG_YELLOW = '\x1b[33m'
  static FG_BLUE = '\x1b[34m'
  static FG_MAGENTA = '\x1b[35m'
  static FG_CYAN = '\x1b[36m'
  static FG_WHITE = '\x1b[37m'
  static FG_DEFAULT = '\x1b[39m'

  // Background colors
  static BG_BLACK = '\x1b[40m'
  static BG_RED = '\x1b[41m'
  static BG_GREEN = '\x1b[42m'
  static BG_YELLOW = '\x1b[43m'
  static BG_BLUE = '\x1b[44m'
  static BG_MAGENTA = '\x1b[45m'
  static BG_CYAN = '\x1b[46m'
  static BG_WHITE = '\x1b[47m'
  static BG_DEFAULT = '\x1b[49m'

  // Bright colors
  static FG_BRIGHT_BLACK = '\x1b[90m'
  static FG_BRIGHT_RED = '\x1b[91m'
  static FG_BRIGHT_GREEN = '\x1b[92m'
  static FG_BRIGHT_YELLOW = '\x1b[93m'
  static FG_BRIGHT_BLUE = '\x1b[94m'
  static FG_BRIGHT_MAGENTA = '\x1b[95m'
  static FG_BRIGHT_CYAN = '\x1b[96m'
  static FG_BRIGHT_WHITE = '\x1b[97m'

  static BG_BRIGHT_BLACK = '\x1b[100m'
  static BG_BRIGHT_RED = '\x1b[101m'
  static BG_BRIGHT_GREEN = '\x1b[102m'
  static BG_BRIGHT_YELLOW = '\x1b[103m'
  static BG_BRIGHT_BLUE = '\x1b[104m'
  static BG_BRIGHT_MAGENTA = '\x1b[105m'
  static BG_BRIGHT_CYAN = '\x1b[106m'
  static BG_BRIGHT_WHITE = '\x1b[107m'

  // Cursor movement
  static cursorUp(n = 1) {
    return `\x1b[${n}A`
  }

  static cursorDown(n = 1) {
    return `\x1b[${n}B`
  }

  static cursorRight(n = 1) {
    return `\x1b[${n}C`
  }

  static cursorLeft(n = 1) {
    return `\x1b[${n}D`
  }

  static cursorTo(row, col) {
    return `\x1b[${row};${col}H`
  }

  static cursorToColumn(col) {
    return `\x1b[${col}G`
  }

  static cursorSave() {
    return '\x1b[s'
  }

  static cursorRestore() {
    return '\x1b[u'
  }

  // Screen control
  static clearScreen() {
    return '\x1b[2J'
  }

  static clearLine() {
    return '\x1b[2K'
  }

  static clearLineToEnd() {
    return '\x1b[0K'
  }

  static clearLineToStart() {
    return '\x1b[1K'
  }

  // Color helpers
  static colorize(text, fg, bg) {
    let result = text
    if (fg) result = fg + result
    if (bg) result = bg + result
    if (fg || bg) result = result + this.RESET
    return result
  }

  static red(text) {
    return this.colorize(text, this.FG_RED)
  }

  static green(text) {
    return this.colorize(text, this.FG_GREEN)
  }

  static yellow(text) {
    return this.colorize(text, this.FG_YELLOW)
  }

  static blue(text) {
    return this.colorize(text, this.FG_BLUE)
  }

  static magenta(text) {
    return this.colorize(text, this.FG_MAGENTA)
  }

  static cyan(text) {
    return this.colorize(text, this.FG_CYAN)
  }

  static white(text) {
    return this.colorize(text, this.FG_WHITE)
  }

  static brightRed(text) {
    return this.colorize(text, this.FG_BRIGHT_RED)
  }

  static brightGreen(text) {
    return this.colorize(text, this.FG_BRIGHT_GREEN)
  }

  static brightYellow(text) {
    return this.colorize(text, this.FG_BRIGHT_YELLOW)
  }

  static brightBlue(text) {
    return this.colorize(text, this.FG_BRIGHT_BLUE)
  }

  static brightMagenta(text) {
    return this.colorize(text, this.FG_BRIGHT_MAGENTA)
  }

  static brightCyan(text) {
    return this.colorize(text, this.FG_BRIGHT_CYAN)
  }

  static brightWhite(text) {
    return this.colorize(text, this.FG_BRIGHT_WHITE)
  }

  // File type colors (like ls --color)
  static getFileTypeColor(name, isDirectory, permissions) {
    if (isDirectory) {
      return this.blue(name)
    }

    if (permissions.includes('x')) {
      return this.green(name) // Executable
    }

    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'txt':
      case 'md':
      case 'log':
        return this.white(name)
      case 'js':
      case 'ts':
      case 'json':
        return this.yellow(name)
      case 'html':
      case 'css':
        return this.magenta(name)
      case 'py':
      case 'sh':
      case 'bash':
        return this.green(name)
      case 'zip':
      case 'tar':
      case 'gz':
        return this.red(name)
      default:
        return this.white(name)
    }
  }
}

