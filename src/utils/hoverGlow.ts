export function initHoverGlow() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  let raf = 0;
  const root = document.documentElement;
  const onMove = (e: PointerEvent | MouseEvent) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      root.style.setProperty('--glow-x', `${x}%`);
      root.style.setProperty('--glow-y', `${y}%`);
    });
  };
  window.addEventListener('pointermove', onMove, { passive: true });
}

