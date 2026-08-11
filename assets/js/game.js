// --- 1. CONFIGURATION DU CANVAS GRAPHIQUE ---
// Récupération de l'élément HTML <canvas> par son ID unique
const canvas = document.getElementById("canvas");
// Activation du contexte de dessin en 2D pour pouvoir dessiner dessus
const ctx = canvas.getContext("2d"); 

// Redimensionnement initial du Canvas à la largeur totale de la fenêtre du navigateur
canvas.width = window.innerWidth;
// Redimensionnement initial du Canvas à la hauteur totale de la fenêtre du navigateur
canvas.height = window.innerHeight;

// Ajustement automatique de la taille du Canvas si vous redimensionnez votre navigateur (PC ou Mobile)
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- 2. OBJET GLOBAL DE MÉMOIRE PARTAGÉE (GAME STATE) ---
// Centralise toutes les informations du jeu accessibles par tous vos fichiers sans import/export
const gameState = {
  status: 'notYetStarted',     // États possibles : 'notYetStarted', 'start', ou 'gameOver'
  dt: 0,                       // Delta Time pour synchroniser les vitesses physiques du jeu
  lastTime: performance.now(), // Stocke le timestamp précis de la frame précédente
  arrayLaser: [],              // Tableau contenant tous les lasers actifs tirés par le joueur
  enemies: [],                 // Tableau contenant les vagues d'ennemis actifs (maximum 10)
  deletedEnemiesPosX: [],      // Garbage Collector : mémorise les colonnes des ennemis détruits
  score: 0,                    // Score actuel du joueur (augmente de 100 par élimination)
  playerHp: 3,                 // Points de vie (HP) actuels du joueur
  maxHp: 3                     // Points de vie (HP) maximaux (pour l'affichage des cœurs noirs)
};

// --- 3. CHARGEMENT ET CONFIGURATION DES ASSETS GRAPHIQUES ---
// Déclaration de l'objet contenant toutes les instances d'images en mémoire
const assets = {
  explodeRunBtn: new Image(),
  spaceship: new Image(),
  userLaser: new Image(),
  imgEnemy: new Image(),
  imgEnemyLaser: new Image()
};

// Définition des chemins des fichiers physiques (strictement en minuscules pour Linux/GitHub)
assets.explodeRunBtn.src = "assets/img/explode.png";  
assets.spaceship.src = "assets/img/hero.png";  
assets.userLaser.src = "assets/img/beams.png"; 
assets.imgEnemy.src = "assets/img/enemy.png"; 
assets.imgEnemyLaser.src = "assets/img/beams.png";

// --- 4. FONCTION UTILITAIRE GÉNÉRALE ---
// Génère un nombre entier aléatoire compris entre une valeur minimale et une valeur maximale
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

