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
// Ajustement automatique si vous redimensionnez votre navigateur (PC ou Inspecteur)
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // CORRECTION : Si le jeu est lancé, on repositionne le joueur par rapport au nouveau bas de l'écran
  if (typeof hero !== 'undefined') {
    max_x = canvas.width - 65; // Recalcule la limite droite
    
    // Si le jeu n'a pas commencé, on le recentre, sinon on le plaque juste au nouveau bas
    if (gameState.status === 'notYetStarted') {
      hero.x = (canvas.width - 65) / 2;
    }
    hero.y = canvas.height - 40 - 15; // Repositionne le joueur sur le vrai bas de l'écran
  }
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

// --- CORRECTION DU SPAWN DES VAGUES (RÉPARTITION SUR TOUT L'ÉCRAN) ---
function spawnInitialEnemies() {
  gameState.enemies = []; // Vide le tableau global
  
  // On calcule dynamiquement la largeur de l'écran disponible
  // et on espace uniformément les 10 ennemis sur toute la largeur (Canvas.width)
  let spacing = (canvas.width - 100) / 9; // Espace régulier entre chaque ennemi
  let currentX = 50;                      // Point de départ horizontal à gauche
  
  for (let i = 0; i < 10; i++) {
    // Génère une altitude de départ en dents de scie pour créer un effet de vague agréable
    let initialY = -400 - (i % 2 === 0 ? 150 : 0);
    
    gameState.enemies.push(new Enemy(currentX, initialY));
    currentX += spacing; // On décale le prochain ennemi vers la droite de manière régulière
  }
}

// --- LOGIQUE DE REINITIALISATION (RESTART GAME OVER) ---
function resetGame(hero) {
  gameState.score = 0; gameState.playerHp = gameState.maxHp; gameState.arrayLaser = []; gameState.deletedEnemiesPosX = [];
  spawnInitialEnemies(); // Relance la flotte d'ennemis
  hero.x = (canvas.width - 65) / 2; hero.y = canvas.height - 40 - 15; // Repositionne le joueur
  hero.isExploding = false; hero.isProtected = true; // Active le bouclier
  setTimeout(() => hero.isProtected = false, 3000); // 3 secondes d'immunité
  gameState.status = 'start'; // Relance la physique active
}

// --- DESSIN DU BOUTON RUN EN EXPLOSION ---
// --- CORRECTION DE L'EXPLOSION DU BOUTON (LIAISON AVEC L'OBJET ANIM) ---
function drawBoutonExplosion(vars) {
  vars.accudeltaTime += gameState.dt;
  
  // CORRECTION : On utilise bien "vars.explodeX" et "vars.explodeY" reçus de game.js
  // pour que l'explosion soit dessinée exactement au bon endroit au pixel près
  ctx.drawImage(assets.explodeRunBtn, vars.spriteExplodeX, 0, 95, 96, vars.explodeX, vars.explodeY, 200, 200);
  
  if (vars.accudeltaTime > 0.05) { 
    vars.spriteExplodeX += 95; 
    vars.accudeltaTime = 0; 
    if (vars.spriteExplodeX > 1172) { 
      vars.drawExplodeRun = false; 
      gameState.status = 'start'; 
      vars.spriteExplodeX = 0; 
    } 
  }
}
// --- DESSIN DE LA FLOTTE ENNEMIE ET DE LEURS PROYECTILES ---
function drawEnemiesAndTheirLasers() {
  // Dessine les vaisseaux ennemis vivants (Echelle 35x50)
  gameState.enemies.forEach(en => { if (!en.isExploding) ctx.drawImage(assets.imgEnemy, 0, 0, 134, 199, en.x, en.y, 35, 50); });
  // Parcourt et anime l'explosion image par image pour chaque ennemi éliminé (GC inversé)
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    let en = gameState.enemies[i];
    if (en.isExploding) {
      en.accudeltaTime += gameState.dt; ctx.drawImage(assets.explodeRunBtn, en.spriteExplodeX, 0, en.spriteExplodeSingleFrameWidth, 96, en.x, en.y, 60, 60);
      if (en.accudeltaTime > en.spriteExplodeSpeedFrame) {
        en.spriteExplodeCountCurrentFrame++; en.spriteExplodeX += en.spriteExplodeSingleFrameWidth; en.accudeltaTime = 0;
        if (en.spriteExplodeCountCurrentFrame > en.spriteExplodeTotFrame) { gameState.deletedEnemiesPosX.push(en.x); gameState.enemies.splice(i, 1); }
      }
    }
  }
  // Dessine l'ensemble des tirs lasers générés par l'IA ennemie (Echelle 21x36)
  gameState.enemies.forEach(en => { en.laser.forEach(l => ctx.drawImage(assets.imgEnemyLaser, 210, 310, 60, 90, l.x, l.y, 21, 36)); });
}

