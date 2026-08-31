// 1. Fondations
// config.js et utils.js

// --- 1. CONFIGURATION DU CANVAS GRAPHIQUE ---
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d"); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- 2. OBJET GLOBAL DE MÉMOIRE PARTAGÉE (GAME STATE) ---
const gameState = {
  status: 'notYetStarted',     
  dt: 0,                       
  lastTime: performance.now(), 
  arrayLaser: [],              // Lasers du joueur
  enemies: [],                 
  deletedEnemiesPosX: [],      
  
  // CORRECTION CRITIQUE : Tableau autonome pour les lasers des ennemis
  enemyLasers: [],
  score: 0,
  highScore: localStorage.getItem("spaceShooterHighScore") ? parseInt(localStorage.getItem("spaceShooterHighScore")) : 0,
  playerHp: 3,                 
  maxHp: 3,                    
  isPaused: false,             
  
  // NOUVEAUTÉ : Le son est désactivé (Muet) par défaut au lancement du jeu
  isMuted: true,

  // Tailles dynamiques des vaisseaux (Dimensions de départ pour Smartphone)
  playerWidth: 65,
  playerHeight: 40,
  enemyWidth: 35,
  enemyHeight: 50
};

// --- LOGIQUE MOBILE-FIRST / RESPONSIVE SCALING ---
if (window.innerWidth >= 1024) {
  gameState.playerWidth = 100;  
  gameState.playerHeight = 60;
  gameState.enemyWidth = 55;    
  gameState.enemyHeight = 80;
}

// Recalcul automatique lors du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  if (window.innerWidth >= 1024) {
    gameState.playerWidth = 100; gameState.playerHeight = 60;
    gameState.enemyWidth = 55; gameState.enemyHeight = 80;
  } else {
    gameState.playerWidth = 65; gameState.playerHeight = 40;
    gameState.enemyWidth = 35; gameState.enemyHeight = 50;
  }
});

// --- 3. PRÉCHARGEMENT DE TOUTES LES IMAGES ---
const assets = {
  explodeRunBtn: new Image(),
  spaceship: new Image(),      
  spaceshipLeft: new Image(),  
  spaceshipRight: new Image(), 
  userLaser: new Image(),
  imgEnemy: new Image(),
  imgEnemyLaser: new Image()
};

assets.explodeRunBtn.src = "assets/img/explode.png";  
assets.spaceship.src = "assets/img/hero.png";  
assets.spaceshipLeft.src = "assets/img/spaceship-turn-30-deg-left.png";   
assets.spaceshipRight.src = "assets/img/spaceship-turn-30-deg-right.png"; 
assets.userLaser.src = "assets/img/beams.png"; 
assets.imgEnemy.src = "assets/img/enemy.png"; 
assets.imgEnemyLaser.src = "assets/img/beams.png";

// --- 4. FONCTION UTILITAIRE GÉNÉRALE ---
function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 1. Fondations
// config.js et utils.js

// ======================================================================
// 1. SPAWN DES VAGUES D'ENNEMIS (RÉPARTITION UNIFORME DE DÉPART)
// ======================================================================
function spawnInitialEnemies() {
  gameState.enemies = []; // Remise à zéro complète du tableau global
  
  // Calcul de l'écart horizontal pour étaler les 10 ennemis sur toute la largeur
  let spacing = (canvas.width - 120) / 9; 
  let currentX = 50; // Marge de sécurité initiale sur le bord gauche                 
  
  for (let i = 0; i < 10; i++) {
    // Génère des altitudes décalées en dents de scie pour créer un effet de flotte
    let initialY = -400 - (i % 2 === 0 ? 150 : 0);
    gameState.enemies.push(new Enemy(currentX, initialY));
    currentX += spacing; // Décale le curseur vers la droite pour le prochain ennemi
  }
}

// ======================================================================
// 2. RÉINITIALISATION PHYSIQUE (RESTART APRÈS UN GAME OVER)
// ======================================================================
function resetGame(hero) {
  gameState.enemyLasers = [];
  gameState.score = 0; 
  gameState.playerHp = gameState.maxHp; 
  gameState.arrayLaser = []; 
  gameState.deletedEnemiesPosX = [];
  
  spawnInitialEnemies(); // Recrée une nouvelle flotte d'ennemis propre
  
  // Recentrage du vaisseau par rapport à la largeur active de l'écran (PC ou Mobile)
  hero.x = (canvas.width - gameState.playerWidth) / 2; 
  
  // Hauteur de sécurité remuée pour laisser de l'espace en bas de l'écran
  hero.y = canvas.height - gameState.playerHeight - 30;
  
  hero.isExploding = false; 
  hero.isProtected = true; // Réarme temporairement le bouclier protecteur jaune
  anim.fontSize = 150;     // Réinitialise la taille du texte d'effet GET READY !
  
  // Supprime l'immunité du bouclier après 3 secondes de jeu
  setTimeout(() => hero.isProtected = false, 3000);
  gameState.status = 'start'; // Relance le moteur de combat actif
}

// ======================================================================
// 3. RENDU GRAPHISME DE L'EXPLOSION DU BOUTON ACCUEIL START
// ======================================================================
function drawBoutonExplosion(vars) {
  vars.accudeltaTime += gameState.dt; // Accumule le temps écoulé
  // Dessine la frame actuelle de l'explosion du bouton d'accueil
  ctx.drawImage(assets.explodeRunBtn, vars.spriteExplodeX, 0, 95, 96, vars.explodeX, vars.explodeY, 200, 200);
  
  // Cadence d'animation : change de sprite toutes les 0.05 secondes
  if (vars.accudeltaTime > 0.05) { 
    vars.spriteExplodeX += 95; 
    vars.accudeltaTime = 0; 
    // Si on dépasse la fin de la feuille de sprites (1172px), on arrête l'animation et on démarre le jeu
    if (vars.spriteExplodeX > 1172) { 
      vars.drawExplodeRun = false; 
      gameState.status = 'start'; 
      vars.spriteExplodeX = 0; 
    } 
  }
}

