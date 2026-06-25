import { useAppStore } from '../lib/store';
import { themes } from '../lib/theme';

export default function SettingsModal() {
  const { isSettingsOpen, toggleSettings, settings, updateSettings } = useAppStore();

  if (!isSettingsOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm select-none">
      <div className="w-[450px] bg-[#1e1e1e] border border-[#333333] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#d4d4d4]">
        
        <div className="h-10 border-b border-[#333333] flex items-center justify-between px-4 bg-[#252525]">
          <h2 className="font-semibold text-white">Settings</h2>
          <button onClick={toggleSettings} className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#444] transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Theme</label>
            <select 
              value={settings.themeId}
              onChange={(e) => updateSettings({ themeId: e.target.value })}
              className="bg-[#2d2d2d] border border-[#444] rounded px-3 py-1.5 outline-none focus:border-[#ffbd2e] text-sm"
            >
              {Object.values(themes).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Font Family</label>
            <input 
              type="text"
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="bg-[#2d2d2d] border border-[#444] rounded px-3 py-1.5 outline-none focus:border-[#ffbd2e] text-sm font-mono"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Font Size</label>
              <input 
                type="number"
                min="8" max="72"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) || 14 })}
                className="bg-[#2d2d2d] border border-[#444] rounded px-3 py-1.5 outline-none focus:border-[#ffbd2e] text-sm"
              />
            </div>
            
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">Cursor</label>
              <select 
                value={settings.cursorStyle}
                onChange={(e) => updateSettings({ cursorStyle: e.target.value as any })}
                className="bg-[#2d2d2d] border border-[#444] rounded px-3 py-1.5 outline-none focus:border-[#ffbd2e] text-sm"
              >
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input 
              type="checkbox" 
              checked={settings.cursorBlink}
              onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
              className="accent-[#ffbd2e]"
            />
            <span className="text-sm">Blinking cursor</span>
          </label>

        </div>
      </div>
    </div>
  );
}
