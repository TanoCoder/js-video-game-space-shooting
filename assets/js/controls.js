import { gameState } from './config.js';

// État des entrées partagé avec le jeu
export const inputs = {
  keyLeft: false,
  keyRight: false,
  keySpace: false
};

let touchLeftId = null;
let touchRightId = null;

export function initControls() {
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