// ======================================================================
// 4. RENDU DE LA FLOTTE ENNEMIE ET DE LEURS PROJECTILES DYNAMIQUES
// ======================================================================
function drawEnemiesAndTheirLasers() {
  // Dessin des extraterrestres vivants à leur échelle active (35x50 ou 55x80)
  gameState.enemies.forEach(en => { 
    if (!en.isExploding) ctx.drawImage(assets.imgEnemy, 0, 0, 134, 199, en.x, en.y, gameState.enemyWidth, gameState.enemyHeight); 
  });
  
  // Animation frame par frame de l'explosion des cibles touchées par le joueur
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    let en = gameState.enemies[i];
    if (en.isExploding) {
      en.accudeltaTime += gameState.dt; 
      ctx.drawImage(assets.explodeRunBtn, en.spriteExplodeX, 0, en.spriteExplodeSingleFrameWidth, 96, en.x, en.y, gameState.enemyWidth + 20, gameState.enemyWidth + 20);
      
      if (en.accudeltaTime > en.spriteExplodeSpeedFrame) {
        en.spriteExplodeCountCurrentFrame++; 
        en.spriteExplodeX += en.spriteExplodeSingleFrameWidth; 
        en.accudeltaTime = 0;
        
        // Dès que l'explosion se termine, on retire l'ennemi. Ses lasers ne disparaissent plus !
        if (en.spriteExplodeCountCurrentFrame > en.spriteExplodeTotFrame) { 
          gameState.deletedEnemiesPosX.push(en.x); 
          gameState.enemies.splice(i, 1); 
        }
      }
    }
  }
  
  // CORRECTION RENDU : Dessin des lasers ennemis globaux et indépendants
  let lW = window.innerWidth >= 1024 ? 30 : 21;
  let lH = window.innerWidth >= 1024 ? 50 : 36;
  gameState.enemyLasers.forEach(l => { 
    ctx.drawImage(assets.imgEnemyLaser, 210, 310, 60, 90, l.x, l.y, lW, lH); 
  });
}

// ======================================================================
// 5. RENDU DU HÉROS AVEC LOGIQUE D'INCLINAISON ET ZOOMS PROPORTIONNELS
// ======================================================================
function drawPlayerAndShield(hero, vars) {
  if (!hero.isExploding) {
    if (hero.x !== undefined && hero.y !== undefined && gameState.status !== 'gameOver') {
      
      let currentSpaceshipImg = assets.spaceship; 
      
      // Configuration par défaut de la taille de dessin (100% de l'échelle calculée)
      let drawWidth = gameState.playerWidth;
      let drawHeight = gameState.playerHeight;
      let offsetX = 0;
      let offsetY = 0;

      // CORRECTION DU RÉTRÉCISSEMENT : Si on tourne, on applique un bonus de zoom de 30%
      // pour compenser le vide transparent présent dans vos fichiers d'images d'inclinaison.
      if (inputs.keyLeft) {
        currentSpaceshipImg = assets.spaceshipLeft;
        drawWidth = gameState.playerWidth * 1.3;
        drawHeight = gameState.playerHeight * 1.3;
        // On décale de quelques pixels pour que le pivotement reste bien centré sur l'axe du vaisseau
        offsetX = -(gameState.playerWidth * 0.15);
        offsetY = -(gameState.playerHeight * 0.15);
      } else if (inputs.keyRight) {
        currentSpaceshipImg = assets.spaceshipRight;
        drawWidth = gameState.playerWidth * 1.3;
        drawHeight = gameState.playerHeight * 1.3;
        offsetX = -(gameState.playerWidth * 0.15);
        offsetY = -(gameState.playerHeight * 0.15);
      }
      
      // Dessin automatique sans coupure avec compensation de zoom dynamique
      ctx.drawImage(currentSpaceshipImg, hero.x + offsetX, hero.y + offsetY, drawWidth, drawHeight);
    }
    
    // Rendu visuel du cercle de bouclier jaune et animation du texte GET READY !
    if (hero.isProtected && gameState.status !== 'gameOver') {
      let radius = window.innerWidth >= 1024 ? 75 : 55; // Rayon adapté à la taille de l'écran
      ctx.strokeStyle = 'yellow'; ctx.lineWidth = 2; ctx.beginPath(); 
      ctx.arc(hero.x + (gameState.playerWidth / 2), hero.y + (gameState.playerHeight / 2), radius, 0, 2 * Math.PI); ctx.stroke();
      
      if (vars.fontSize > 31) vars.fontSize -= 2; ctx.font = `${vars.fontSize}px Comic Sans MS`; ctx.fillStyle = "yellow"; ctx.textAlign = 'center'; 
      ctx.fillText(`GET READY !`, hero.x + (gameState.playerWidth / 2), hero.y - 20);
    } else { vars.fontSize = 150; }
  } else {
    // Animation frame par frame de la destruction du joueur (Taille proportionnelle)
    let size = window.innerWidth >= 1024 ? 110 : 70;
    vars.accudeltaTime += gameState.dt; 
    ctx.drawImage(assets.explodeRunBtn, vars.heroSpriteExplodeX, 0, 95, 96, hero.x, hero.y, size, size);
    
    if (vars.accudeltaTime > 0.1) {
      vars.spriteExplodeCountCurrentFrame++; 
      vars.heroSpriteExplodeX += 95; 
      vars.accudeltaTime = 0;
      
      if (vars.spriteExplodeCountCurrentFrame > 12) {
        vars.heroSpriteExplodeX = 0; 
        vars.spriteExplodeCountCurrentFrame = 1; 
        hero.isExploding = false; // Arrête la boucle de destruction
        
        // --- COPIER / COLLER ICI : LOGIQUE DE FIN DE PARTIE CORRIGÉE AVEC LE HIGH SCORE ---
        if (gameState.playerHp <= 0) { 
          gameState.playerHp = 0; 
          gameState.status = 'gameOver'; // Déclenche l'écran de défaite définitif
          
          // Sauvegarde automatique du record si le score actuel bat l'ancien record
          if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem("spaceShooterHighScore", gameState.highScore);
            console.log("Nouveau record enregistré : " + gameState.highScore);
          }
        } else { 
          // S'il reste des vies, réapparition sécurisée au centre à la hauteur corrigée
          hero.x = (canvas.width - gameState.playerWidth) / 2; 
          hero.y = canvas.height - gameState.playerHeight - 30;
          hero.isProtected = true;
          setTimeout(() => hero.isProtected = false, 3000);
        }
      }
    }
  }
}

