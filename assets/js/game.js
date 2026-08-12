// Initialisation globale unique de l'arborescence graphique Canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d"); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// Objet global partagé contenant le nouveau drapeau booléen de suivi de la pause
const gameState = {
  status: 'notYetStarted',
  dt: 0,
  lastTime: performance.now(),
  arrayLaser: [],
  enemies: [],
  deletedEnemiesPosX: [],
  score: 0,
  playerHp: 3,
  maxHp: 3,
  
  // --- INJECTION DE LA VARIABLE PAUSE ---
  // Faux par défaut, passera à vrai si le joueur lève le jeu en pause
  isPaused: false
};

// Chargement et pré-configuration de l'ensemble des images
const assets = {
  explodeRunBtn: new Image(),
  spaceship: new Image(),
  userLaser: new Image(),
  imgEnemy: new Image(),
  imgEnemyLaser: new Image()
};

assets.explodeRunBtn.src = "assets/img/explode.png";  
assets.spaceship.src = "assets/img/hero.png";  
assets.userLaser.src = "assets/img/beams.png"; 
assets.imgEnemy.src = "assets/img/enemy.png"; 
assets.imgEnemyLaser.src = "assets/img/beams.png";

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

// --- ÉTAT DES ENTRÉES PHYSIQUES PARTAGÉ AVEC L'ENSEMBLE DU JEU ---
const inputs = {
  keyLeft: false,
  keyRight: false,
  keySpace: false
};

// Mémorisation des identifiants des doigts pour le multi-touch mobile
let touchLeftId = null;
let touchRightId = null;

