import { gameState } from './config.js';

export class Laser {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 600;
  }

  update() {
    this.y -= Math.floor(this.speed * gameState.dt);
  }
}

