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

// Procedural noise texture (grass, asphalt, concrete, plaster, wood…).
export function makeNoiseTexture({ base = '#5d8a4a', vary = 22, size = 256, blotches = 0, blotchColor = '#000000', blotchAlpha = 0.08 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * vary;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let b = 0; b < blotches; b++) {
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = blotchAlpha * (0.5 + Math.random() * 0.5);
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, 8 + Math.random() * 30, 6 + Math.random() * 22, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