function initControls() {
  // ======================================================================
  // A. INTERCEPTION DES COMMANDES CLAVIER (PC)
  // ======================================================================
  window.addEventListener("keydown", e => {
    // Si le joueur enfonce la touche P (minuscule ou majuscule)
    // et que le jeu a commencé (ou est déjà en pause), on inverse le booléen
    if (e.key === "p" || e.key === "P") {
      if (gameState.status === 'start' || gameState.isPaused) {
        gameState.isPaused = !gameState.isPaused; // Vrai devient Faux, Faux devient Vrai
      }
    }
    
    // Commandes classiques de déplacements et de tirs sur PC
    if (e.key == " ") inputs.keySpace = true;
    if (e.key == "ArrowRight") inputs.keyRight = true; 
    if (e.key == "ArrowLeft") inputs.keyLeft = true;
  });

  window.addEventListener("keyup", e => {
    if (e.key == " ") inputs.keySpace = false; 
    if (e.key == "ArrowRight") inputs.keyRight = false;
    if (e.key == "ArrowLeft") inputs.keyLeft = false;
  });

  // ======================================================================
  // B. INTERCEPTION DES COMMANDES TACTILES (SMARTPHONE)
  // ======================================================================
  window.addEventListener("touchstart", e => {
    // Évite le zoom ou les comportements natifs parasites du navigateur mobile sur le Canvas
    if (e.target.id === "canvas") { e.preventDefault(); }

    // Analyse de chaque point de contact tactile posé sur l'écran
    for (let i = 0; i < e.changedTouches.length; i++) {
      let touch = e.changedTouches[i];
      
      // --- ERGONOMIE MOBILE : ZONE TACTILE DE PAUSE ÉLARGIE ---
      // On calcule dynamiquement 15% de la hauteur totale de l'écran actuel.
      // Cela offre un couloir réactif large d'environ 120px à 150px, idéal pour le pouce.
      let pauseZoneHeight = window.innerHeight * 0.15;

      // Si le doigt touche cette zone supérieure et que la partie est active/suspendue
      if (touch.clientY < pauseZoneHeight && (gameState.status === 'start' || gameState.isPaused)) {
        gameState.isPaused = !gameState.isPaused; // Enclenche ou retire le gel du jeu
        return; // Interrompt la fonction immédiatement pour éviter d'appliquer un déplacement au joueur
      }

      // Si le jeu est en cours ou à l'accueil, toucher l'écran arme le tir automatique continu
      if (gameState.status === 'start' || gameState.status === 'notYetStarted') {
        inputs.keySpace = true;
      }

      // Gestion des déplacements : scission de la largeur de l'écran en deux zones égales
      if (touch.clientX < window.innerWidth / 2) {
        inputs.keyLeft = true; 
        touchLeftId = touch.identifier; // Mémorise le doigt qui gère la marche à gauche
      } else {
        inputs.keyRight = true; 
        touchRightId = touch.identifier; // Mémorise le doigt qui gère la marche à droite
      }
    }
  }, { passive: false });

  // Arrêt physique des mouvements dès que le joueur retire ses doigts de l'écran tactile
  window.addEventListener("touchend", e => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      let touch = e.changedTouches[i];
      
      // Si le doigt qui quitte l'écran est celui de gauche, on arrête d'aller à gauche
      if (touch.identifier === touchLeftId) { inputs.keyLeft = false; touchLeftId = null; }
      // Si le doigt qui quitte l'écran est celui de droite, on arrête d'aller à droite
      if (touch.identifier === touchRightId) { inputs.keyRight = false; touchRightId = null; }
    }
    
    // Sécurité : s'il n'y a plus aucun doigt posé sur l'écran, on coupe proprement le tir automatique
    if (e.touches.length === 0) { inputs.keySpace = false; }
  });

  // Sécurité système : réinitialise tout si le tactile est coupé par une alerte (ex: SMS, appel entrant)
  window.addEventListener("touchcancel", () => {
    inputs.keyLeft = false; inputs.keyRight = false; inputs.keySpace = false;
    touchLeftId = null; touchRightId = null;
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

// ======================================================================
// 1. RENDU DE L'INTERFACE DE JEU VISUELLE (SCORE, PAUSE ET VIE)
// ======================================================================
function drawUI() {
  // On n'affiche l'interface que si la partie est active, en pause ou en Game Over
  if (gameState.status !== 'start' && gameState.status !== 'gameOver' && gameState.status !== 'paused') return;

  ctx.save(); // Sécurise les réglages graphiques du Canvas
  ctx.fillStyle = "#ffffff"; // Choix de la couleur blanche pour les textes
  ctx.font = "bold 20px 'Courier New', monospace"; // Style de police rétro typé arcade
  
  // --- A. AFFICHAGE DU SCORE (HAUT À GAUCHE) ---
  ctx.textAlign = "left"; // Alignement du texte calé vers la gauche
  // .padStart(6, '0') force l'affichage sur 6 chiffres (ex: 000100) pour le style arcade
  ctx.fillText(`SCORE: ${String(gameState.score).padStart(6, '0')}`, 20, 40);
  
  // --- B. INDICATEUR DE PAUSE DÉPORTÉ (HAUT AU MILIEU) ---
  // On n'affiche l'indicateur d'aide que si le jeu est en cours et PAS déjà en pause
  if (!gameState.isPaused && gameState.status === 'start') {
    ctx.save(); // Sauvegarde locale pour appliquer un style discret à ce texte
    ctx.textAlign = "center"; // Alignement parfaitement centré au milieu horizontal de l'écran
    // Blanc translucide (40% d'opacité) pour ne pas gêner la visibilité des combats spatiaux
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; 
    ctx.font = "14px 'Courier New', monospace"; // Taille de police légèrement plus petite pour le design
    // Dessin du texte d'aide sur la même ligne verticale que le score et les PV (Y = 40)
    ctx.fillText("Touch here to PAUSE", canvas.width / 2, 40); 
    ctx.restore(); // Restaure le style blanc opaque pour la suite
  }

  // --- C. AFFICHAGE DES POINTS DE VIE (HAUT À DROITE) ---
  ctx.textAlign = "right"; // Alignement du texte calé vers la droite de l'écran
  // Génère la chaîne de cœurs : rouges pour les PV restants, noirs pour les perdus
  const hearts = "❤️".repeat(gameState.playerHp) + "🖤".repeat(gameState.maxHp - gameState.playerHp);
  ctx.fillText(`HP: ${hearts}`, canvas.width - 20, 40); // Dessin calé sur la même ligne (Y = 40)
  
  ctx.restore(); // Restaure l'état d'origine du Canvas
}

// ======================================================================
// 2. RENDU DE L'ÉCRAN DE FIN DE PARTIE (GAME OVER)
// ======================================================================
function drawGameOver() {
  if (gameState.status !== 'gameOver') return;

  ctx.save();
  // Fond noir opaque à 85% pour masquer l'action du jeu en arrière-plan
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

// ======================================================================
// 3. RENDU DE L'ÉCRAN DE PAUSE
// ======================================================================
function drawPauseScreen() {
  if (!gameState.isPaused) return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "orange";
  ctx.font = "bold 50px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillText("Appuyez sur P ou touchez le haut de l'écran pour reprendre", canvas.width / 2, canvas.height / 2 + 40);
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
// 1. INITIALISATION DE LA STRUCTURE DU JOUEUR ET DES COMPOSANTS
// ======================================================================
const divRun = document.getElementById("div_run");

// Définition de l'objet joueur avec ses coordonnées à échelle réduite (65x40)
const hero = { 
  x: window.innerWidth / 2 - 32, 
  y: window.innerHeight - 80, 
  speed: 500, 
  isExploding: false, 
  isProtected: false 
};

// Centralisation des variables techniques gérant l'animation du Canvas
const anim = { 
  drawExplodeRun: false, 
  explodeX: 0, 
  explodeY: 0, 
  spriteExplodeX: 0, 
  accudeltaTime: 0, 
  heroSpriteExplodeX: 0, 
  spriteExplodeCountCurrentFrame: 1, 
  fontSize: 150 
};

// Déclarations des limites latérales de déplacement et du cooldown de tir
let max_x = window.innerWidth - 65, lastHeroFireTime = -200, coolDownHeroFireTime = 200;

// Initialisations immédiates des modules autonomes
initStars(100); 
initControls(); 
spawnInitialEnemies(); // Spawn caché initial de la vague de départ (voir utils.js)

// Recalcul du centrage et de la limite droite dès que le vaisseau est chargé en mémoire
assets.spaceship.onload = () => { 
  max_x = (canvas.width - 65); 
  hero.x = ((canvas.width - 65) / 2); 
  hero.y = (canvas.height - 40 - 15); 
};

// Réajustement dynamique de la position du joueur si la fenêtre change de taille (Fermeture inspecteur)
window.addEventListener('resize', () => {
  max_x = (canvas.width - 65);
  if (gameState.status === 'notYetStarted') { hero.x = ((canvas.width - 65) / 2); }
  hero.y = (canvas.height - 40 - 15); // Re-plaque le joueur sur le vrai bas de la fenêtre
});

// Événement d'activation visuelle au clic direct sur le bouton HTML RUN
divRun.addEventListener("click", () => {             
  if (gameState.status === 'notYetStarted') {
    const rect = divRun.getBoundingClientRect();
    anim.explodeX = rect.left + (rect.width / 2) - 100; anim.explodeY = rect.top + (rect.height / 2) - 100;
    divRun.style.display = 'none'; anim.accudeltaTime = 0; anim.drawExplodeRun = true;
  }
});    

// Écouteurs de réinitialisation physique si l'état est en mode Game Over
[window, 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (gameState.status === 'gameOver') resetGame(hero); }));
window.addEventListener("keydown", (e) => { if (gameState.status === 'gameOver' && e.code === "Space") resetGame(hero); });

// ______________________________________________________________________
// 2. LOGIQUE PHYSIQUE DU MOTEUR (UPDATE)
// ______________________________________________________________________
function update() {
  if (gameState.status === 'gameOver') return;
  
  // --- SÉCURITÉ PAUSE ---
  // Si le booléen de pause est activé, on fige immédiatement tous les calculs physiques
  // (Les positions s'arrêtent net, aucun mouvement ni tir n'est calculé)
  if (gameState.isPaused) return;

  // Calcul du déplacement horizontal du vaisseau joueur (Clavier PC ou Tactile Smartphone)
  if (!hero.isExploding) {
    if (inputs.keyLeft) { hero.x -= Math.floor(hero.speed * gameState.dt); if (hero.x < 0) hero.x = 0; }
    if (inputs.keyRight) { hero.x += Math.floor(hero.speed * gameState.dt); if (hero.x > max_x) hero.x = max_x; }
    
    // Logique d'injection d'un projectile laser joueur s'il fait feu et que le cooldown est prêt
    if (inputs.keySpace && (performance.now() - lastHeroFireTime > coolDownHeroFireTime)) {
      gameState.arrayLaser.push(new Laser((hero.x + 65 / 2 - 21), hero.y - 35)); 
      lastHeroFireTime = performance.now();
    }
  }

  // Déplacement fluide de tous les tirs lasers actifs du joueur
  gameState.arrayLaser.forEach(laser => laser.update());
  // Garbage Collector inversé : nettoie de la mémoire les lasers hors-écran du haut (Y < 0)
  for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) { if (gameState.arrayLaser[i].y < 0) gameState.arrayLaser.splice(i, 1); }

  // Maintien actif et gestion de la flotte d'ennemis
  if (gameState.status === 'start') {
    while (gameState.enemies.length < 10) {
      let spawnX = gameState.deletedEnemiesPosX.length > 0 ? gameState.deletedEnemiesPosX.shift() : getRandom(50, canvas.width - 50);
      gameState.enemies.push(new Enemy(getRandom(spawnX - 10, spawnX - 10), getRandom(-800, -100)));
    }
    gameState.enemies.forEach(en => en.update(hero.x, hero.isExploding, hero.isProtected));
    
    // Détection déportée des impacts physiques géométriques (voir collisions.js)
    checkCollisions(hero, () => { hero.isExploding = true; gameState.playerHp--; }); 
  }
}

// ______________________________________________________________________
// 3. LOGIQUE GRAPHISME DE RENDU (DRAW)
// ______________________________________________________________________
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Nettoyage de la frame précédente
  drawStars(); // Rendu du fond d'étoiles infini (stars.js)

  if (anim.drawExplodeRun) drawBoutonExplosion(anim); // Gère le sprite d'explosion du bouton d'accueil
  
  // On continue de dessiner les ennemis même en mode Pause pour qu'ils ne disparaissent pas de l'écran !
  if (gameState.status === 'start' || gameState.status === 'gameOver' || gameState.isPaused) {
    drawEnemiesAndTheirLasers(); 
  }

  // Dessin des lasers du joueur réduits de moitié (21px x 36px)
  gameState.arrayLaser.forEach(l => ctx.drawImage(assets.userLaser, 300, 25, 60, 110, l.x, l.y, 21, 36)); 
  
  drawPlayerAndShield(hero, anim); // Dessin du vaisseau, du texte zoomé jaune ou de son explosion

  drawUI();       // Rendu dynamique du score et des PV (ui.js)
  drawGameOver(); // Rendu dynamique de l'écran rouge de fin (ui.js)
  
  // --- RENDU PAUSE ---
  // On appelle la fonction de dessin de la pause en dernier pour qu'elle s'affiche au-dessus de tout le monde
  drawPauseScreen(); 
}