// 2. Entrées et Environnement
// controls.js, sound.js et stars.js

const inputs = {
  keyLeft: false,
  keyRight: false,
  keySpace: false,
  touchX: null,
  startX: 0,   // 👈 AJOUTÉ : Position d'origine du vaisseau au clic
  targetX: null // 👈 AJOUTÉ : Position calculée que le vaisseau doit atteindre
};

// On retire les anciennes variables touchLeftId et touchRightId devenues inutiles
let activePointerId = null; 

// ======================================================================
// FONCTION DE MISE À JOUR VISUELLE DU BOUTON HTML DE SON
// ======================================================================
function updateSoundButtonUI() {
  const soundDiv = document.getElementById("div_sound");
  const soundText = document.getElementById("sound_text");
  if (!soundDiv || !soundText) return;

  let isTactile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  if (gameState.isMuted) {
    soundDiv.style.color = "#ff3333"; 
    if (window.innerWidth >= 1024) {
      soundText.innerText = isTactile ? "🔇 Press M, Touch or Click to turn SOUND ON" : "🔇 Press M or Click Mouse to turn SOUND ON";
      soundText.style.fontSize = "15px"; 
    } else {
      soundText.innerText = "🔇";
      soundText.style.fontSize = "32px"; 
    }
  } else {
    soundDiv.style.color = "orange"; 
    if (window.innerWidth >= 1024) {
      soundText.innerText = isTactile ? "🔊 Press M, Touch or Click to MUTE" : "🔊 Press M or Click Mouse to MUTE";
      soundText.style.fontSize = "15px";
    } else {
      soundText.innerText = "🔊";
      soundText.style.fontSize = "32px";
    }
  }
}

function initControls() {
  updateSoundButtonUI();

  // ======================================================================
  // ECOUTEUR DU BOUTON DE SON
  // ======================================================================
  const soundDiv = document.getElementById("div_sound");
  if (soundDiv) {
    soundDiv.addEventListener("click", (e) => {
      e.stopPropagation(); 
      gameState.isMuted = !gameState.isMuted;
      if (typeof initAudioContext === "function") {
        initAudioContext();
      }
      updateSoundButtonUI();
    });
  }

  // ====================================================================
  // ECOUTEUR DU BOUTON START (Modifié pour supporter le test local direct)
  // ======================================================================
  const startButton = document.getElementById('div_run');
  if (startButton) {
    startButton.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); // Évite que le clic ne déclenche un tir de laser immédiat

        // 1. Débloquer le son sur mobile (Sécurité des navigateurs)
        if (window.AudioContext || window.webkitAudioContext) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }
        
        // 2. Appel sécurisé : si la fonction est déjà prête, on l'exécute.
        // Sinon, on attend 50ms pour laisser le temps à game.js de finir son chargement.
        if (typeof startGame === 'function') {
            startGame();
        } else {
            setTimeout(() => {
                if (typeof startGame === 'function') startGame();
            }, 50);
        }
    });
  }

  // ======================================================================
  // A. INTERCEPTION DES COMMANDES CLAVIER (PC)
  // ======================================================================
  window.addEventListener("keydown", e => {
    if (e.key === "p" || e.key === "P") {
      if (gameState.status === 'start' || gameState.isPaused) {
        gameState.isPaused = !gameState.isPaused;
      }
    }
    if (e.key === "m" || e.key === "M") {
      gameState.isMuted = !gameState.isMuted;
      updateSoundButtonUI(); 
    }
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
  // B. INTERCEPTION DES CLICS ET TACTILES POINTERDOWN (PC / MOBILE)
  // ======================================================================
  window.addEventListener("pointerdown", e => {
    if (e.target.id === "div_sound" || e.target.id === "sound_text") return;

    let screenCenter = window.innerWidth / 2;
    let screenMiddleY = window.innerHeight / 2;

    // --- PAUSE EN COMBAT ---
    if (!gameState.isPaused && gameState.status === 'start') {
      let isTouchInPauseX = (e.clientX > screenCenter - 100) && (e.clientX < screenCenter + 100);
      let isTouchInPauseY = (e.clientY > 30) && (e.clientY < 90); 

      if (isTouchInPauseX && isTouchInPauseY) {
        gameState.isPaused = true;
        canvas.style.cursor = "default"; 
        return;
      }
    }

    // --- REPRISE DE LA PAUSE AU CENTRE ---
    else if (gameState.isPaused) {
      let isTouchInCenterX = (e.clientX > screenCenter - 150) && (e.clientX < screenCenter + 150);
      let isTouchInCenterY = (e.clientY > screenMiddleY - 80) && (e.clientY < screenMiddleY + 80);

      if (isTouchInCenterX && isTouchInCenterY) {
        gameState.isPaused = false; 
        canvas.style.cursor = "default"; 
        return;
      }
      return; 
    }

    // --- CORRECTION DÉPLACEMENT RELATIF GLOBAAL ---
    if (gameState.status !== 'gameOver' && !gameState.isPaused) {
      activePointerId = e.pointerId;
      inputs.touchX = e.clientX;   // On mémorise le point de départ du doigt
      inputs.startX = hero.x;       // On mémorise la position actuelle du vaisseau
      inputs.targetX = hero.x;      // Au clic initial, la cible est le vaisseau lui-même
      inputs.keySpace = true;       // Déclenche le tir automatique
    }
  });

  window.addEventListener("pointerup", e => {
    if (e.pointerId === activePointerId) {
      inputs.touchX = null;
      inputs.targetX = null;        // On nettoie la cible relative
      inputs.keySpace = false; 
      activePointerId = null;
    }
  });

  window.addEventListener("pointercancel", e => {
    if (e.pointerId === activePointerId) {
      inputs.touchX = null;
      inputs.targetX = null;
      inputs.keySpace = false;
      activePointerId = null;
    }
  });

   // ======================================================================
  // C. SUIVI DU MOUVEMENT (PC SURVOL SOURIS & MOBILE GLISSEMENT DOIGT)
  // ======================================================================
  window.addEventListener("pointermove", e => {
    let screenCenter = window.innerWidth / 2;
    let screenMiddleY = window.innerHeight / 2;

    // 1. Si un doigt est posé et glisse (Mouvement relatif)
    if (gameState.status !== 'gameOver' && !gameState.isPaused && e.pointerId === activePointerId) {
      if (e.cancelable) e.preventDefault(); 
      
      // On calcule l'écart parcouru par le doigt depuis le clic initial
      let deltaX = e.clientX - inputs.touchX;
      
      // La nouvelle cible du vaisseau est sa position d'origine + le mouvement du doigt
      inputs.targetX = inputs.startX + deltaX;
    }

    // 2. Gestion visuelle des curseurs de survol de la pause (Uniquement sur PC)
    if (window.innerWidth < 1024) return;

    if (gameState.isPaused) {
      let isHoverInCenterX = (e.clientX > screenCenter - 150) && (e.clientX < screenCenter + 150);
      let isHoverInCenterY = (e.clientY > screenMiddleY - 80) && (e.clientY < screenMiddleY + 80);

      if (isHoverInCenterX && isHoverInCenterY) {
        canvas.style.cursor = "pointer"; 
      } else {
        canvas.style.cursor = "default"; 
      }
    }
    else if (!gameState.isPaused && gameState.status === 'start') {
      let isHoverInPauseX = (e.clientX > screenCenter - 100) && (e.clientX < screenCenter + 100);
      let isHoverInPauseY = (e.clientY > 30) && (e.clientY < 90);

      if (isHoverInPauseX && isHoverInPauseY) {
        canvas.style.cursor = "pointer"; 
      } else {
        canvas.style.cursor = "default"; 
      }
    } else {
      canvas.style.cursor = "default";
    }
  });

  window.addEventListener("pointerup", e => {
    if (e.pointerId === activePointerId) {
      inputs.touchX = null; // Le joueur lève le doigt, on arrête de suivre la position
      inputs.keySpace = false; // On arrête de tirer
      activePointerId = null;
    }
  });

  window.addEventListener("pointercancel", e => {
    if (e.pointerId === activePointerId) {
      inputs.touchX = null;
      inputs.keySpace = false;
      activePointerId = null;
    }
  });  

}

// 2. Entrées et Environnement
// controls.js, sound.js et stars.js

// ======================================================================
// MODULE AUDIO RETRO (SYNTHÉTISEUR ET MIXAGE SECURISE MOBILE ATTÉNUÉ)
// ======================================================================

let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Déverrouillage automatique au tout premier tapotement mobile
['click', 'touchend', 'keydown'].forEach(eventName => {
  window.addEventListener(eventName, () => {
    initAudioContext();
    if (audioCtx && audioCtx.state !== 'suspended') {
      const dummyOsc = audioCtx.createOscillator();
      const dummyGain = audioCtx.createGain();
      dummyGain.gain.setValueAtTime(0, audioCtx.currentTime);
      dummyOsc.connect(dummyGain);
      dummyGain.connect(audioCtx.destination);
      dummyOsc.start();
      dummyOsc.stop(audioCtx.currentTime + 0.01);
    }
  }, { once: true });
});

// --- LOGIQUE MULTI-PLATEFORME ATTENUÉE ---
// CORRECTION VOLUME : Le coefficient mobile passe à 0.15 (15%) pour calmer enfin l'iPhone 8 !
function getVolumeScale() {
  return (window.innerWidth < 1024) ? 0.15 : 1.0;
}

// --- 1. BRUITAGE : TIR DE LASER JOUEUR ---
function playLaserSound() {
  if (gameState.isMuted) return;
  initAudioContext(); if (!audioCtx || audioCtx.state === 'suspended') return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'triangle'; 
  osc.frequency.setValueAtTime(1100, now); 
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.12); 

  let finalVolume = 0.04 * getVolumeScale();
  gainNode.gain.setValueAtTime(finalVolume, now); 
  gainNode.gain.linearRampToValueAtTime(0, now + 0.12); 

  osc.connect(gainNode); gainNode.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.12);
}

