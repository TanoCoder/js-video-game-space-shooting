import { canvas, ctx, gameState, assets, getRandom } from './config.js';
import { Laser } from './laser.js';
import { Enemy } from './enemy.js';
import { initStars, drawStars } from './stars.js';
import { inputs, initControls } from './controls.js';
import { checkCollisions } from './collisions.js';
import { drawUI, drawGameOver } from './ui.js';

const divRun = document.getElementById("div_run");

// Structure locale propre pour le Joueur
const hero = {
  x: window.innerWidth / 2 - 65,
  y: window.innerHeight - 120,
  speed: 500,
  isExploding: false,
  isProtected: false
};
let max_x = window.innerWidth - 130;     
let lastHeroFireTime = -200, coolDownHeroFireTime = 200, fontSize = 150;

// Variables bouton d'accueil
let drawExplodeRun = false, explodeX = 0, explodeY = 0, spriteExplodeX = 0, accudeltaTime = 0;
let heroSpriteExplodeX = 0, spriteExplodeCountCurrentFrame = 1;

initStars(100);
initControls();

function spawnInitialEnemies() {
  gameState.enemies = [];
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
}
spawnInitialEnemies();

assets.spaceship.onload = () => {   
  assets.spaceship.width = 75 * assets.spaceship.width / 100;
  max_x = (canvas.width - assets.spaceship.width);
  hero.x = ((canvas.width - assets.spaceship.width) / 2);
  hero.y = (canvas.height - 102 - 10);
};

divRun.addEventListener("click", () => {             
  if (gameState.status === 'notYetStarted') {
    const rect = divRun.getBoundingClientRect();
    explodeX = rect.left + (rect.width / 2) - 100; explodeY = rect.top + (rect.height / 2) - 100;
    divRun.style.display = 'none'; accudeltaTime = 0; drawExplodeRun = true;
  }
});    

function resetGame() {
  gameState.score = 0; gameState.playerHp = gameState.maxHp; gameState.arrayLaser = []; gameState.deletedEnemiesPosX = [];
  spawnInitialEnemies();
  hero.x = (canvas.width - 130) / 2; hero.y = canvas.height - 102 - 10;
  hero.isExploding = false; hero.isProtected = true; fontSize = 150;
  setTimeout(() => hero.isProtected = false, 3000);
  gameState.status = 'start';
}

// Contrôles de redémarrage
[window, 'touchstart'].forEach(event => window.addEventListener(event, () => { if (gameState.status === 'gameOver') resetGame(); }));
window.addEventListener("keydown", (e) => { if (gameState.status === 'gameOver' && e.code === "Space") resetGame(); });

