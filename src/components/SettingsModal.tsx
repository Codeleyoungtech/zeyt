import { useAppStore } from '../lib/store';
import { themes } from '../lib/theme';
import { useState } from 'react';

type SettingsTab = 'appearance' | 'terminal' | 'keybindings';

const DEFAULT_KEYBINDINGS = [
  { action: 'New Tab', key: 'Ctrl+T', id: 'newTab' },
  { action: 'Close Pane / Tab', key: 'Ctrl+W', id: 'closePane' },
  { action: 'Split Vertical', key: 'Ctrl+D', id: 'splitVertical' },
  { action: 'Split Horizontal', key: 'Ctrl+Shift+D', id: 'splitHorizontal' },
  { action: 'Switch Tab 1-9', key: 'Ctrl+1-9', id: 'switchTab' },
  { action: 'Workspace Switcher', key: 'Ctrl+K', id: 'workspaceSwitcher' },
  { action: 'Copy', key: 'Ctrl+Shift+C', id: 'copy' },
  { action: 'Paste', key: 'Ctrl+Shift+V', id: 'paste' },
  { action: 'Settings', key: 'Ctrl+,', id: 'settings' },
];

export default function SettingsPanel() {
  const { isSettingsOpen, toggleSettings, settings, updateSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  if (!isSettingsOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      ),
    },
    {
      id: 'keybindings',
      label: 'Keybindings',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="10" y2="8" /><line x1="14" y1="8" x2="14" y2="8" /><line x1="18" y1="8" x2="18" y2="8" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="6" y1="16" x2="18" y2="16" />
        </svg>
      ),
    },
  ];

  const currentTheme = themes[settings.themeId] || themes['default'];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none"
      onMouseDown={(e) => { if (e.target === e.currentTarget) toggleSettings(); }}
    >
      <div 
        className="w-[620px] h-[480px] bg-[#1e1e1e] border rounded-xl flex overflow-hidden text-[#d4d4d4]"
        style={{
          borderColor: 'color-mix(in srgb, var(--brand) 20%, transparent)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)'
        }}
      >
        
        {/* Sidebar */}
        <div className="w-[180px] bg-[#181818] border-r border-[#333333] flex flex-col py-3">
          <h2 className="px-4 text-xs font-bold uppercase tracking-widest text-[#666] mb-3">Settings</h2>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#2d2d2d] text-white border-r-2 border-[var(--brand)]'
                  : 'text-[#999] hover:text-white hover:bg-[#222]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          
          <div className="mt-auto px-4 pb-2">
            <button
              onClick={() => {
                updateSettings({
                  themeId: 'default',
                  fontFamily: 'JetBrains Mono, Cascadia Code, monospace',
                  fontSize: 14,
                  cursorStyle: 'block',
                  cursorBlink: true,
                });
              }}
              className="w-full text-xs text-[#888] hover:text-white py-1.5 px-2 rounded hover:bg-[#333] transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-12 border-b border-[#333333] flex items-center justify-between px-5 bg-[#222] shrink-0">
            <h3 className="font-semibold text-white text-sm">{tabs.find(t => t.id === activeTab)?.label}</h3>
            <button onClick={toggleSettings} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#444] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-6">
                {/* Theme */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Color Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(themes).map(t => (
                      <button
                        key={t.id}
                        onClick={() => updateSettings({ themeId: t.id })}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all relative ${
                          settings.themeId === t.id
                            ? 'border-[var(--brand)] bg-[#222]'
                            : 'border-[#333] hover:border-[#444] bg-[#222]'
                        }`}
                      >
                        {/* Color swatches */}
                        <div className="flex gap-0.5">
                          <div className="w-3 h-3 rounded-full border border-[#444]" style={{ background: t.colors.background }} />
                          <div className="w-3 h-3 rounded-full border border-[#444]" style={{ background: t.colors.foreground }} />
                          <div className="w-3 h-3 rounded-full border border-[#444]" style={{ background: t.colors.blue }} />
                          <div className="w-3 h-3 rounded-full border border-[#444]" style={{ background: t.colors.cyan }} />
                        </div>
                        <span className="text-sm">{t.name}</span>
                        {settings.themeId === t.id && (
                          <svg className="w-3.5 h-3.5 text-[var(--brand)] absolute right-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Preview</label>
                  <div
                    className="rounded-lg border border-[#333] p-3 font-mono text-xs leading-relaxed"
                    style={{
                      background: currentTheme.colors.background,
                      color: currentTheme.colors.foreground,
                      fontFamily: settings.fontFamily,
                      fontSize: `${Math.min(settings.fontSize, 13)}px`,
                    }}
                  >
                    <span style={{ color: currentTheme.colors.green }}>user@zeyt</span>
                    <span style={{ color: currentTheme.colors.white }}>:</span>
                    <span style={{ color: currentTheme.colors.blue }}>~/projects</span>
                    <span style={{ color: currentTheme.colors.white }}>$ </span>
                    <span style={{ color: currentTheme.colors.yellow }}>ls -la</span>
                    <br />
                    <span style={{ color: currentTheme.colors.cyan }}>drwxr-xr-x</span>
                    <span style={{ color: currentTheme.colors.foreground }}> 4 user user 4096 Jun 25 </span>
                    <span style={{ color: currentTheme.colors.magenta }}>src/</span>
                    <br />
                    <span style={{ color: currentTheme.colors.red }}>-rw-r--r--</span>
                    <span style={{ color: currentTheme.colors.foreground }}> 1 user user  721 Jun 25 </span>
                    <span style={{ color: currentTheme.colors.foreground }}>package.json</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="flex flex-col gap-6">
                {/* Font Family */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Font Family</label>
                  <input
                    type="text"
                    value={settings.fontFamily}
                    onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                    className="bg-[#2a2a2a] border border-[#444] rounded-lg px-3 py-2 outline-none focus:border-[var(--brand)] text-sm font-mono transition-colors"
                  />
                </div>

                {/* Font Size */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Font Size</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#666]">8</span>
                    <input
                      type="range"
                      min="8" max="32"
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                      className="flex-1 accent-[var(--brand)]"
                    />
                    <span className="text-xs text-[#666]">32</span>
                    <span className="text-sm font-bold text-[var(--brand)] w-6 text-right">{settings.fontSize}</span>
                  </div>
                </div>

                {/* Cursor */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Cursor Style</label>
                  <div className="flex gap-2">
                    {(['block', 'underline', 'bar'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => updateSettings({ cursorStyle: style })}
                        className={`flex-1 py-2 rounded-lg border text-sm capitalize transition-all relative ${
                          settings.cursorStyle === style
                            ? 'border-[var(--brand)] bg-[#222] text-white'
                            : 'border-[#333] hover:border-[#444] bg-[#222] text-[#999]'
                        }`}
                      >
                        {style}
                        {settings.cursorStyle === style && (
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--brand)] flex items-center justify-center shadow-sm">
                            <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cursor Blink */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Blinking Cursor</span>
                  <div
                    onClick={() => updateSettings({ cursorBlink: !settings.cursorBlink })}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                      settings.cursorBlink ? 'bg-[var(--brand)]' : 'bg-[#444]'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                      settings.cursorBlink ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </label>
              </div>
            )}

            {activeTab === 'keybindings' && (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-[#666] mb-3">Default keyboard shortcuts. Custom keybinding configuration coming in v1.1.</p>
                {DEFAULT_KEYBINDINGS.map((kb) => (
                  <div key={kb.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#252525] transition-colors">
                    <span className="text-sm">{kb.action}</span>
                    <kbd className="bg-[#2a2a2a] border border-[#444] rounded px-2 py-0.5 text-xs font-mono text-[#ccc] min-w-[70px] text-center inline-block">
                      {kb.key}
                    </kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
