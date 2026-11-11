// Toast notifications (top centre, below the HUD).

export function createToasts() {
  const root = document.getElementById('toasts');
  return function toast(text) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    root.appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    setTimeout(() => {
      d.classList.remove('show');
      setTimeout(() => d.remove(), 500);
    }, 4200);
  };
}
