export interface ThemeColors {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent?: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const themes: Record<string, Theme> = {
  'default': {
    id: 'default',
    name: 'Zeyt Dark',
    colors: {
      background: '#1a1a1a',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5',
    }
  },
  'dark-pro': {
    id: 'dark-pro',
    name: 'macOS Pro',
    colors: {
      background: '#000000',
      foreground: '#f2f2f2',
      cursor: '#4d4d4d',
      selectionBackground: '#404040',
      black: '#000000',
      red: '#c91b00',
      green: '#00c200',
      yellow: '#c7c400',
      blue: '#0225c7',
      magenta: '#c930c7',
      cyan: '#00c5c7',
      white: '#c7c7c7',
      brightBlack: '#676767',
      brightRed: '#ff6d67',
      brightGreen: '#5ff967',
      brightYellow: '#fefb67',
      brightBlue: '#6871ff',
      brightMagenta: '#ff77ff',
      brightCyan: '#5ffdff',
      brightWhite: '#feffff',
    }
  },
  'nord': {
    id: 'nord',
    name: 'Nord',
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      selectionBackground: '#434c5e',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4',
    }
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    colors: {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#ffffff',
      selectionBackground: '#ffffff40',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      magenta: '#ff00ff',
      cyan: '#00ffff',
      white: '#ffffff',
      brightBlack: '#808080',
      brightRed: '#ff0000',
      brightGreen: '#00ff00',
      brightYellow: '#ffff00',
      brightBlue: '#0000ff',
      brightMagenta: '#ff00ff',
      brightCyan: '#00ffff',
      brightWhite: '#ffffff',
    }
  }
};

export interface Settings {
  themeId: string;
  fontFamily: string;
  fontSize: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  workspaceSwitcherMode: 'overlay' | 'sidebar';
}

export const defaultSettings: Settings = {
  themeId: 'default',
  fontFamily: 'JetBrains Mono, Cascadia Code, monospace',
  fontSize: 14,
  cursorStyle: 'block',
  cursorBlink: true,
  workspaceSwitcherMode: 'overlay',
};
