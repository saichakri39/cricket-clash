// Safe storage wrapper to prevent crashes in sandboxed iframes or restricted environments
export function safeGetStorage(key: string, fallback: string = ''): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || fallback;
    }
  } catch {
    // Sandboxed iframes block localStorage access
  }
  return fallback;
}

export function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore restricted iframe error
  }
}