// --- DESSIN DU HERO (VAISSEAU, BOUCLIER "GET READY" OU MORT CHRONOMETREE) ---
function drawPlayerAndShield(hero, vars) {
  if (!hero.isExploding) {
    if (hero.x !== undefined && hero.y !== undefined && gameState.status !== 'gameOver') ctx.drawImage(assets.spaceship, 0, 0, 170, 102, hero.x, hero.y, 65, 40);
    if (hero.isProtected && gameState.status !== 'gameOver') {
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hero.x + 32, hero.y + 20, 55, 0, 2 * Math.PI); ctx.stroke();
      if (vars.fontSize > 31) vars.fontSize -= 2; ctx.font = `${vars.fontSize}px Comic Sans MS`; ctx.fillStyle = "yellow"; ctx.textAlign = 'center'; ctx.fillText(`GET READY !`, hero.x + 32, hero.y - 20);
    } else { vars.fontSize = 150; }
  } else {
    vars.accudeltaTime += gameState.dt; ctx.drawImage(assets.explodeRunBtn, vars.heroSpriteExplodeX, 0, 95, 96, hero.x, hero.y, 70, 70);
    if (vars.accudeltaTime > 0.1) {
      vars.spriteExplodeCountCurrentFrame++; vars.heroSpriteExplodeX += 95; vars.accudeltaTime = 0;
      if (vars.spriteExplodeCountCurrentFrame > 12) {
        vars.heroSpriteExplodeX = 0; vars.spriteExplodeCountCurrentFrame = 1; hero.isExploding = false;
        if (gameState.playerHp <= 0) { gameState.playerHp = 0; gameState.status = 'gameOver'; } 
        else { hero.x = (canvas.width - 65) / 2; hero.y = canvas.height - 40 - 15; hero.isProtected = true; setTimeout(() => hero.isProtected = false, 3000); }
      }
    }
  }
}

// ======================================================================
// 1. CONFIGURATION INITIALE ET COMPOSANTS DU JOUEUR
// ======================================================================

// Sélection de l'élément HTML contenant le bouton RUN d'accueil
const divRun = document.getElementById("div_run");

// 1. Donnez des coordonnées par défaut dès le départ (au cas où le onload mette du temps)
const hero = { 
  x: window.innerWidth / 2 - 32, 
  y: window.innerHeight - 80, 
  speed: 500, 
  isExploding: false, 
  isProtected: false 
};

// Centralisation de toutes les variables d'animation dans un seul objet partagé (reçu par utils.js)
const anim = { 
  drawExplodeRun: false,                 // Vrai pour enclencher le dessin de l'explosion d'accueil
  explodeX: 0,                           // Coordonnée X de l'explosion (calculée dynamiquement)
  explodeY: 0,                           // Coordonnée Y de l'explosion (calculée dynamiquement)
  spriteExplodeX: 0,                     // Décalage X dans la feuille de sprites pour le bouton RUN
  accudeltaTime: 0,                      // Accumulateur de temps pour la cadence des animations
  heroSpriteExplodeX: 0,                 // Décalage X dans la feuille de sprites pour le vaisseau joueur
  spriteExplodeCountCurrentFrame: 1,     // Frame d'animation actuelle de l'explosion du joueur (max 12)
  fontSize: 150                          // Taille de la police pour l'effet de zoom du "GET READY !"
};

// Variables physiques pour les limites de l'écran et la cadence de tir du joueur
let max_x = window.innerWidth - 65, lastHeroFireTime = -200, coolDownHeroFireTime = 200;

