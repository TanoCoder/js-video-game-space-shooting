export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d"); 

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ajustement automatique si vous redimensionnez votre navigateur
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

export const gameState = {
  status: 'notYetStarted',
  dt: 0,
  lastTime: performance.now(),
  arrayLaser: [],
  enemies: [],
  deletedEnemiesPosX: []
};

export const assets = {
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

export function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

