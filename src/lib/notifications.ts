import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "./store";

/**
 * Ensures we have OS notification permission.
 * Call once at app startup.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    return granted;
  } catch (e) {
    // If the plugin fails (common on some Linux DEs), return true
    // so we can fallback to notify-send in the rust backend
    return true;
  }
}

/**
 * Pending notification context — maps a notification action to the
 * tab/pane that triggered it, so clicking the notification can focus
 * the correct pane.
 */
interface PendingNotification {
  tabId: string;
  paneId: string;
}

// We track the most recent notification's context so we can handle
// the "user returns to window" flow. Native notification click handling
// in Tauri v2 is limited, so we also focus on window activation.
let pendingContext: PendingNotification | null = null;

/**
 * Send a native OS notification for a specific pane event.
 * Also sets up the context so that when the user clicks back into
 * the Zeyt window, we switch to the right tab/pane.
 */
export async function sendPaneNotification(
  tabId: string,
  paneId: string,
  title: string,
  body: string
): Promise<void> {
  const settings = useAppStore.getState().settings;
  if (!settings.notificationsEnabled) return;

  const granted = await ensureNotificationPermission();
  if (!granted) return;

  // Store context for focus-back
  pendingContext = { tabId, paneId };

  // Add badge to the tab
  useAppStore.getState().addTabBadge(tabId);

  await invoke("send_os_notification", { title, body });
}

/**
 * Called when the app window regains focus.
 * If there's a pending notification context, switch to that tab/pane.
 */
export function handleWindowFocus(): void {
  if (!pendingContext) return;

  const { tabId, paneId } = pendingContext;
  const state = useAppStore.getState();

  // Switch to the tab that fired the notification
  state.setActiveTab(tabId);
  state.setActivePane(paneId);

  pendingContext = null;
}

/**
 * Set up a listener on the main window to handle focus events.
 */
export function setupNotificationFocusListener(): void {
  const appWindow = getCurrentWindow();
  appWindow.onFocusChanged(({ payload: focused }) => {
    if (focused) {
      handleWindowFocus();
    }
  });
}
