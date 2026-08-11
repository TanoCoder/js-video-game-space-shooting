import { gameState, canvas } from './config.js';

export function checkCollisions(hero, onHeroHit) {
  if (gameState.status === 'gameOver') return;

  gameState.enemies.forEach(en => {
    if (!en.isExploding) {
      // A. Lasers joueur VS Ennemi
      gameState.arrayLaser = gameState.arrayLaser.filter(laser => {
        let hit = (laser.x >= en.x - 20) && (laser.x <= en.x + 70 - 10) && (laser.y <= en.y + 100 / 2) && (laser.y >= en.y);
        if (hit) {
          en.isExploding = true;
          gameState.score += 100;
        }
        return !hit;
      });

      // B. Lasers Ennemis VS Joueur
      en.laser.forEach(l => {
        if (!hero.isExploding && !hero.isProtected) {
          if ((l.x >= hero.x - 20) && (l.x <= hero.x + 130) && (l.y <= hero.y + 80) && (l.y >= hero.y)) {
            onHeroHit();
          }
        }
      });

      // C. Corps à corps Ennemi VS Joueur
      if (!hero.isExploding && !hero.isProtected) {
        if (hero.x <= en.x + 70 && hero.x + 130 >= en.x && hero.y + 35 <= en.y + 100 && hero.y + 80 >= en.y) {
          en.isExploding = true;
          onHeroHit();
        }
      }
    }
  });
}

