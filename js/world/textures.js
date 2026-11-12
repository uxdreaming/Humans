// Canvas text textures shared by town/cars (signs, billboards, price tags).

import * as THREE from 'three';

export function makeTextTexture(text, { w = 512, h = 128, bg = '#1c2547', fg = '#ffd479', font = 40 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg; ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const parts = text.split('·');
  if (parts.length > 1 && text.length > 26) {
    ctx.font = `bold ${font - 8}px "Segoe UI", Arial`;
    ctx.fillText(parts[0].trim(), w / 2, h / 2 - font / 2 - 4);
    ctx.fillText(parts.slice(1).join('·').trim(), w / 2, h / 2 + font / 2 + 4);
  } else {
    let size = font;
    ctx.font = `bold ${size}px "Segoe UI", Arial`;
    while (ctx.measureText(text).width > w - 40 && size > 16) {
      size -= 4;
      ctx.font = `bold ${size}px "Segoe UI", Arial`;
    }
    ctx.fillText(text, w / 2, h / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
