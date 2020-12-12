(() => { 
  // _________
  // functions
  // _________
  
  // update current frame
  // --------------------
  function update(){
  
    function heroKeyboardMoveAndFire(){
      
      // check if we are in a cooldown mode for hero fire or not
      function isHeroFireCoolDown(){
        now = performance.now();        
        if((now - lastHeroFireTime) < coolDownHeroFireTime){          
          return true;          
        } else {          
          return false;
        }
      }
      // _______________________________
      // HERO keyboard movement and fire
      // _______________________________
      
      // -------------------------
      // Test Keyboard combination
      // -------------------------
      
      // left and fire (spacebar)
      if (keyLeft && keySpace){
        // Hero x pos
        x -= heroSpeed * dt;               
        if (x < 0){x = 0;}         
        
        // if no colldown hero fire, then trigger first pos of fire laser
        if (!isHeroFireCoolDown()){          
          let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), y - 10);
          arrayLaser.push(newObjUserLaser); 
          // for cooldown Hero Fire calculation  
          lastHeroFireTime = performance.now();          
        }

      } else {
        // right and fire (spacebar)
        if (keyRight && keySpace){
          // Hero x pos
          x += heroSpeed * dt; 
          if (x > max_x){x = max_x;} 

          // if no colldown hero fire, then trigger first pos of fire laser
          if (!isHeroFireCoolDown()){
            let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), y - 10);
            arrayLaser.push(newObjUserLaser); 
            // for cooldown Hero Fire calculation  
            lastHeroFireTime = performance.now();  
          }

        } else {
          // left alone
          if (keyLeft){
            x -= heroSpeed * dt;
            if (x < 0){x = 0;} 
          }
            
          // right alone
          if (keyRight){
            x += heroSpeed * dt; 
            if (x > max_x){x = max_x;} 
          } 
            
          // fire alone (only space bar without moving hero)
          // if no colldown hero fire, then trigger first pos of fire laser
          if(keySpace && !isHeroFireCoolDown()){ 
            let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), y - 10);
            arrayLaser.push(newObjUserLaser); 
            // for cooldown Hero Fire calculation  
            lastHeroFireTime = performance.now();  
          }
        }
      } // end Test Keyboard combination
      
      // Calculate new hero fire position
      // -------------------------------- 
      for(let i = 0; i < arrayLaser.length; i++){ 
      // ctx.drawImage(userLaser, 40, 173, 15, 31,laserX, laserY,15,31); 
      arrayLaser[i].laserY = arrayLaser[i].laserY - userLaserSpeed * dt; 
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
    // middle laser
    // ctx.drawImage(userLaser, 40, 173, 15, 31,arrayLaser[i].laserX, arrayLaser[i].laserY,15,31); 
    // long laser
    ctx.drawImage(userLaser, 246, 230, 10, 47,arrayLaser[i].laserX, arrayLaser[i].laserY,10,47); 

    } 
  } // end draw
  
  // ________________
  // setting up canvas
  // ________________
  
  // canvas init
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d"); 
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // ___________________________________
  // setting up the Game Global variables
  // ___________________________________
  
  // Delta Time
  // ----------
  let dt;
  let last;
  let hrt;

  // HERO Spaceship
  // --------------
  const spaceship = new Image();
  spaceship.src = "assets/img/hero.png";
  let max_x;
  let x;
  let y;
  let heroSpeed = 500;
  // global user laser beam
  // ----------------------
  const userLaser = new Image();
  userLaser.src = "assets/img/beams.png"; 
  let userLaserSpeed = 600;
  let laserX;
  let laserY;
  let arrayLaser = [];  
  class objUserLaser {
    constructor(laserX, laserY) {
    this.laserX = laserX;
    this.laserY = laserY;
    }
  }  
  let isUserLaserOutOfScreen = false;
  let index = [];
  let cptUserLaserOutOfScreen;
  // cool down Hero fire
  // -------------------
  let coolDownHeroFireTime = 250; // Time of disability to Fire (to avoid gusts [des rafales de tirs non stop])
  let lastHeroFireTime = -250;
  let now;
  
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
  if (e.key == KEY_SPACE) {
  keySpace = true;
  }
  if (e.key == KEY_RIGHT) {
  keyRight = true; 
  }
  if (e.key == KEY_LEFT) {
  keyLeft = true;
  }
  });
  
  window.addEventListener("keyup", e => {
  if (e.key == KEY_SPACE){
  keySpace = false; 
  } 
  if (e.key == KEY_RIGHT){ 
  keyRight = false;
  }
  if (e.key == KEY_LEFT){ 
  keyLeft = false;
  }
  });
  
  // start Game
  document.querySelector(".btn_run").addEventListener("click", () =>{ 
  
  const run = document.querySelector(".btn_run");
  run.style.display = 'none';
  
  // Delta Time init var
  dt = 0;
  last = performance.now();
  // Game loop frame by frame
  // ------------------------
  function gameLoop(hrt) { 
    // hrt est le timestamp du callback de requestAnimationFrame(gameloop) 

    // Delta Time
    // to keep same speed in all computer
    // all moving element defined variable speed will multiply the dt in the update code... 
    dt = (hrt - last) / 1000; 
    update();
    
    draw(); 
    
    // for dt calcul
    // hrt is ..
    last = hrt;
    
    window.requestAnimationFrame(gameLoop); 
  } 
  
  // 1st time calling game loop
  window.requestAnimationFrame(gameLoop);
  
  }); // end run
  
  })();