// --- 2. BRUITAGE : EXPLOSION ENNEMIE ---
function playExplosionSound() {
  if (gameState.isMuted) return;
  initAudioContext(); if (!audioCtx || audioCtx.state === 'suspended') return;

  const now = audioCtx.currentTime;
  const duration = 0.35; 

  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
  
  const noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(2500, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(50, now + duration);
  
  const noiseGain = audioCtx.createGain();
  let finalNoiseVol = 0.45 * getVolumeScale(); 
  noiseGain.gain.setValueAtTime(finalNoiseVol, now);
  noiseGain.gain.linearRampToValueAtTime(0, now + duration);
  
  noiseNode.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);

  const bassOsc = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  
  bassOsc.type = 'triangle'; 
  bassOsc.frequency.setValueAtTime(100, now); 
  bassOsc.frequency.linearRampToValueAtTime(15, now + duration); 

  let finalBassVol = 0.65 * getVolumeScale(); 
  bassGain.gain.setValueAtTime(finalBassVol, now); 
  bassGain.gain.linearRampToValueAtTime(0, now + duration);
  
  bassOsc.connect(bassGain); bassGain.connect(audioCtx.destination);

  noiseNode.start(now); noiseNode.stop(now + duration);
  bassOsc.start(now); bassOsc.stop(now + duration);
}

// --- 3. BRUITAGE : TIR DE LASER ENNEMI ---
function playEnemyLaserSound() {
  if (gameState.isMuted) return;
  initAudioContext(); if (!audioCtx || audioCtx.state === 'suspended') return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'square'; 
  osc.frequency.setValueAtTime(800, now); 
  osc.frequency.linearRampToValueAtTime(250, now + 0.1); 

  let finalVolume = 0.04 * getVolumeScale();
  gainNode.gain.setValueAtTime(finalVolume, now); 
  gainNode.gain.linearRampToValueAtTime(0, now + 0.1); 

  osc.connect(gainNode); gainNode.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + 0.1);
}

