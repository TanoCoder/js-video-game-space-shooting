(() => { 
  
  // _________
  // functions
  // _________

  // update current frame
  // --------------------
  function update(){

    function heroKeyboardMoveAndFire(){
      // _______________________________
      // HERO keyboard movement and fire
      // _______________________________

      // -------------------------
      // Test Keyboard combination
      // -------------------------

      // left and fire (spacebarr)
      if (keyLeft && keySpace){
        x -= heroSpeed;
        if (x < 0){x = 0;}       
        let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), y - userLaserSpeed + 2);
        arrayLaser.push(newObjUserLaser);        
      } else {
        // right and fire (spacebarr)
        if (keyRight && keySpace){
          x += heroSpeed;    
          if (x > max_x){x = max_x;}      
          let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), y - userLaserSpeed +2);
          arrayLaser.push(newObjUserLaser);        
        } else {
          // left alone
          if (keyLeft){
            x -= heroSpeed;
            if (x < 0){x = 0;}       
          }
          // right alone
          if (keyRight){
            x += heroSpeed;    
            if (x > max_x){x = max_x;}     
          } 
          // fire alone
          if(keySpace){          
              let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), y - userLaserSpeed +2);
              arrayLaser.push(newObjUserLaser);          
          }
        }
      } // end Test Keyboard combination

      // Calculate new hero fire position
      // --------------------------------      
      for(let i = 0; i < arrayLaser.length; i++){            
        // ctx.drawImage(userLaser, 40, 173, 15, 31,laserX, laserY,15,31);     
        arrayLaser[i].laserY = arrayLaser[i].laserY - userLaserSpeed;            
      }       

    } // end function heroKeyboardMoveAndFire()
    
    function outOfScreenGarbageCollector(){

      // for Hero laser fire
      // -------------------      
      isUserLaserOutOfScreen = false;
      index = [];
      cptUserLaserOutOfScreen = 0;

      for(let i = 0; i < arrayLaser.length; i++){                                    
        if (arrayLaser[i].laserY < 0){
          isUserLaserOutOfScreen = true;

          // si le game loop à du mal à suivre la cadence
          // ici on n'oublie aucun tir en dehors de l'écran
          index[cptUserLaserOutOfScreen] = i;
          cptUserLaserOutOfScreen++;
        }
      } 
      
      if (isUserLaserOutOfScreen){
        for (let j = 0; j < cptUserLaserOutOfScreen ; j++){
          // si le game loop à du mal à suivre la cadence
          // ici on supprime tous les tirs qui sont en dehors de l'écran.
          // pour maintenir à jour la taille du vecteur de tir, 
          // sinon il grandit à l'infini et risque de faire planter l'application.
          arrayLaser.splice(index[j], 1);          
        }        
        
        isUserLaserOutOfScreen = false;
      }

      // for Enemies
      // -----------
      // ... to be done ...

    } // end function outOfScreenGarbageCollector()

    heroKeyboardMoveAndFire();    
    outOfScreenGarbageCollector();

  } // end update
      
  // draw current frame
  // ------------------
  function draw(){                
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);  

    // draw spaceship at current position
    ctx.drawImage(spaceship, x, y);      
    
    // draw userLaser
    for(let i = 0; i < arrayLaser.length; i++){            
      // ctx.drawImage(userLaser, 40, 173, 15, 31,laserX, laserY,15,31);           
      ctx.drawImage(userLaser, 40, 173, 15, 31,arrayLaser[i].laserX, arrayLaser[i].laserY,15,31);   
    }       
  } // end draw

  // ________________
  // seting up canvas
  // ________________

  // canvas init
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");  
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // __________________
  // seting up the Game
  // __________________
  
  // global HERO Spaceship
  // ----------------
  const spaceship = new Image();
  spaceship.src = "assets/img/hero.png";
  let max_x;
  let x;
  let y;
  let heroSpeed = 7;
  
  // global user laser beam
  // ----------------------
  const userLaser = new Image();
  userLaser.src = "assets/img/beams.png";    
  let userLaserSpeed = 10;
  let laserX;
  let laserY;
  let arrayLaser = [];
  let cooldownHeroFire = 1000;
  
  class objUserLaser {
    constructor(laserX, laserY) {
      this.laserX = laserX;
      this.laserY = laserY;
    }
  }

  let isUserLaserOutOfScreen = false;
  let index = [];
  let cptUserLaserOutOfScreen;

  // init spaceship image
  // --------------------
  spaceship.onload = () => {      
    max_x = (canvas.width - spaceship.width);
    x = ((canvas.width - spaceship.width) / 2);
    y = (canvas.height - spaceship.height - 10);  
    ctx.drawImage(spaceship, x, y);
   
    // init userLaser image
    // --------------------    
    userLaser.onload = function () {             
      // implementation       
      
      // init but do not draw now, we have not yet shoot ;-)      
    } // end userLaser.onload

  } // end spaceship.onload  
  
  // init for keyboard management
  const KEY_LEFT = "ArrowLeft";
  const KEY_RIGHT = "ArrowRight";
  const KEY_SPACE = " ";

  let keyLeft = false;
  let keyRight = false;
  let keySpace = false;

  // event listener
  window.addEventListener("keydown", e => {
        
    if (e.key  == KEY_SPACE) {
      keySpace = true;
      
    }
    if (e.key  == KEY_RIGHT) {
      keyRight = true;     
      
    }
    if (e.key  == KEY_LEFT) {
      keyLeft = true;
      
    }
  });

window.addEventListener("keyup", e => {
  if (e.key  == KEY_SPACE){
    keySpace = false;    
    
  }  
  if (e.key  == KEY_RIGHT){      
    keyRight = false;
    
  }
  if (e.key  == KEY_LEFT){      
    keyLeft = false;
    
  }
});

// start Game
document.querySelector(".btn_run").addEventListener("click", () =>{    

  const run = document.querySelector(".btn_run");
  run.style.display = 'none';

    // Game loop 
    // ---------  
    function gameLoop() {                       
      update();
      draw();    
      window.requestAnimationFrame(gameLoop);      
    }  

    // 1st time calling game loop
    window.requestAnimationFrame(gameLoop);

  }); // end run

})();