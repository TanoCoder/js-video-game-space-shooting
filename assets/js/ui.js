import { ctx, canvas, gameState } from './config.js';

export function drawUI() {
  if (gameState.status !== 'start' && gameState.status !== 'gameOver') return;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px 'Courier New', monospace";
  
  // Score (Haut gauche)
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${String(gameState.score).padStart(6, '0')}`, 20, 40);
  
  // Points de vie (Haut droite)
  ctx.textAlign = "right";
  const hearts = "❤️".repeat(gameState.playerHp) + "🖤".repeat(gameState.maxHp - gameState.playerHp);
  ctx.fillText(`HP: ${hearts}`, canvas.width - 20, 40);
  ctx.restore();
}

export function drawGameOver() {
  if (gameState.status !== 'gameOver') return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "#ff3333";
  ctx.font = "bold 50px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px 'Courier New', monospace";
  ctx.fillText("Touchez l'écran ou ESPACE pour RESTART", canvas.width / 2, canvas.height / 2 + 30);
  
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "22px 'Courier New', monospace";
  ctx.fillText(`Score Final: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 80);
  ctx.restore();
}

