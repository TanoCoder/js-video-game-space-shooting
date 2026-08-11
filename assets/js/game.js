// --- INITIALISATION DU CANVAS ---
const canvas = document.getElementById("canvas"); // Utilise l'ID "canvas" de votre HTML
const ctx = canvas.getContext("2d"); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ajustement automatique si vous redimensionnez votre navigateur
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- ÉTAT GLOBAL DU JEU (FUSIONNÉ) ---
const gameState = {
  status: 'notYetStarted',        // 'notYetStarted', 'playing', ou 'gameOver'
  dt: 0,
  lastTime: performance.now(),
  
  // Tableaux de jeu (Garbage Collector inversé)
  arrayLaser: [],                // Vos tirs lasers joueur
  enemies: [],                   // Vos vagues d'ennemis (max 10)
  deletedEnemiesPosX: [],        // Vos positions d'ennemis supprimés
  enemyLasers: [],               // À utiliser pour les tirs de l'IA ennemie
  
  // Nouveau système de Statistiques & PV
  score: 0,
  playerHp: 3,
  maxHp: 3,
  
  // Gestion du bouclier "GET READY !" au respawn
  isPlayerInvulnerable: true     
};

// --- CHARGEMENT DES ASSETS GRAPHIQUES ---
const assets = {
  explodeRunBtn: new Image(),
  spaceship: new Image(),
  userLaser: new Image(),
  imgEnemy: new Image(),
  imgEnemyLaser: new Image()
};

// Chemins des images (Strictement en minuscules)
assets.explodeRunBtn.src = "assets/img/explode.png";  
assets.spaceship.src = "assets/img/hero.png";  
assets.userLaser.src = "assets/img/beams.png"; 
assets.imgEnemy.src = "assets/img/enemy.png"; 
assets.imgEnemyLaser.src = "assets/img/beams.png";

// --- FONCTIONS UTILITAIRES ---
function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let stars = [];

function initStars(count = 100) {
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height
    });
  }
}

function drawStars() {
  ctx.fillStyle = "white";
  stars.forEach(s => ctx.fillRect(s.x, s.y, 1, 1));
}

// État des entrées partagé avec le jeu
const inputs = {
  keyLeft: false,
  keyRight: false,
  keySpace: false
};

let touchLeftId = null;
let touchRightId = null;

function initControls() {
  // --- CLAVIER (PC) ---
  window.addEventListener("keydown", e => {
    if (e.key == " ") inputs.keySpace = true;
    if (e.key == "ArrowRight") inputs.keyRight = true; 
    if (e.key == "ArrowLeft") inputs.keyLeft = true;
  });

  window.addEventListener("keyup", e => {
    if (e.key == " ") inputs.keySpace = false; 
    if (e.key == "ArrowRight") inputs.keyRight = false;
    if (e.key == "ArrowLeft") inputs.keyLeft = false;
  });

  // --- TACTILE (SMARTPHONE) ---
  window.addEventListener("touchstart", e => {
    if (e.target.id === "canvas") {
      e.preventDefault();
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      let touch = e.changedTouches[i];
      
      if (gameState.status === 'start') {
        inputs.keySpace = true;
      }

      if (touch.clientX < window.innerWidth / 2) {
        inputs.keyLeft = true;
        touchLeftId = touch.identifier; 
      } else {
        inputs.keyRight = true;
        touchRightId = touch.identifier; 
      }
    }
  }, { passive: false });

  window.addEventListener("touchend", e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      let touch = e.changedTouches[i];

      if (touch.identifier === touchLeftId) {
        inputs.keyLeft = false;
        touchLeftId = null;
      }
      if (touch.identifier === touchRightId) {
        inputs.keyRight = false;
        touchRightId = null;
      }
    }

    if (e.touches.length === 0) {
      inputs.keySpace = false;
    }
  });

  window.addEventListener("touchcancel", () => {
    inputs.keyLeft = false;
    inputs.keyRight = false;
    inputs.keySpace = false;
    touchLeftId = null;
    touchRightId = null;
  });
}

class Laser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 600;
  }

  update() {
    this.y -= Math.floor(this.speed * gameState.dt);
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;   
    this.speed = 200;  
    this.isExploding = false;  
    
    this.spriteExplodeX = 190;
    this.spriteExplodeTotFrame = 10;
    this.spriteExplodeCountCurrentFrame = 3;
    this.spriteExplodeSingleFrameWidth = 95;
    this.spriteExplodeSpeedFrame = 0.1;    
    this.accudeltaTime = 0;
    
    this.laser = []; 
    this.laserSpeed = 500;
    this.coolDownMs = 500;
    this.accuDt = 0;    
  }

  update(heroX, heroIsExploding, heroIsProtected) {
    this.y += (this.speed * gameState.dt);   
    if (this.y > canvas.height) {
      this.y = getRandom(-1000, -120);
    }

    if (heroX === undefined || heroX === null) return;

    if ((this.x >= heroX - 70) && (this.x <= heroX + 100)) {
      if ((this.accuDt > this.coolDownMs / 1000) && (this.y > 0) && (!this.isExploding) && (!heroIsExploding) && (!heroIsProtected)) {
        this.laser.push({ x: this.x + (70 / 2) - 15, y: this.y + 100 - 10 });
        this.accuDt = 0;
      } else {
        this.accuDt += gameState.dt;
      }
    }

    this.laser.forEach((l) => {               
      l.y += this.laserSpeed * gameState.dt;               
    });
  }
}

function checkCollisions(hero, onHeroHit) {
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

function drawUI() {
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

function drawGameOver() {
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

