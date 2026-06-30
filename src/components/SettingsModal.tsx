import { useAppStore } from '../lib/store';
import { themes } from '../lib/theme';
import { useState, useEffect } from 'react';

type SettingsTab = 'appearance' | 'terminal' | 'keybindings' | 'notifications' | 'advanced';

const DEFAULT_KEYBINDINGS = [
  { action: 'New Tab', key: 'Ctrl+T', id: 'newTab' },
  { action: 'Close Pane / Tab', key: 'Ctrl+W', id: 'closePane' },
  { action: 'Split Vertical', key: 'Ctrl+D', id: 'splitVertical' },
  { action: 'Split Horizontal', key: 'Ctrl+Shift+D', id: 'splitHorizontal' },
  { action: 'Switch Tab 1-9', key: 'Ctrl+1-9', id: 'switchTab' },
  { action: 'Workspace Switcher', key: 'Ctrl+K', id: 'workspaceSwitcher' },
  { action: 'Copy', key: 'Ctrl+Shift+C', id: 'copy' },
  { action: 'Paste', key: 'Ctrl+Shift+V', id: 'paste' },
  { action: 'Terminal Search', key: 'Ctrl+F', id: 'search' },
  { action: 'Settings', key: 'Ctrl+,', id: 'settings' },
];

