// --- INITIALISATION DU CANVAS ---
export const canvas = document.getElementById("canvas"); // Utilise l'ID "canvas" de votre HTML
export const ctx = canvas.getContext("2d"); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ajustement automatique si vous redimensionnez votre navigateur
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- ÉTAT GLOBAL DU JEU (FUSIONNÉ) ---
export const gameState = {
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
export const assets = {
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
export function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