// ______________________________________________________________________
// LOGIQUE PHYSIQUE (UPDATE)
// ______________________________________________________________________
function update() {
  if (gameState.status === 'gameOver') return;

  if (!hero.isExploding) {
    if (inputs.keyLeft) { hero.x -= Math.floor(hero.speed * gameState.dt); if (hero.x < 0) hero.x = 0; }
    if (inputs.keyRight) { hero.x += Math.floor(hero.speed * gameState.dt); if (hero.x > max_x) hero.x = max_x; }
    if (inputs.keySpace && (performance.now() - lastHeroFireTime > coolDownHeroFireTime)) {
      gameState.arrayLaser.push(new Laser((hero.x + 130 / 2 - 20), hero.y - 35));
      lastHeroFireTime = performance.now();
    }
  }

  gameState.arrayLaser.forEach(laser => laser.update());
  for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) { if (gameState.arrayLaser[i].y < 0) gameState.arrayLaser.splice(i, 1); }

  if (gameState.status === 'start') {
    while (gameState.enemies.length < 10) {
      let spawnX = gameState.deletedEnemiesPosX.length > 0 ? gameState.deletedEnemiesPosX.shift() : getRandom(50, canvas.width - 100);
      gameState.enemies.push(new Enemy(getRandom(spawnX - 15, spawnX - 15), getRandom(-1000, -120)));
    }
    gameState.enemies.forEach(en => en.update(hero.x, hero.isExploding, hero.isProtected));
    
    // Appel du module externe de collisions avec callback de dégâts
    checkCollisions(hero, () => {
      hero.isExploding = true;
      gameState.playerHp--;
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
    if (accudeltaTime > 0.05) { spriteExplodeX += 95; accudeltaTime = 0; if (spriteExplodeX > 1172) { drawExplodeRun = false; gameState.status = 'start'; spriteExplodeX = 0; } }
  }

  if (gameState.status === 'start' || gameState.status === 'gameOver') {
    gameState.enemies.forEach(en => { if (!en.isExploding) ctx.drawImage(assets.imgEnemy, 0, 0, 134, 199, en.x, en.y, 70, 100); });
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
      let en = gameState.enemies[i];
      if (en.isExploding) {
        en.accudeltaTime += gameState.dt; ctx.drawImage(assets.explodeRunBtn, en.spriteExplodeX, 0, en.spriteExplodeSingleFrameWidth, 96, en.x, en.y, 100, 100);
        if (en.accudeltaTime > en.spriteExplodeSpeedFrame) {
          en.spriteExplodeCountCurrentFrame++; en.spriteExplodeX += en.spriteExplodeSingleFrameWidth; en.accudeltaTime = 0;
          if (en.spriteExplodeCountCurrentFrame > en.spriteExplodeTotFrame) { gameState.deletedEnemiesPosX.push(en.x); gameState.enemies.splice(i, 1); }
        }
      }
    }
    gameState.enemies.forEach(en => { en.laser.forEach(l => ctx.drawImage(assets.imgEnemyLaser, 210, 310, 60, 90, l.x, l.y, 42, 72)); });
  }

  gameState.arrayLaser.forEach(l => ctx.drawImage(assets.userLaser, 300, 25, 60, 110, l.x, l.y, 42, 72));

  if (!hero.isExploding) {
    if (hero.x !== undefined && hero.y !== undefined && gameState.status !== 'gameOver') ctx.drawImage(assets.spaceship, 0, 0, 170, 102, hero.x, hero.y, 130, 80);
    if (hero.isProtected && gameState.status !== 'gameOver') {
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hero.x + 65, hero.y + 40, 110, 0, 2 * Math.PI); ctx.stroke();
      if (fontSize > 31) fontSize -= 2; ctx.font = `${fontSize}px Comic Sans MS`; ctx.fillStyle = "yellow"; ctx.textAlign = 'center'; ctx.fillText(`GET READY !`, hero.x + 65, hero.y - 20);
    } else { fontSize = 150; }
  } else {
    accudeltaTime += gameState.dt;
    ctx.drawImage(assets.explodeRunBtn, heroSpriteExplodeX, 0, 95, 96, hero.x, hero.y, 100, 100);
    if (accudeltaTime > 0.1) {
      spriteExplodeCountCurrentFrame++; heroSpriteExplodeX += 95; accudeltaTime = 0;
      if (spriteExplodeCountCurrentFrame > 12) {
        heroSpriteExplodeX = 0; spriteExplodeCountCurrentFrame = 1; hero.isExploding = false;
        if (gameState.playerHp <= 0) { gameState.playerHp = 0; gameState.status = 'gameOver'; } 
        else { hero.x = (canvas.width - 130) / 2; hero.y = canvas.height - 80 - 10; hero.isProtected = true; setTimeout(() => hero.isProtected = false, 3000); }
      }
    }
  }

  drawUI();       // Rendu dynamique déporté
  drawGameOver(); // Rendu dynamique déporté
}

// ______________________________________________________________________
// BOUCLE PRINCIPALE (GAME LOOP)
// ______________________________________________________________________
function gameLoop(hrt) { 
  if (!hrt) hrt = performance.now();
  gameState.dt = (hrt - gameState.lastTime) / 1000; gameState.lastTime = hrt;

  if (gameState.status === 'notYetStarted') {
    const divRunPosCurrent = divRun.getBoundingClientRect();
    for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
      let l = gameState.arrayLaser[i];
      if ((l.y < divRunPosCurrent.bottom) && (l.x > divRunPosCurrent.left) && (l.x < divRunPosCurrent.right)) {
        divRun.style.display = 'none'; gameState.status = 'start'; gameState.arrayLaser.splice(i, 1); accudeltaTime = 0; drawExplodeRun = true;
      }
    }
  }

  update(); draw(); window.requestAnimationFrame(gameLoop);
}

window.requestAnimationFrame(gameLoop);

