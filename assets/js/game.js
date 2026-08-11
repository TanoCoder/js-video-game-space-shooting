import { canvas, ctx, gameState, assets, getRandom } from './config.js';
import { Laser } from './Laser.js';
import { Enemy } from './Enemy.js';
import { initStars, drawStars } from './stars.js';
import { inputs, initControls } from './controls.js';

// Sélection des éléments HTML
const divRun = document.getElementById("div_run");

// Configuration du Joueur
let heroX = window.innerWidth / 2 - 65; 
let heroY = window.innerHeight - 120;    
let max_x = window.innerWidth - 130;     

let heroSpeed = 500;
let heroIsExploding = false, heroIsProtected = false;
let lastHeroFireTime = -200, coolDownHeroFireTime = 200;
let fontSize = 150;

// Variables de l'explosion du bouton d'accueil
let drawExplodeRun = false;
let explodeX = 0, explodeY = 0;
let spriteExplodeX = 0, accudeltaTime = 0;
let heroSpriteExplodeX = 0, spriteExplodeCountCurrentFrame = 1;

// Initialisations des modules
initStars(100);
initControls();

// Vagues d'ennemis de départ
let initialEnemyX = (80 / 2) + 10, initialEnemyY = -900;
for (let i = 0; i <= 4; i++) {
  gameState.enemies.push(new Enemy(initialEnemyX, initialEnemyY));
  initialEnemyX += 130; initialEnemyY += 100;
}
initialEnemyX = canvas.width - 130; initialEnemyY = -900;
for (let i = 5; i <= 9; i++) {
  gameState.enemies.push(new Enemy(initialEnemyX, initialEnemyY));
  initialEnemyX -= 130; initialEnemyY += 100;
}

assets.spaceship.onload = () => {   
  assets.spaceship.width = 75 * assets.spaceship.width / 100;
  max_x = (canvas.width - assets.spaceship.width);
  heroX = ((canvas.width - assets.spaceship.width) / 2);
  heroY = (canvas.height - 102 - 10);
};

// Clic direct sur le bouton RUN
divRun.addEventListener("click", () => {             
  if (gameState.status === 'notYetStarted') {
    const rect = divRun.getBoundingClientRect();
    explodeX = rect.left + (rect.width / 2) - 100;
    explodeY = rect.top + (rect.height / 2) - 100;
    divRun.style.display = 'none';
    accudeltaTime = 0;
    drawExplodeRun = true;
  }
});    

// ______________________________________________________________________
// LOGIQUE PHYSIQUE (UPDATE)
// ______________________________________________________________________
function update() {
  if (!heroIsExploding) {
    if (inputs.keyLeft) {
      heroX -= Math.floor(heroSpeed * gameState.dt);
      if (heroX < 0) heroX = 0;
    }
    if (inputs.keyRight) {
      heroX += Math.floor(heroSpeed * gameState.dt);
      if (heroX > max_x) heroX = max_x;
    }
    if (inputs.keySpace && (performance.now() - lastHeroFireTime > coolDownHeroFireTime)) {
      gameState.arrayLaser.push(new Laser((heroX + 130 / 2 - 20), heroY - 35));
      lastHeroFireTime = performance.now();
    }
  }

  gameState.arrayLaser.forEach(laser => laser.update());

  for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
    if (gameState.arrayLaser[i].y < 0) gameState.arrayLaser.splice(i, 1);
  }

  if (gameState.status === 'start') {
    while (gameState.enemies.length < 10) {
      let spawnX = gameState.deletedEnemiesPosX.length > 0 ? gameState.deletedEnemiesPosX.shift() : getRandom(50, canvas.width - 100);
      gameState.enemies.push(new Enemy(getRandom(spawnX - 15, spawnX - 15), getRandom(-1000, -120)));
    }

    gameState.enemies.forEach(en => en.update(heroX, heroIsExploding, heroIsProtected));

    gameState.enemies.forEach(en => {
      if (!en.isExploding) {
        gameState.arrayLaser = gameState.arrayLaser.filter(laser => {
          let hit = (laser.x >= en.x - 20) && (laser.x <= en.x + 70 - 10) && (laser.y <= en.y + 100 / 2) && (laser.y >= en.y);
          if (hit) en.isExploding = true;
          return !hit;
        });

        en.laser.forEach(l => {
          if (!heroIsExploding && !heroIsProtected) {
            if ((l.x >= heroX - 20) && (l.x <= heroX + 130) && (l.y <= heroY + 80) && (l.y >= heroY)) {
              heroIsExploding = true;
            }
          }
        });

        if (!heroIsExploding && !heroIsProtected) {
          if (heroX <= en.x + 70 && heroX + 130 >= en.x && heroY + 35 <= en.y + 100 && heroY + 80 >= en.y) {
            heroIsExploding = true;
            en.isExploding = true;
          }
        }
      }
    });
  }
}