// ______________________________________________________________________
// 4. BOUCLE DE LOGIQUE PRINCIPALE CYCLIQUE (GAME LOOP)
// ______________________________________________________________________
function gameLoop(hrt) { 
  if (!hrt) hrt = performance.now();
  
  // --- ADAPTATION CRITIQUE DU TIMING EN PAUSE ---
  // Si le jeu est en pause, on force le Delta Time à zéro pour stopper les mouvements physiques.
  // Cependant, on continue de mettre à jour la variable "lastTime" avec la valeur "hrt".
  // Pourquoi ? Pour éviter que le chronomètre interne calcule un énorme décalage invisible
  // pendant que vous étiez en pause, ce qui ferait se téléporter les ennemis au redémarrage !
  if (gameState.isPaused) {
    gameState.dt = 0;
    gameState.lastTime = hrt;
  } else {
    gameState.dt = (hrt - gameState.lastTime) / 1000; 
    gameState.lastTime = hrt;
  }

  // Physique d'accueil : permet de détruire le bouton RUN en lui tirant dessus avec un laser
  if (gameState.status === 'notYetStarted') {
    const divRunPosCurrent = divRun.getBoundingClientRect();
    for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
      let l = gameState.arrayLaser[i];
      if ((l.y < divRunPosCurrent.bottom) && (l.x > divRunPosCurrent.left) && (l.x < divRunPosCurrent.right)) {
        anim.explodeX = divRunPosCurrent.left + (divRunPosCurrent.width / 2) - 100;
        anim.explodeY = divRunPosCurrent.top + (divRunPosCurrent.height / 2) - 100;
        divRun.style.display = 'none'; gameState.status = 'start'; gameState.arrayLaser.splice(i, 1); anim.accudeltaTime = 0; anim.drawExplodeRun = true;
      }
    }
  }

  update(); draw(); window.requestAnimationFrame(gameLoop); // Relance le cycle au prochain rafraîchissement
}
window.requestAnimationFrame(gameLoop); // Initialisation de départ du moteur de jeu