// --- 4. BRUITAGE : EXPLOSION DU JOUEUR ---
function playPlayerExplosionSound() {
  if (gameState.isMuted) return;
  initAudioContext(); if (!audioCtx || audioCtx.state === 'suspended') return;

  const now = audioCtx.currentTime;
  const duration = 0.65; 

  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
  
  const noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(2500, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(50, now + duration);
  
  const noiseGain = audioCtx.createGain();
  let finalNoiseVol = 0.7 * getVolumeScale();
  noiseGain.gain.setValueAtTime(finalNoiseVol, now);
  noiseGain.gain.linearRampToValueAtTime(0, now + duration);
  
  noiseNode.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(audioCtx.destination);

  const bassOsc = audioCtx.createOscillator();
  const bassGain = audioCtx.createGain();
  
  bassOsc.type = 'triangle'; 
  bassOsc.frequency.setValueAtTime(90, now);
  bassOsc.frequency.linearRampToValueAtTime(10, now + duration);

  let finalBassVol = 0.9 * getVolumeScale();
  bassGain.gain.setValueAtTime(finalBassVol, now); 
  bassGain.gain.linearRampToValueAtTime(0, now + duration);
  
  bassOsc.connect(bassGain); bassGain.connect(audioCtx.destination);

  noiseNode.start(now); noiseNode.stop(now + duration);
  bassOsc.start(now); bassOsc.stop(now + duration);
}

// 2. Entrées et Environnement
// controls.js, sound.js et stars.js

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

// 3. Entités et Physique
// laser.js, enemy.js, collisions.js, physics.js, render.je et ui.js

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

// 3. Entités et Physique
// laser.js, enemy.js, collisions.js, physics.js, render.je et ui.js

// ======================================================================
// CLASSE ENNEMI (LOGIQUE UNIQUE ET IA DES VAISSEAUX)
// ======================================================================
class Enemy {
  constructor(x, y) {
    // Coordonnées de départ reçues lors du spawn
    this.x = x;
    this.y = y;
    
    // Échelle dynamique calculée par config.js (35x50 sur Mobile ou 55x80 sur PC)
    this.width = gameState.enemyWidth;  
    this.height = gameState.enemyHeight; 
    
    // REGLAGE DE VITESSE NERVEUX : Initialisé à 300 pixels par seconde pour du challenge direct !
    this.speed = 175;         
    
    this.isExploding = false; // Passe à vrai dès qu'un laser joueur le touche
    this.laser = [];          // Tableau local contenant les projectiles tirés par cet ennemi
    
    // Variables techniques de gestion pour l'animation d'explosion (Feuille de 12 frames)
    this.accudeltaTime = 0;
    this.spriteExplodeX = 0;
    this.spriteExplodeSingleFrameWidth = 95;
    this.spriteExplodeSpeedFrame = 0.05;
    this.spriteExplodeCountCurrentFrame = 1;
    this.spriteExplodeTotFrame = 12;
  }
  
  // Méthode de mise à jour appelée en boucle 60 fois par seconde par le moteur (game.js)
  update(heroX, heroIsExploding, heroIsProtected) {
    
    // Si l'ennemi est déjà touché et explose, on fige sa descente et on coupe son arme
    if (this.isExploding) return;

    // --- 1. LOGIQUE DE LA DIFFICULTÉ PROGRESSIVE (DESCENTE) ---
    // Calcul du bonus de vélocité : +20 pixels par seconde à chaque tranche de 1000 points.
    let currentDifficultyBonus = Math.floor(gameState.score / 1000) * 20;
    let dynamicSpeed = this.speed + currentDifficultyBonus;

    // LIMITE DE SÉCURITÉ (CAP) : Vitesse maximale bloquée à 450px/s pour que ce soit jouable
    let maxEnemySpeed = 450;
    dynamicSpeed = Math.min(dynamicSpeed, maxEnemySpeed);

    // Déplacement vertical fluide basé sur le Delta Time
    this.y += dynamicSpeed * gameState.dt;

    // --- 2. INTELLIGENCE ARTIFICIELLE DE TIR (IA) ---
    // L'ennemi ne fait feu que s'il est entré dans l'écran (Y > 0) et si le joueur n'est pas mort
    if (this.y > 0 && !heroIsExploding) {
      
      // Cadence de tir aléatoire de base (0.5% de chance par frame), boostée par le score
      let shootChance = 0.005 + (Math.floor(gameState.score / 1000) * 0.001);
      
      // On vérifie qu'il n'y a pas déjà trop de lasers ennemis à l'écran globalement (max 6)
      if (Math.random() < shootChance && gameState.enemyLasers.length < 6) {
        
        // Calcul pour centrer parfaitement l'apparition du laser sous l'ennemi
        let laserSpawnX = this.x + (this.width / 2) - 10; // 10px = Moitié de la largeur active
        let laserSpawnY = this.y + this.height; // Émis depuis la base active du vaisseau alien
        
        // INJECTION CRITIQUE : Ajout direct dans le grand tableau mondial autonome
        gameState.enemyLasers.push({ x: laserSpawnX, y: laserSpawnY });
        
        // INTÉGRATION BRUITAGE : Déclenche le son de tir alien !
        playEnemyLaserSound(); 
      }
    }

    // --- 3. RECYCLAGE AUTOMATIQUE (BORD INFERIEUR) ---
    // Si l'ennemi réussit à passer sans mourir, il est replacé tout en haut avec sécurité anti-bords
    if (this.y > window.innerHeight) {
      this.y = -100;
      let minX = 60;
      let maxX = window.innerWidth - gameState.enemyWidth - 60;
      this.x = getRandom(minX, maxX);
    }
  }
 
}

// 3. Entités et Physique
// laser.js, enemy.js, collisions.js, physics.js, render.je et ui.js

// ======================================================================
// 1. RENDU DE L'INTERFACE DE JEU VISUELLE (SCORE ET VIE)
// ======================================================================
function drawUI() {
  const soundDiv = document.getElementById("div_sound");
  
  // GESTION SIMPLE ET CENTRÉE DU BOUTON DE SON HTML (UNIFIÉE PC/MOBILE)
  if (soundDiv) {
    if (gameState.status === 'gameOver' || gameState.isPaused) {
      soundDiv.style.display = 'none'; // Cache le bouton pendant la pause ou le Game Over
    } else {
      soundDiv.style.display = 'flex'; // Visible à l'accueil et en jeu
      
      // ALIGNEMENT UNIFIÉ : Toujours centré à 50% au milieu de l'écran horizontalement !
      soundDiv.style.left = "50%";
      soundDiv.style.transform = "translateX(-50%)";
      soundDiv.style.justifyContent = "center"; // Aligne le texte pile au milieu de sa boîte HTML
      
      // CONFIGURATION RESPONSIVE : ADAPTATION PC (1 SEULE LIGNE DES LE DEBUT)
      if (window.innerWidth >= 1024) {
        // --- SUR PC ---
        soundDiv.style.width = "600px"; 
        if (gameState.status === 'start') {
          soundDiv.style.top = "70px"; // En jeu sur PC, sous la pause
        } else {
          soundDiv.style.top = "95px"; // À l'accueil sur PC
        }
      } else {
        // --- SUR MOBILE / TABLETTE ---
        soundDiv.style.top = "105px";
        soundDiv.style.width = "50px"; // Petit bouton circulaire compact
      }
    }
  }

  // On n'affiche le score et les PV que si la partie a commencé, est en pause ou en Game Over
  if (gameState.status !== 'start' && gameState.status !== 'gameOver' && gameState.status !== 'paused') return;

  ctx.save(); 
  ctx.fillStyle = "#ffffff"; 
  ctx.font = "bold 20px 'Courier New', monospace"; 
  
  // --- A. SCORE ET MEILLEUR SCORE (HAUT À GAUCHE) ---
  ctx.textAlign = "left"; 
  ctx.fillText(`SCORE: ${String(gameState.score).padStart(6, '0')}`, 20, 40);
  
  // AJOUT MEILLEUR SCORE EN JEU : Affiché en jaune juste sous le score actuel (à la ligne 65)
  ctx.fillStyle = "#ffcc00";
  ctx.fillText(`HI-SCORE: ${String(gameState.highScore).padStart(6, '0')}`, 20, 65);
  ctx.fillStyle = "#ffffff"; // On remet en blanc pour le reste
  
  // --- B. POINTS DE VIE / HP (HAUT À DROITE) ---
  ctx.textAlign = "right"; 
  const hearts = "❤️".repeat(gameState.playerHp) + "🖤".repeat(gameState.maxHp - gameState.playerHp);
  ctx.fillText(`HP: ${hearts}`, canvas.width - 20, 40); 

  // --- C. INDICATEUR DE PAUSE CENTRALE ADAPTATIF PC/MOBILE ---
  if (!gameState.isPaused && gameState.status === 'start') {
    ctx.save(); 
    ctx.textAlign = "center"; 
    
    if (window.innerWidth >= 1024) {
      // --- VISUEL PC ---
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; 
      ctx.font = "14px 'Courier New', monospace"; 
      ctx.fillText("Press P to PAUSE", canvas.width / 2, 40); // Ligne 1 au milieu
    } else {
      // --- VISUEL MOBILE ÉPURÉ ---
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; 
      ctx.font = "bold 32px 'Courier New', monospace"; 
      ctx.fillText("PAUSE", canvas.width / 2, 75); 
    }
    ctx.restore(); 
  }
  
  ctx.restore(); 
}

// ======================================================================
// 2. RENDU DE L'ÉCRAN DE FIN DE PARTIE (GAME OVER)
// ======================================================================
function drawGameOver() {
  if (gameState.status !== 'gameOver') return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "#ff3333";
  ctx.font = "bold 50px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 60); // Remonté un peu pour faire de la place
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px 'Courier New', monospace";
  ctx.fillText("Tap screen or press SPACE to RESTART", canvas.width / 2, canvas.height / 2);
  
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "22px 'Courier New', monospace";
  ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 50);
  
  // AJOUT MEILLEUR SCORE SUR L'ÉCRAN GAME OVER : Affiché en jaune sous le score final
  ctx.fillStyle = "#ffcc00";
  ctx.fillText(`Best Score: ${gameState.highScore}`, canvas.width / 2, canvas.height / 2 + 90);
  
  ctx.restore();
}