// Fonction principale globale qui effectue la détection de tous les impacts du jeu
function checkCollisions(hero, onHeroHit) {
  // Si le jeu est en mode Game Over, on bloque immédiatement la logique physique des dégâts
  if (gameState.status === 'gameOver') return;

  // Parcours du tableau complet des ennemis actifs
  gameState.enemies.forEach(en => {
    // On calcule l'impact uniquement si l'ennemi n'est pas déjà en train d'exploser
    if (!en.isExploding) {
      
      // ==================================================================
      // A. COLLISION : Lasers Joueur contre Vaisseau Ennemi
      // ==================================================================
      // La méthode .filter() nettoie le tableau des lasers en supprimant celui qui touche un ennemi
      gameState.arrayLaser = gameState.arrayLaser.filter(laser => {
        // Hitbox Ennemi ajustée à sa nouvelle échelle réduite (35px de large x 50px de haut)
        let hit = (laser.x >= en.x - 10) && 
                  (laser.x <= en.x + 35) && 
                  (laser.y <= en.y + 50) && 
                  (laser.y >= en.y);
        
        if (hit) {
          en.isExploding = true;  // Déclenche l'animation visuelle de destruction de l'ennemi
          gameState.score += 100; // Ajoute les points au score global du joueur
        }
        return !hit; // Conserve le laser dans le tableau uniquement s'il n'a pas touché l'ennemi
      });

      // ==================================================================
      // B. COLLISION : Lasers Ennemis contre Vaisseau Joueur
      // ==================================================================
      en.laser.forEach(l => {
        // Le joueur ignore l'impact s'il explose déjà ou s'il est sous bouclier "GET READY !"
        if (!hero.isExploding && !hero.isProtected) {
          // Hitbox Joueur ajustée à sa nouvelle échelle réduite (65px de large x 40px de haut)
          if ((l.x >= hero.x - 10) && 
              (l.x <= hero.x + 65) && 
              (l.y <= hero.y + 40) && 
              (l.y >= hero.y)) {
            onHeroHit(); // Déclenche le callback (perte de PV + explosion) défini dans game.js
          }
        }
      });

      // ==================================================================
      // C. COLLISION : Corps à corps (Vaisseau Ennemi contre Vaisseau Joueur)
      // ==================================================================
      if (!hero.isExploding && !hero.isProtected) {
        // Vérification géométrique de collision directe entre les deux boîtes réduites (65x40 et 35x50)
        if (hero.x <= en.x + 35 && 
            hero.x + 65 >= en.x && 
            hero.y <= en.y + 50 && 
            hero.y + 40 >= en.y) {
          en.isExploding = true; // L'ennemi se désintègre sur le coup
          onHeroHit();           // Le joueur subit les dégâts et explose immédiatement
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

// --- 1. CONFIGURATION INITIALE ET COMPOSANTS DU JEU ---
const divRun = document.getElementById("div_run");
const hero = { x: window.innerWidth / 2 - 32, y: window.innerHeight - 80, speed: 500, isExploding: false, isProtected: false };
const anim = { drawExplodeRun: false, explodeX: 0, explodeY: 0, spriteExplodeX: 0, accudeltaTime: 0, heroSpriteExplodeX: 0, spriteExplodeCountCurrentFrame: 1, fontSize: 150 };
let max_x = window.innerWidth - 65, lastHeroFireTime = -200, coolDownHeroFireTime = 200;

// Initialisations et spawn de la première vague masquée
initStars(100); initControls(); spawnInitialEnemies();
assets.spaceship.onload = () => { max_x = (canvas.width - 65); hero.x = ((canvas.width - 65) / 2); hero.y = (canvas.height - 40 - 15); };

// Événement d'ouverture et démarrage au clic sur RUN
divRun.addEventListener("click", () => {             
  if (gameState.status === 'notYetStarted') {
    const rect = divRun.getBoundingClientRect();
    anim.explodeX = rect.left + (rect.width / 2) - 100; anim.explodeY = rect.top + (rect.height / 2) - 100;
    divRun.style.display = 'none'; anim.accudeltaTime = 0; anim.drawExplodeRun = true;
  }
});    

// Écouteurs de réinitialisation si l'état est en Game Over
[window, 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (gameState.status === 'gameOver') resetGame(hero); }));
window.addEventListener("keydown", (e) => { if (gameState.status === 'gameOver' && e.code === "Space") resetGame(hero); });

// ______________________________________________________________________
// LOGIQUE PHYSIQUE (UPDATE)
// ______________________________________________________________________
function update() {
  if (gameState.status === 'gameOver') return;

  // Calcul du déplacement du vaisseau joueur (Clavier/Tactile)
  if (!hero.isExploding) {
    if (inputs.keyLeft) { hero.x -= Math.floor(hero.speed * gameState.dt); if (hero.x < 0) hero.x = 0; }
    if (inputs.keyRight) { hero.x += Math.floor(hero.speed * gameState.dt); if (hero.x > max_x) hero.x = max_x; }
    if (inputs.keySpace && (performance.now() - lastHeroFireTime > coolDownHeroFireTime)) {
      gameState.arrayLaser.push(new Laser((hero.x + 65 / 2 - 21), hero.y - 35)); lastHeroFireTime = performance.now();
    }
  }

  // Déplacement et nettoyage automatique des tirs du joueur (Garbage Collector)
  gameState.arrayLaser.forEach(laser => laser.update());
  for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) { if (gameState.arrayLaser[i].y < 0) gameState.arrayLaser.splice(i, 1); }

  // Gestion des vagues de combat actives
  if (gameState.status === 'start') {
    while (gameState.enemies.length < 10) {
      let spawnX = gameState.deletedEnemiesPosX.length > 0 ? gameState.deletedEnemiesPosX.shift() : getRandom(50, canvas.width - 50);
      gameState.enemies.push(new Enemy(getRandom(spawnX - 10, spawnX - 10), getRandom(-800, -100)));
    }
    gameState.enemies.forEach(en => en.update(hero.x, hero.isExploding, hero.isProtected));
    checkCollisions(hero, () => { hero.isExploding = true; gameState.playerHp--; }); // Détection déportée
  }
}

// ______________________________________________________________________
// RENDU GRAPHIQUE (DRAW)
// ______________________________________________________________________
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); drawStars();

  if (anim.drawExplodeRun) drawBoutonExplosion(anim); // Gère l'explosion du RUN d'accueil
  if (gameState.status === 'start' || gameState.status === 'gameOver') drawEnemiesAndTheirLasers(); // Dessine les ennemis

  gameState.arrayLaser.forEach(l => ctx.drawImage(assets.userLaser, 300, 25, 60, 110, l.x, l.y, 21, 36)); // Dessine les lasers joueur
  drawPlayerAndShield(hero, anim); // Dessine le joueur et son bouclier

  drawUI(); drawGameOver(); // Dessine l'interface textuelle déportée
}

// ______________________________________________________________________
// BOUCLE PRINCIPALE (GAME LOOP)
// ______________________________________________________________________
function gameLoop(hrt) { 
  if (!hrt) hrt = performance.now();
  gameState.dt = (hrt - gameState.lastTime) / 1000; gameState.lastTime = hrt;

  // Permet de faire exploser le bouton RUN en tirant dessus à l'accueil
  if (gameState.status === 'notYetStarted') {
    const divRunPosCurrent = divRun.getBoundingClientRect();
    for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
      let l = gameState.arrayLaser[i];
      if ((l.y < divRunPosCurrent.bottom) && (l.x > divRunPosCurrent.left) && (l.x < divRunPosCurrent.right)) {
        divRun.style.display = 'none'; gameState.status = 'start'; gameState.arrayLaser.splice(i, 1); anim.accudeltaTime = 0; anim.drawExplodeRun = true;
      }
    }
  }

  update(); draw(); window.requestAnimationFrame(gameLoop);
}
window.requestAnimationFrame(gameLoop); // Lancement de la boucle

