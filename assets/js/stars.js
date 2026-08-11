import { canvas, ctx } from './config.js';

let stars = [];

export function initStars(count = 100) {
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height
    });
  }
}

export function drawStars() {
  ctx.fillStyle = "white";
  stars.forEach(s => ctx.fillRect(s.x, s.y, 1, 1));
}