// ______________________________________________________________________
// RENDU GRAPHIQUE (DRAW)
// ______________________________________________________________________
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();

  if (drawExplodeRun) {
    accudeltaTime += gameState.dt;
    ctx.drawImage(assets.explodeRunBtn, spriteExplodeX, 0, 95, 96, explodeX, explodeY, 200, 200);
    if (accudeltaTime > 0.05) {
      spriteExplodeX += 95;
      accudeltaTime = 0;
      if (spriteExplodeX > 1172) {
        drawExplodeRun = false;
        gameState.status = 'start';
        spriteExplodeX = 0;
      }
    }
  }

  if (gameState.status === 'start') {
    gameState.enemies.forEach(en => {
      if (!en.isExploding) ctx.drawImage(assets.imgEnemy, 0, 0, 134, 199, en.x, en.y, 70, 100);
    });

    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      let en = gameState.enemies[i];
      if (en.isExploding) {
        en.accudeltaTime += gameState.dt;
        ctx.drawImage(assets.explodeRunBtn, en.spriteExplodeX, 0, en.spriteExplodeSingleFrameWidth, 96, en.x, en.y, 100, 100);
        if (en.accudeltaTime > en.spriteExplodeSpeedFrame) {
          en.spriteExplodeCountCurrentFrame++;
          en.spriteExplodeX += en.spriteExplodeSingleFrameWidth;
          en.accudeltaTime = 0;
          if (en.spriteExplodeCountCurrentFrame > en.spriteExplodeTotFrame) {
            gameState.deletedEnemiesPosX.push(en.x);
            gameState.enemies.splice(i, 1);
          }
        }
      }
    }

    gameState.enemies.forEach(en => {
      en.laser.forEach(l => ctx.drawImage(assets.imgEnemyLaser, 210, 310, 60, 90, l.x, l.y, 42, 72));
    });
  }

  gameState.arrayLaser.forEach(l => ctx.drawImage(assets.userLaser, 300, 25, 60, 110, l.x, l.y, 42, 72));

  if (!heroIsExploding) {
    if (heroX !== undefined && heroY !== undefined) {
      ctx.drawImage(assets.spaceship, 0, 0, 170, 102, heroX, heroY, 130, 80);
    }
    if (heroIsProtected) {
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 4; ctx.beginPath();
      ctx.arc(heroX + 65, heroY + 40, 110, 0, 2 * Math.PI); ctx.stroke();
      if (fontSize > 31) fontSize -= 2;
      ctx.font = `${fontSize}px Comic Sans MS`; ctx.fillStyle = "yellow"; ctx.textAlign = 'center';
      ctx.fillText(`GET READY !`, heroX + 65, heroY - 20);
    } else {
      fontSize = 150;
    }
  } else {
    accudeltaTime += gameState.dt;
    ctx.drawImage(assets.explodeRunBtn, heroSpriteExplodeX, 0, 95, 96, heroX, heroY, 100, 100);
    if (accudeltaTime > 0.1) {
      spriteExplodeCountCurrentFrame++;
      heroSpriteExplodeX += 95;
      accudeltaTime = 0;
      if (spriteExplodeCountCurrentFrame > 12) {
        heroSpriteExplodeX = 0; spriteExplodeCountCurrentFrame = 1;
        heroX = (canvas.width - 130) / 2; heroY = canvas.height - 80 - 10;
        heroIsExploding = false; heroIsProtected = true;
        setTimeout(() => heroIsProtected = false, 3000);
      }
    }
  }
}

// ______________________________________________________________________
// BOUCLE PRINCIPALE (GAME LOOP)
// ______________________________________________________________________
function gameLoop(hrt) { 
  if (!hrt) hrt = performance.now();
  gameState.dt = (hrt - gameState.lastTime) / 1000; 
  gameState.lastTime = hrt;

  if (gameState.status === 'notYetStarted') {
    const divRunPosCurrent = divRun.getBoundingClientRect();
    for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
      let l = gameState.arrayLaser[i];
      if ((l.y < divRunPosCurrent.bottom) && (l.x > divRunPosCurrent.left) && (l.x < divRunPosCurrent.right)) {
        divRun.style.display = 'none';
        gameState.status = 'start';
        gameState.arrayLaser.splice(i, 1);
        accudeltaTime = 0;
        drawExplodeRun = true;
      }
    }
  }

  update();
  draw();
  window.requestAnimationFrame(gameLoop);
}

window.requestAnimationFrame(gameLoop);