export default function SettingsPanel() {
  const { isSettingsOpen, toggleSettings, settings, updateSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [localFontSize, setLocalFontSize] = useState(settings?.fontSize || 14);
  const [activeScope, setActiveScope] = useState<'user' | 'workspace'>('user');

  useEffect(() => {
    if (settings?.fontSize) {
      setLocalFontSize(settings.fontSize);
    }
  }, [settings?.fontSize]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localFontSize !== settings?.fontSize) {
        updateSettings({ fontSize: localFontSize });
      }
    }, 100);
    return () => clearTimeout(handler);
  }, [localFontSize, settings?.fontSize, updateSettings]);

  if (!isSettingsOpen) return null;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'appearance', label: 'Commonly Used' },
    { id: 'terminal', label: 'Text Editor' },
    { id: 'keybindings', label: 'Keybindings' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'advanced', label: 'Advanced' },
  ];

  const currentTheme = themes[settings.themeId] || themes['default'];

  // Pill toggle component (Zeyt style)
  const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <div
      onClick={onChange}
      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
        checked ? 'bg-[var(--brand)]' : 'bg-[var(--border-focus)]'
      }`}
    >
      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${
        checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
      }`} />
    </div>
  );

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] select-none"
      onMouseDown={(e) => { if (e.target === e.currentTarget) toggleSettings(); }}
    >
      <div 
        className="w-[700px] h-[500px] bg-[var(--bg-base)] border border-[var(--border-highlight)] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] font-[family-name:var(--font-sans)]"
      >
        {/* Top Header - Search & Scope */}
        <div className="flex flex-col border-b border-[var(--border-color)] pt-4 px-6 gap-3 shrink-0 bg-[var(--bg-surface-2)]">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 focus-within:border-[var(--brand)] transition-colors">
              <svg className="w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" 
                placeholder="Search settings"
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--text-primary)] placeholder-[#888]"
              />
              <kbd className="hidden sm:block text-[10px] font-[family-name:var(--font-mono)] bg-[var(--border-highlight)] text-[#aaa] px-1.5 py-0.5 rounded border border-[var(--border-focus)]">Ctrl+F</kbd>
            </div>
            <button onClick={toggleSettings} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--border-highlight)] text-[#aaa] hover:text-[var(--text-primary)] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Scopes */}
          <div className="flex items-center gap-6 mt-1">
            <button 
              onClick={() => setActiveScope('user')}
              className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${
                activeScope === 'user' ? 'border-[var(--brand)] text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              User
            </button>
            <button 
              onClick={() => setActiveScope('workspace')}
              className={`pb-2 text-[13px] font-medium border-b-2 transition-colors ${
                activeScope === 'workspace' ? 'border-[var(--brand)] text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Workspace
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 flex min-h-0 bg-[var(--bg-base)]">
          
          {/* Sidebar */}
          <div className="w-[180px] flex flex-col py-4 gap-1 overflow-y-auto custom-scrollbar shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-surface-2)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center mx-2 px-4 py-2 rounded-md text-[13px] transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--brand)]/10 text-[var(--brand)] font-medium'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
            
            {activeScope === 'workspace' ? (
              <div className="text-[var(--text-muted)] text-[13px]">
                Workspace settings are currently identical to User settings. Per-workspace configurations coming in v1.1.
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white mb-5">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>

                <div className="flex flex-col gap-5 max-w-[480px]">
                  
                  {/* APPEARANCE */}
                  {activeTab === 'appearance' && (
                    <>
                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-2 first:mt-0">Theme</h3>
                      
                      {/* Theme */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Color Theme</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Controls the active color theme.</p>
                        
                        <div className="relative">
                          <select 
                            value={settings.themeId}
                            onChange={(e) => updateSettings({ themeId: e.target.value })}
                            className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] appearance-none"
                          >
                            {Object.values(themes).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </div>

                        {/* Theme Preview */}
                        <div className="mt-3 relative pt-4 rounded border border-[var(--border-focus)] bg-black/20 overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 bg-[var(--bg-surface-3)] border-b border-[var(--border-focus)] px-3 py-1 text-[10px] text-[var(--text-secondary)] tracking-widest uppercase flex items-center justify-between">
                            <span>Preview</span>
                            <div className="flex gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                              <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                              <div className="w-2 h-2 rounded-full bg-[#27c93f]" />
                            </div>
                          </div>
                          <div className="p-4 font-[family-name:var(--font-mono)] text-[11px] leading-relaxed"
                            style={{
                              background: currentTheme.colors.background,
                              color: currentTheme.colors.foreground,
                              fontFamily: settings.fontFamily,
                            }}
                          >
                            <span style={{ color: currentTheme.colors.green }}>user@zeyt</span>
                            <span style={{ color: currentTheme.colors.white }}>:</span>
                            <span style={{ color: currentTheme.colors.blue }}>~/projects</span>
                            <span style={{ color: currentTheme.colors.white }}>$ </span>
                            <span style={{ color: currentTheme.colors.yellow }}>ls -la</span>
                            <br />
                            <span style={{ color: currentTheme.colors.cyan }}>drwxr-xr-x</span>
                            <span style={{ color: currentTheme.colors.foreground }}> 4 user 4096 </span>
                            <span style={{ color: currentTheme.colors.magenta }}>src/</span>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-4">Workspace</h3>

                      {/* Workspace Switcher Mode */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Sidebar Visibility</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Controls whether the workspace list is always visible as a sidebar or opens as an overlay.</p>
                        
                        <div className="relative">
                          <select 
                            value={settings.workspaceSwitcherMode}
                            onChange={(e) => updateSettings({ workspaceSwitcherMode: e.target.value as 'overlay' | 'sidebar' })}
                            className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] appearance-none"
                          >
                            <option value="sidebar">sidebar</option>
                            <option value="overlay">overlay</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* TERMINAL / TEXT EDITOR */}
                  {activeTab === 'terminal' && (
                    <>
                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-2 first:mt-0">Font</h3>

                      {/* Font Family */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Font Family</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Controls the font family.</p>
                        <input
                          type="text"
                          value={settings.fontFamily}
                          onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                          className="bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] font-[family-name:var(--font-mono)]"
                        />
                      </div>

                      {/* Font Size */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Font Size</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Controls the font size in pixels.</p>
                        <input
                          type="number"
                          value={localFontSize}
                          onChange={(e) => setLocalFontSize(parseInt(e.target.value))}
                          className="w-24 bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                        />
                      </div>

                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-4">Cursor</h3>

                      {/* Cursor Style */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Cursor Style</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Controls the cursor style.</p>
                        <div className="relative">
                          <select 
                            value={settings.cursorStyle}
                            onChange={(e) => updateSettings({ cursorStyle: e.target.value as any })}
                            className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] appearance-none"
                          >
                            <option value="block">block</option>
                            <option value="bar">line</option>
                            <option value="underline">underline</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </div>
                      </div>

                      {/* Cursor Blink */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Cursor Blinking</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Controls whether the terminal cursor blinks.</p>
                        <div className="flex items-center gap-3 mt-1">
                          <ToggleSwitch 
                            checked={settings.cursorBlink} 
                            onChange={() => updateSettings({ cursorBlink: !settings.cursorBlink })} 
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">Blink</span>
                        </div>
                      </div>

                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-4">Shell</h3>

                      {/* Prompt Style */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Prompt Style</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Override the shell prompt layout.</p>
                        <div className="relative">
                          <select 
                            value={settings.promptStyle || 'default'}
                            onChange={(e) => updateSettings({ promptStyle: e.target.value as any })}
                            className="w-full bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)] appearance-none"
                          >
                            <option value="default">Default (User Shell Profile)</option>
                            <option value="minimal">Minimal (Folder ❯)</option>
                            <option value="path">Path (~/Folder ❯)</option>
                            <option value="symbol">Symbol Only (❯)</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-4">Behavior</h3>

                      {/* Smart Ctrl+C */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Smart Copy (Ctrl+C)</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">When enabled, pressing Ctrl+C copies text if selected, otherwise sends an interrupt signal.</p>
                        <div className="flex items-center gap-3 mt-1">
                          <ToggleSwitch 
                            checked={settings.smartCtrlC} 
                            onChange={() => updateSettings({ smartCtrlC: !settings.smartCtrlC })} 
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">Enable Smart Copy</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* KEYBINDINGS */}
                  {activeTab === 'keybindings' && (
                    <>
                      <p className="text-[13px] text-[var(--text-secondary)] mb-2">Default keyboard shortcuts. Custom keybinding configuration coming in v1.1.</p>
                      <div className="flex flex-col bg-[var(--bg-surface-2)] border border-[var(--border-color)] rounded">
                        {DEFAULT_KEYBINDINGS.map((kb, i) => (
                          <div key={kb.id} className={`flex items-center justify-between py-2 px-4 ${i !== DEFAULT_KEYBINDINGS.length - 1 ? 'border-b border-[var(--border-color)]' : ''}`}>
                            <span className="text-[13px] text-[var(--text-primary)]">{kb.action}</span>
                            <kbd className="bg-[var(--border-focus)] border border-[var(--border-highlight)] rounded px-2 py-0.5 text-[11px] font-[family-name:var(--font-mono)] text-[var(--text-primary)] shadow-sm">
                              {kb.key}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* NOTIFICATIONS */}
                  {activeTab === 'notifications' && (
                    <>
                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-2 first:mt-0">Background Monitoring</h3>

                      {/* Master Toggle */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Enable</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Get notified when watched panes need attention.</p>
                        <div className="flex items-center gap-3 mt-1">
                          <ToggleSwitch 
                            checked={settings.notificationsEnabled} 
                            onChange={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })} 
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">Enable background notifications</span>
                        </div>
                      </div>

                      {/* Threshold */}
                      <div className={`flex flex-col gap-1.5 ${!settings.notificationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Minimum Runtime Threshold</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Only notify when a process has been running longer than this (in seconds) before it exits.</p>
                        <input
                          type="number"
                          min="5" max="120"
                          value={settings.notificationMinRuntime}
                          onChange={(e) => updateSettings({ notificationMinRuntime: parseInt(e.target.value) })}
                          className="w-24 bg-[var(--bg-surface-3)] border border-[var(--border-focus)] rounded px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
                        />
                      </div>
                    </>
                  )}

                  {/* ADVANCED */}
                  {activeTab === 'advanced' && (
                    <>
                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-2 first:mt-0">Terminal</h3>
                      
                      {/* Destructive Warnings */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Destructive Command Warnings</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">Show a warning indicator in the terminal when typing a potentially destructive command (e.g., rm -rf).</p>
                        <div className="flex items-center gap-3 mt-1">
                          <ToggleSwitch 
                            checked={settings.destructiveWarnings ?? true} 
                            onChange={() => updateSettings({ destructiveWarnings: !(settings.destructiveWarnings ?? true) })} 
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">Enable Warnings</span>
                        </div>
                      </div>

                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-4">History</h3>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Autosuggest History</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">
                          Zeyt stores a local directory-scoped history of the commands you run to provide ghost-text autosuggestions.
                        </p>
                        <div className="mt-2">
                          <button 
                            onClick={async () => {
                              try {
                                const { invoke } = await import('@tauri-apps/api/core');
                                await invoke('clear_history');
                                alert('Command history cleared successfully.');
                              } catch (e) {
                                alert('Failed to clear history.');
                              }
                            }}
                            className="px-4 py-1.5 bg-[var(--bg-surface-3)] hover:bg-[var(--border-highlight)] text-[var(--text-primary)] border border-[var(--border-highlight)] rounded transition-colors text-[13px]"
                          >
                            Clear Command History
                          </button>
                        </div>
                      </div>
                      
                      <h3 className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-widest mb-1 mt-4">Reset</h3>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">Factory Defaults</span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] mb-1">
                          Restore all settings to their original defaults.
                        </p>
                        <div className="mt-2">
                          <button 
                            onClick={() => {
                              updateSettings({
                                themeId: 'default',
                                fontFamily: 'JetBrains Mono, Cascadia Code, monospace',
                                fontSize: 14,
                                cursorStyle: 'block',
                                cursorBlink: true,
                                destructiveWarnings: true,
                              });
                            }}
                            className="px-4 py-1.5 bg-[var(--bg-surface-3)] hover:bg-[var(--border-highlight)] text-[var(--text-primary)] border border-[var(--border-highlight)] rounded transition-colors text-[13px]"
                          >
                            Reset Settings
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
