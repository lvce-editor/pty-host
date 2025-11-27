export class AnsiCodes {
  // Reset codes
  static readonly RESET = '\x1b[0m'
  static readonly BOLD = '\x1b[1m'
  static readonly DIM = '\x1b[2m'
  static readonly ITALIC = '\x1b[3m'
  static readonly UNDERLINE = '\x1b[4m'
  static readonly BLINK = '\x1b[5m'
  static readonly REVERSE = '\x1b[7m'
  static readonly STRIKETHROUGH = '\x1b[9m'

  // Foreground colors
  static readonly FG_BLACK = '\x1b[30m'
  static readonly FG_RED = '\x1b[31m'
  static readonly FG_GREEN = '\x1b[32m'
  static readonly FG_YELLOW = '\x1b[33m'
  static readonly FG_BLUE = '\x1b[34m'
  static readonly FG_MAGENTA = '\x1b[35m'
  static readonly FG_CYAN = '\x1b[36m'
  static readonly FG_WHITE = '\x1b[37m'
  static readonly FG_DEFAULT = '\x1b[39m'

  // Background colors
  static readonly BG_BLACK = '\x1b[40m'
  static readonly BG_RED = '\x1b[41m'
  static readonly BG_GREEN = '\x1b[42m'
  static readonly BG_YELLOW = '\x1b[43m'
  static readonly BG_BLUE = '\x1b[44m'
  static readonly BG_MAGENTA = '\x1b[45m'
  static readonly BG_CYAN = '\x1b[46m'
  static readonly BG_WHITE = '\x1b[47m'
  static readonly BG_DEFAULT = '\x1b[49m'

  // Bright colors
  static readonly FG_BRIGHT_BLACK = '\x1b[90m'
  static readonly FG_BRIGHT_RED = '\x1b[91m'
  static readonly FG_BRIGHT_GREEN = '\x1b[92m'
  static readonly FG_BRIGHT_YELLOW = '\x1b[93m'
  static readonly FG_BRIGHT_BLUE = '\x1b[94m'
  static readonly FG_BRIGHT_MAGENTA = '\x1b[95m'
  static readonly FG_BRIGHT_CYAN = '\x1b[96m'
  static readonly FG_BRIGHT_WHITE = '\x1b[97m'

  static readonly BG_BRIGHT_BLACK = '\x1b[100m'
  static readonly BG_BRIGHT_RED = '\x1b[101m'
  static readonly BG_BRIGHT_GREEN = '\x1b[102m'
  static readonly BG_BRIGHT_YELLOW = '\x1b[103m'
  static readonly BG_BRIGHT_BLUE = '\x1b[104m'
  static readonly BG_BRIGHT_MAGENTA = '\x1b[105m'
  static readonly BG_BRIGHT_CYAN = '\x1b[106m'
  static readonly BG_BRIGHT_WHITE = '\x1b[107m'

  // Cursor movement
  static cursorUp(n: number = 1): string {
    return `\x1b[${n}A`
  }

  static cursorDown(n: number = 1): string {
    return `\x1b[${n}B`
  }

  static cursorRight(n: number = 1): string {
    return `\x1b[${n}C`
  }

  static cursorLeft(n: number = 1): string {
    return `\x1b[${n}D`
  }

  static cursorTo(row: number, col: number): string {
    return `\x1b[${row};${col}H`
  }

  static cursorToColumn(col: number): string {
    return `\x1b[${col}G`
  }

  static cursorSave(): string {
    return '\x1b[s'
  }

  static cursorRestore(): string {
    return '\x1b[u'
  }

  // Screen control
  static clearScreen(): string {
    return '\x1b[2J'
  }

  static clearLine(): string {
    return '\x1b[2K'
  }

  static clearLineToEnd(): string {
    return '\x1b[0K'
  }

  static clearLineToStart(): string {
    return '\x1b[1K'
  }

  // Color helpers
  static colorize(text: string, fg?: string, bg?: string): string {
    let result = text
    if (fg) result = fg + result
    if (bg) result = bg + result
    if (fg || bg) result = result + this.RESET
    return result
  }

  static red(text: string): string {
    return this.colorize(text, this.FG_RED)
  }

  static green(text: string): string {
    return this.colorize(text, this.FG_GREEN)
  }

  static yellow(text: string): string {
    return this.colorize(text, this.FG_YELLOW)
  }

  static blue(text: string): string {
    return this.colorize(text, this.FG_BLUE)
  }

  static magenta(text: string): string {
    return this.colorize(text, this.FG_MAGENTA)
  }

  static cyan(text: string): string {
    return this.colorize(text, this.FG_CYAN)
  }

  static white(text: string): string {
    return this.colorize(text, this.FG_WHITE)
  }

  static brightRed(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_RED)
  }

  static brightGreen(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_GREEN)
  }

  static brightYellow(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_YELLOW)
  }

  static brightBlue(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_BLUE)
  }

  static brightMagenta(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_MAGENTA)
  }

  static brightCyan(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_CYAN)
  }

  static brightWhite(text: string): string {
    return this.colorize(text, this.FG_BRIGHT_WHITE)
  }

  // File type colors (like ls --color)
  static getFileTypeColor(name: string, isDirectory: boolean, permissions: string): string {
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


