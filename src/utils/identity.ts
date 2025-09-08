// Netlify Identity helper (optional stronger auth)
// Loads the widget from window if the script was included in index.html

declare global {
  interface Window { netlifyIdentity?: any }
}

function widget() {
  if (typeof window === 'undefined') return null as any;
  return (window as any).netlifyIdentity || null;
}

export function initIdentity() {
  try { widget()?.init?.(); } catch {}
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const id = widget();
    const user = id?.currentUser?.();
    if (!user) return {};
    const token = await user.jwt();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export function currentIdentityEmail(): string | null {
  try {
    const id = widget();
    const user = id?.currentUser?.();
    return (user?.email as string) || null;
  } catch {
    return null;
  }
}

const identity = { on: (...args: any[]) => widget()?.on?.(...args), off: (...args: any[]) => widget()?.off?.(...args), open: (...args: any[]) => widget()?.open?.(...args) } as any;
export default identity;
