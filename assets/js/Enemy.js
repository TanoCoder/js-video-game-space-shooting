import { canvas, gameState, getRandom } from './config.js';

export class Enemy {
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