// Initialisation immédiate des modules globaux autonomes (Étoiles, contrôles clavier/tactiles)
initStars(100); 
initControls(); 
spawnInitialEnemies(); // Génération de la première vague d'ennemis répartis sur tout l'écran (voir utils.js)

// 2. Modifiez la fonction de secours pour s'assurer que max_x ne bloque pas le dessin
assets.spaceship.onload = () => { 
  max_x = (canvas.width - 65); 
  // N'écrasez pas hero.x et hero.y si le jeu a déjà commencé à calculer
  if (gameState.status === 'notYetStarted') {
    hero.x = ((canvas.width - 65) / 2); 
    hero.y = (canvas.height - 40 - 15); 
  }
};

// CORRECTION : Écouteur local pour replacer le vaisseau au vrai bas quand l'inspecteur se ferme
window.addEventListener('resize', () => {
  max_x = (canvas.width - 65);
  // Si le jeu n'a pas encore démarré, on garde le vaisseau centré au-dessus du bouton
  if (gameState.status === 'notYetStarted') {
    hero.x = ((canvas.width - 65) / 2);
  }
  // On plaque le vaisseau sur le vrai bas de la fenêtre recalculée
  hero.y = (canvas.height - 40 - 15);
});

// ======================================================================
// 2. ACTION 1 : CLIC DIRECT SUR LE BOUTON D'ACCUEIL (Souris ou Tactile)
// ======================================================================
divRun.addEventListener("click", () => {             
  if (gameState.status === 'notYetStarted') {
    // Calcul de la position de l'explosion exactement centrée sur la boîte HTML du bouton
    const rect = divRun.getBoundingClientRect();
    anim.explodeX = rect.left + (rect.width / 2) - 100; 
    anim.explodeY = rect.top + (rect.height / 2) - 100;
    
    divRun.style.display = 'none'; // Efface le bouton HTML de l'écran
    anim.accudeltaTime = 0; 
    anim.drawExplodeRun = true;    // Enclenche l'animation de dessin de l'explosion dans draw()
  }
});    

// Écouteurs globaux (Clic souris, Tactile smartphone ou barre Espace) pour relancer après un Game Over
[window, 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (gameState.status === 'gameOver') resetGame(hero); }));
window.addEventListener("keydown", (e) => { if (gameState.status === 'gameOver' && e.code === "Space") resetGame(hero); });

// ______________________________________________________________________
// 3. LOGIQUE PHYSIQUE DU JEU (UPDATE) - Calcule uniquement les mouvements
// ______________________________________________________________________
function update() {
  // Si l'état de la partie est en Game Over, on gèle l'ensemble des calculs physiques
  if (gameState.status === 'gameOver') return;

  // Calcul du déplacement latéral du joueur si son vaisseau est vivant
  if (!hero.isExploding) {
    if (inputs.keyLeft) { hero.x -= Math.floor(hero.speed * gameState.dt); if (hero.x < 0) hero.x = 0; }
    if (inputs.keyRight) { hero.x += Math.floor(hero.speed * gameState.dt); if (hero.x > max_x) hero.x = max_x; }
    
    // Logique de tir : vérifie la commande et si le temps de recharge (cooldown) est écoulé
    if (inputs.keySpace && (performance.now() - lastHeroFireTime > coolDownHeroFireTime)) {
      // Centrage parfait du laser sur la nouvelle taille réduite de 65px de large
      gameState.arrayLaser.push(new Laser((hero.x + 65 / 2 - 21), hero.y - 35)); 
      lastHeroFireTime = performance.now(); // Réinitialise le chronomètre pour le prochain tir
    }
  }

  // Déplacement continu de tous les projectiles lasers joueurs actifs
  gameState.arrayLaser.forEach(laser => laser.update());
  
  // Garbage Collector inversé : nettoie de la mémoire les lasers ayant dépassé le haut de l'écran (Y < 0)
  for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) { if (gameState.arrayLaser[i].y < 0) gameState.arrayLaser.splice(i, 1); }

  // Gestion de la logique de combat une fois la partie démarrée
  if (gameState.status === 'start') {
    // Remplacement automatique : maintient en permanence exactement 10 ennemis actifs à l'écran
    while (gameState.enemies.length < 10) {
      let spawnX = gameState.deletedEnemiesPosX.length > 0 ? gameState.deletedEnemiesPosX.shift() : getRandom(50, canvas.width - 50);
      gameState.enemies.push(new Enemy(getRandom(spawnX - 10, spawnX - 10), getRandom(-800, -100)));
    }
    
    // Met à jour les déplacements et tirs autonomes de chaque vaisseau ennemi
    gameState.enemies.forEach(en => en.update(hero.x, hero.isExploding, hero.isProtected));
    
    // Détection déportée des impacts (collisions.js) avec application des dégâts en cas de touche
    checkCollisions(hero, () => { hero.isExploding = true; gameState.playerHp--; }); 
  }
}