// ======================================================================
// 3. RENDU DE L'ÉCRAN DE PAUSE GRAPHIQUE
// ======================================================================
function drawPauseScreen() {
  if (!gameState.isPaused) return;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; // Un poil plus sombre pour faire ressortir le texte orange
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "orange";
  ctx.font = "bold 50px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2); // Écrit pile au milieu de l'écran
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px 'Courier New', monospace";
  
  let isTactile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  
  // CORRECTION CONFORME TEXTE : "Touch PAUSE to resume" au lieu de "Touch center..."
  let resumeMessage = "Touch PAUSE to resume";
  
  if (window.innerWidth >= 1024) {
    if (isTactile) {
      resumeMessage = "Press P or touch PAUSE to resume";
    } else {
      resumeMessage = "Press P to resume";
    }
  }
  
  ctx.fillText(resumeMessage, canvas.width / 2, canvas.height / 2 + 40);
  ctx.restore();
}

// 3. Entités et Physique
// laser.js, enemy.js, collisions.js, physics.js, render.je et ui.js

// Fonction globale de calcul géométrique des boîtes d'impacts actifs
function checkCollisions(hero, onHeroHit) {
  if (gameState.status === 'gameOver') return;

  // ==================================================================
  // 1. COLLISIONS LIÉES AUX ENNEMIS (Boucle sur chaque vaisseau)
  // ==================================================================
  gameState.enemies.forEach(en => {
    
    // A. COLLISION : Lasers Joueur contre Vaisseau Ennemi
    if (!en.isExploding) {
      gameState.arrayLaser = gameState.arrayLaser.filter(laser => {
        let hit = (laser.x >= en.x - 10) && 
                  (laser.x <= en.x + gameState.enemyWidth + 10) && 
                  (laser.y <= en.y + gameState.enemyHeight) && 
                  (laser.y >= en.y);
        if (hit) {
          en.isExploding = true;
          gameState.score += 100;
          playExplosionSound(); 
        }
        return !hit;
      });
    }

    // C. COLLISION : Corps à corps (Vaisseau contre Vaisseau)
    if (!en.isExploding && !hero.isExploding && !hero.isProtected) {
      if (hero.x <= en.x + gameState.enemyWidth && 
          hero.x + gameState.playerWidth >= en.x && 
          hero.y <= en.y + gameState.enemyHeight && 
          hero.y + gameState.playerHeight >= en.y) {
        en.isExploding = true;
        onHeroHit();
        playPlayerExplosionSound(); 
      }
    }
  });

  // ==================================================================
  // 2. CORRECTION CRITIQUE (B) : Lasers Ennemis contre Vaisseau Joueur
  // ==================================================================
  // SORTI DE LA BOUCLE ENNEMIE : On utilise le tableau global autonome
  if (gameState.enemyLasers && gameState.enemyLasers.length > 0) {
    gameState.enemyLasers = gameState.enemyLasers.filter(l => {
      let hitHero = false;

      if (!hero.isExploding && !hero.isProtected) {
        if ((l.x >= hero.x - 10) && 
            (l.x <= hero.x + gameState.playerWidth) && 
            (l.y <= hero.y + gameState.playerHeight) && 
            (l.y >= hero.y)) {
          
          hitHero = true; // Le laser a percuté le joueur !
          onHeroHit();    // Déclenche l'explosion du joueur et retire 1 HP
          playPlayerExplosionSound(); 
        }
      }

      // On ne garde dans le tableau que les lasers qui n'ont PAS touché le joueur
      return !hitHero;
    });
  }
}