// ______________________________________________________________________
// 4. RENDU GRAPHIQUE (DRAW) - Orchestre le dessin sans encombrer le code
// ______________________________________________________________________
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Efface l'intégralité de la frame précédente
  drawStars(); // Dessine votre fond étoilé infini fluide (stars.js)

  // Rendu graphique de l'explosion du bouton d'accueil (corrigé avec liaison de l'objet anim)
  if (anim.drawExplodeRun) drawBoutonExplosion(anim); 
  
  // Dessine la flotte ennemie (vivante ou en explosion) et leurs tirs lasers (utils.js)
  if (gameState.status === 'start' || gameState.status === 'gameOver') drawEnemiesAndTheirLasers(); 

  // Dessine les lasers du joueur à la nouvelle échelle réduite de moitié (21px de large x 36px de haut)
  gameState.arrayLaser.forEach(l => ctx.drawImage(assets.userLaser, 300, 25, 60, 110, l.x, l.y, 21, 36)); 
  
  // Dessine l'état visuel du joueur : vaisseau vivant, bouclier ou boucle d'explosion animée (utils.js)
  drawPlayerAndShield(hero, anim); 

  drawUI();       // Affiche votre score et vos cœurs de vie en haut (ui.js)
  drawGameOver(); // Affiche le grand écran de défaite transparent en cas de mort (ui.js)
}

// ______________________________________________________________________
// 5. ACTION 2 : BOUCLE PRINCIPALE (GAME LOOP) - Delta Time Anti-NaN fluide
// ______________________________________________________________________
function gameLoop(hrt) { 
  if (!hrt) hrt = performance.now();
  // Calcul précis du Delta Time en secondes entre chaque rafraîchissement d'écran
  gameState.dt = (hrt - gameState.lastTime) / 1000; 
  gameState.lastTime = hrt;

  // C'est ICI, dans le cycle continu, qu'on surveille si un de vos lasers traverse le bouton RUN d'accueil
  if (gameState.status === 'notYetStarted') {
    const divRunPosCurrent = divRun.getBoundingClientRect();
    
    for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
      let l = gameState.arrayLaser[i];
      
      // Si les coordonnées de votre tir entrent géométriquement dans la boîte du bouton HTML
      if ((l.y < divRunPosCurrent.bottom) && (l.x > divRunPosCurrent.left) && (l.x < divRunPosCurrent.right)) {
        
        // CORRECTION UNIQUE : Calcul et enregistrement direct dans l'objet "anim"
        // pour que l'explosion soit dessinée par draw() exactement sur le bouton et non à (0,0)
        anim.explodeX = divRunPosCurrent.left + (divRunPosCurrent.width / 2) - 100;
        anim.explodeY = divRunPosCurrent.top + (divRunPosCurrent.height / 2) - 100;
        
        divRun.style.display = 'none';     // Masque le bouton HTML
        gameState.status = 'start';        // Fait basculer le jeu en mode combat actif
        gameState.arrayLaser.splice(i, 1); // Supprime le laser impacté pour le Garbage Collector
        anim.accudeltaTime = 0; 
        anim.drawExplodeRun = true;        // Autorise le dessin de l'explosion centrée
      }
    }
  }

  update(); // Exécute les calculs physiques
  draw();   // Exécute les rendus visuels
  window.requestAnimationFrame(gameLoop); // Relance automatiquement le cycle à la frame suivante
}

// Lancement initial officiel du moteur de jeu
window.requestAnimationFrame(gameLoop);