// 3. Entités et Physique
// laser.js, enemy.js, collisions.js, physics.js, render.je et ui.js

//______________________________________________________________________
// LOGIQUE PHYSIQUE DU JEU (UPDATE)
// ______________________________________________________________________
function update() {
  if (gameState.status === 'gameOver') return;
  if (gameState.isPaused) return;
  
  // Déplacement horizontal du joueur (Clavier PC ou Tactile Smartphone via cible relative)
  if (!hero.isExploding) {
    if (inputs.touchX !== null && inputs.targetX !== null) {
      // Le vaisseau glisse en douceur vers la cible calculée par le touchpad
      // On utilise 0.35 pour un amorti (Lerp) très agréable et pro
      hero.x += (inputs.targetX - hero.x) * 0.35; 
      
      // Sécurité stricte des bordures physiques de l'écran
      if (hero.x < 0) hero.x = 0;
      if (hero.x > max_x) hero.x = max_x;
    } else {
      // PILOTAGE PC CLASSIQUE : Touches fléchées
      if (inputs.keyLeft) { hero.x -= Math.floor(hero.speed * gameState.dt); if (hero.x < 0) hero.x = 0; }
      if (inputs.keyRight) { hero.x += Math.floor(hero.speed * gameState.dt); if (hero.x > max_x) hero.x = max_x; }
    }
    
    // TIR AUTOMATIQUE : On autorise le tir en jeu ET sur l'écran d'accueil
    // --- B. AUTOMATIC SHOOTING SYSTEM ---
    let currentTime = performance.now();
    
    // CORRECTION PC : À l'accueil, on tire si on glisse/clique (touchX) OU si on presse Espace (keySpace)
    let shouldFireAtHome = (gameState.status === 'notYetStarted' && (inputs.touchX !== null || inputs.keySpace));
    let shouldFireInGame = (gameState.status === 'start');

    if ((shouldFireInGame || shouldFireAtHome) && (currentTime - lastHeroFireTime > coolDownHeroFireTime)) {
      gameState.arrayLaser.push(new Laser((hero.x + gameState.playerWidth / 2 - 21), hero.y - 35)); 
      lastHeroFireTime = currentTime;
      playLaserSound(); 
    }    
  }

  // Déplacement de tous les projectiles lasers actifs du joueur
  gameState.arrayLaser.forEach(laser => laser.update());
  // Garbage Collector : Supprime de la mémoire les tirs hors-écran
  for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) { if (gameState.arrayLaser[i].y < 0) gameState.arrayLaser.splice(i, 1); }

  // --- MISE À JOUR DES LASERS ENNEMIS GLOBAUX ---
  if (gameState.status === 'start') {
    let currentDifficultyBonus = Math.floor(gameState.score / 1000) * 20;
    let currentEnemySpeed = 175 + currentDifficultyBonus; 
    currentEnemySpeed = Math.min(currentEnemySpeed, 450); // Cap de vitesse max synchro avec enemy.js
    
    let dynamicLaserSpeed = currentEnemySpeed + 225; // Le tir va toujours plus vite que l'ennemi

    gameState.enemyLasers.forEach(l => {
      l.y += Math.floor(dynamicLaserSpeed * gameState.dt); 
    });

    for (let i = gameState.enemyLasers.length - 1; i >= 0; i--) {
      if (gameState.enemyLasers[i].y > window.innerHeight) {
        gameState.enemyLasers.splice(i, 1);
      }
    }
  }

  // Maintien actif et gestion de la flotte d'ennemis
  if (gameState.status === 'start') {
    while (gameState.enemies.length < 10) {
      let spawnX = gameState.deletedEnemiesPosX.length > 0 ? gameState.deletedEnemiesPosX.shift() : getRandom(60, canvas.width - 60);
      spawnX = spawnX + getRandom(-40, 40);
      
      let minX = 60;
      let maxX = canvas.width - gameState.enemyWidth - 60;
      if (spawnX < minX) spawnX = minX;
      if (spawnX > maxX) spawnX = maxX;
      
      gameState.enemies.push(new Enemy(spawnX, getRandom(-800, -100)));
    }
    
    gameState.enemies.forEach(en => en.update(hero.x, hero.isExploding, hero.isProtected));
    checkCollisions(hero, () => { hero.isExploding = true; gameState.playerHp--; }); 
  }
}
// 3. Entités et Physique
// laser.js, enemy.js, collisions.js, physics.js, render.je et ui.js

// ______________________________________________________________________
// LOGIQUE GRAPHISME DE RENDU (DRAW)
// ______________________________________________________________________
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); 
  drawStars(); 

  if (anim.drawExplodeRun) drawBoutonExplosion(anim); 
  if (gameState.status === 'start' || gameState.status === 'gameOver' || gameState.isPaused) drawEnemiesAndTheirLasers(); 

  let lW = window.innerWidth >= 1024 ? 30 : 21;
  let lH = window.innerWidth >= 1024 ? 50 : 36;
  gameState.arrayLaser.forEach(l => ctx.drawImage(assets.userLaser, 300, 25, 60, 110, l.x, l.y, lW, lH)); 

  drawPlayerAndShield(hero, anim); 
  
  drawUI();          
  drawGameOver();    
  drawPauseScreen(); 
}

// 4. Cœur du jeu (Boucle principale)
// game.js

// ======================================================================
// 1. CONFIGURATION INITIALE ET COMPOSANTS DU JEU
// ======================================================================
const divRun = document.getElementById("div_run");

// Création du héros calé au centre avec la hauteur de sécurité remontée (-95)
const hero = { 
  x: window.innerWidth / 2 - (gameState.playerWidth / 2), 
  y: window.innerHeight - 95, 
  speed: 500, 
  isExploding: false, 
  isProtected: false 
};

// Variables techniques de gestion pour les animations du Canvas
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

// Déclarations des limites de bords et du cooldown de l'arme du joueur
let max_x = window.innerWidth - gameState.playerWidth, lastHeroFireTime = -200, coolDownHeroFireTime = 200;

// Lancement sécurisé une fois que TOUS les scripts séparés sont liés par le navigateur
window.addEventListener('DOMContentLoaded', () => {
  if (typeof initStars === 'function') initStars(100); 
  if (typeof initControls === 'function') initControls(); 
  if (typeof spawnInitialEnemies === 'function') spawnInitialEnemies();
  
  // DÉMARRAGE SÉCURISÉ DE LA BOUCLE : On lance le jeu ici !
  window.requestAnimationFrame(gameLoop);
});


// Recalcul précis de la position de sécurité dès que l'image du vaisseau est chargée
assets.spaceship.onload = () => { 
  max_x = (canvas.width - gameState.playerWidth); 
  hero.x = ((canvas.width - gameState.playerWidth) / 2); 
  hero.y = (canvas.height - gameState.playerHeight - 30); // Sécurité remontée à -30
};

// Ajustement en temps réel lors du redimensionnement de l'écran (Ex: Fermeture inspecteur)
window.addEventListener('resize', () => {
  max_x = (canvas.width - gameState.playerWidth);
  if (gameState.status === 'notYetStarted') { hero.x = ((canvas.width - gameState.playerWidth) / 2); }
  hero.y = (canvas.height - gameState.playerHeight - 30); // Maintient la hauteur de sécurité
});

// ======================================================================
// FONCTION DE DÉMARRAGE DU JEU (Appelée par controls.js)
// ======================================================================
// ======================================================================
// FONCTION DE DÉMARRAGE DU JEU (Appelée par controls.js)
// ======================================================================
function startGame() {
  if (gameState.status === 'notYetStarted') {
    const rect = divRun.getBoundingClientRect();
    anim.explodeX = rect.left + (rect.width / 2) - 100; 
    anim.explodeY = rect.top + (rect.height / 2) - 100;
    divRun.style.display = 'none'; 
    anim.accudeltaTime = 0; 
    anim.drawExplodeRun = true;
    
    if (!gameState.isMuted) {
      setTimeout(() => { if (typeof playExplosionSound === 'function') playExplosionSound(); }, 1);
    }
    
    // 1. On passe le jeu en mode actif
    gameState.status = 'start';

    // 2. CORRECTION TIR DIRECT : On force le tout premier tir de laser immédiatement !
    let currentTime = performance.now();
    gameState.arrayLaser.push(new Laser((hero.x + gameState.playerWidth / 2 - 21), hero.y - 35)); 
    lastHeroFireTime = currentTime;
    if (typeof playLaserSound === 'function') {
      playLaserSound();
    }
  }
}


// Écouteurs globaux de réinitialisation si le joueur est sur l'écran de Game Over
[window, 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (gameState.status === 'gameOver') resetGame(hero); }));
window.addEventListener("keydown", (e) => { if (gameState.status === 'gameOver' && e.code === "Space") resetGame(hero); });

// ______________________________________________________________________
// 4. BOUCLE PRINCIPALE CYCLIQUE (GAME LOOP)
// ______________________________________________________________________
function gameLoop(hrt) { 
  if (!hrt) hrt = performance.now();
  
  if (gameState.isPaused) { 
    gameState.dt = 0; 
    gameState.lastTime = hrt; 
  } else { 
    gameState.dt = (hrt - gameState.lastTime) / 1000; 
    gameState.lastTime = hrt; 
  }

  if (typeof updateSoundButtonUI === "function") {
    updateSoundButtonUI();
  }

  // Écran d'accueil : détruit le bouton START si le joueur lui tire dessus avec un laser
  if (gameState.status === 'notYetStarted') {
    const divRunPosCurrent = divRun.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    let buttonLeft = divRunPosCurrent.left - canvasRect.left;
    let buttonRight = divRunPosCurrent.right - canvasRect.left;
    let buttonTop = divRunPosCurrent.top - canvasRect.top;
    let buttonBottom = divRunPosCurrent.bottom - canvasRect.top;

    for (let i = gameState.arrayLaser.length - 1; i >= 0; i--) {
      let l = gameState.arrayLaser[i];
      if (l.y <= buttonBottom && l.y >= buttonTop && l.x >= buttonLeft && l.x <= buttonRight) {
        anim.explodeX = divRunPosCurrent.left + (divRunPosCurrent.width / 2) - 100;
        anim.explodeY = divRunPosCurrent.top + (divRunPosCurrent.height / 2) - 100;
        
        if (!gameState.isMuted) {
          setTimeout(() => { playExplosionSound(); }, 1);
        }

        divRun.style.display = 'none'; 
        gameState.status = 'start'; 
        gameState.arrayLaser.splice(i, 1); 
        anim.accudeltaTime = 0; 
        anim.drawExplodeRun = true;
        break;
      }
    }
  }
  update(); draw(); window.requestAnimationFrame(gameLoop); 
}
