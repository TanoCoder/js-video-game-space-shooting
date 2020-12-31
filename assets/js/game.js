﻿(() => { 
  // _________
  // functions
  // _________
  
  // update current frame
  // --------------------
  function update(){
    //console.log(enemies.length);
  
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
        x -= Math.floor(heroSpeed * dt);
        if (x < 0){x = 0;}         
        
        // if no colldown hero fire, then trigger first pos of fire laser
        if (!isHeroFireCoolDown()){          
          let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 21), y - 20);
          arrayLaser.push(newObjUserLaser); 
          // for cooldown Hero Fire calculation  
          lastHeroFireTime = performance.now();          
        }

      } else {
        // right and fire (spacebar)
        if (keyRight && keySpace){
          // Hero x pos
          x += Math.floor(heroSpeed * dt); 
          if (x > max_x){x = max_x;} 

          // if no colldown hero fire, then trigger first pos of fire laser
          if (!isHeroFireCoolDown()){
            let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 21), y - 20);
            arrayLaser.push(newObjUserLaser); 
            // for cooldown Hero Fire calculation  
            lastHeroFireTime = performance.now();  
          }

        } else {
          // left alone
          if (keyLeft){
            x -= Math.floor(heroSpeed * dt); 
            if (x < 0){x = 0;} 
          }
            
          // right alone
          if (keyRight){
            x += Math.floor(heroSpeed * dt); 
            if (x > max_x){x = max_x;} 
          } 
            
          // fire alone (only space bar without moving hero)
          // if no colldown hero fire, then trigger first pos of fire laser
          if(keySpace && !isHeroFireCoolDown()){ 
            let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 21), y - 20);
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
        arrayLaser[i].laserY = arrayLaser[i].laserY - Math.floor(userLaserSpeed * dt);         
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

      function enemiesMove(){        
        enemies.forEach( (item) => {                          
          //alert("arrivé ici");
          //item.x = item.x + (item.speed * dt);
          item.y = item.y + (item.speed * dt);   

          // check if enemy[current item] is out of the screen
          if(item.y > canvas.height){
            item.y = getRandom(-1000, -100);
          }
        });
      }
      
      function collisionsDetection(){

        // user laser collisions detection into enemies
        // ---------------------------------------

        // Hero spaceship collision detection into enemies 
        // -----------------------------------------------

        // enemies laser collisions detection into Hero
        // --------------------------------------------

      }

      heroKeyboardMoveAndFire(); 
      outOfScreenGarbageCollector();

      if (gameStatus == 'start'){
        enemiesMove();  
        collisionsDetection();      
      }
      
    
  } // end update

  // draw current frame
  // ------------------
  function draw(){ 
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    
    // draw to maintain img explode run
    if (drawExplodeRun){      
      ctx.drawImage(explodeRunBtn, spriteExplodeX, 0, 95, 96, explodeX, explodeY, 200,200);
    }
    
    // draw stars background
    drawStarsBackGround();
    
    // draw spaceship at current position
    ctx.drawImage(spaceship, x, y); 
    //ctx.drawImage(spaceship, 0, 0, 170, 102, x, y, 80, 50);
    
    // draw userLaser
    for(let i = 0; i < arrayLaser.length; i++){ 
    // ctx.drawImage(userLaser, 40, 173, 15, 31,laserX, laserY,15,31); 
    // middle laser
    // ctx.drawImage(userLaser, 40, 173, 15, 31,arrayLaser[i].laserX, arrayLaser[i].laserY,15,31); 
    // long laser
    ctx.drawImage(userLaser, 230, 215, 42, 72,arrayLaser[i].laserX, arrayLaser[i].laserY,42,72); 
    } 
    
    // draw run btn explode    
    if (drawExplodeRun){                
      if (accudeltaTime > minSpeedExplodeAnimationForRunBtn){     
        ctx.drawImage(explodeRunBtn, spriteExplodeX, 0, 95, 96, explodeX, explodeY, 200,200);

        numframeExplodeRun++;
        spriteExplodeX += 95;  
        accudeltaTime = 0;
        if (spriteExplodeX > 1172){
          drawExplodeRun = false;
          gameStatus = 'start';
        }
      } else {
        accudeltaTime += dt;
      }
    }

    // draw enemies
    if (gameStatus == 'start'){
      enemies.forEach( (item) => {
        //ctx.drawImage(imgEnemy, item.x, item.y); 
        ctx.drawImage(imgEnemy, 0, 0, 134, 199, item.x, item.y, 70, 100); 
      });  
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
  
  // set up stars
  let stars = [];
  let star = {x:0, y:0};  
  nbStars = 100;

  function setUpStarsBackGround(){
    // To create the stars themselves, we’ll create a simple loop 
    // that draws 1 pixel × 1 pixel squares randomly within the limits of the canvas 
    for (let i = 0; i < nbStars; i++) {
      let xx = Math.random() * canvas.offsetWidth;      
      let yy = Math.random() * canvas.offsetHeight;
      stars.push({x : xx, y : yy});
    }
  }
  
  function drawStarsBackGround(){            
    for (let i = 0; i < stars.length; i++) {
      ctx.fillStyle = "white";
      ctx.fillRect(stars[i].x, stars[i].y, 1, 1);
    }
  }

  setUpStarsBackGround();  
  drawStarsBackGround();

  // ___________________________________
  // setting up the Game Global variables
  // ___________________________________
  
  // Delta Time
  // ----------
  let dt;
  let last;
  let hrt;

  // state of the Game
  let gameStatus = 'notYetStarted';
  let divRun = document.getElementById("div_run");
  let divRunPos = divRun.getBoundingClientRect();

  // random
  function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
  }

  // Explode Run Btn
  // ---------------
  const explodeRunBtn = new Image();
  explodeRunBtn.src = "assets/img/explode.png";  

  let explodeX = ((canvas.width - 200) / 2);
  let explodeY = divRunPos.top - (96 / 2);
  let drawExplodeRun = false;
  let numframeExplodeRun = 1;
  let spriteExplodeX = 0;  
  let accudeltaTime = 0;
  let minSpeedExplodeAnimationForRunBtn = 0.1; // pour gérer la vitesse d'exécution frame by frame du sprite.

  // HERO Spaceship
  // --------------
  const spaceship = new Image();
  spaceship.src = "assets/img/hero.png";
  let max_x;
  let x;
  let y;
  let heroSpeed = 500;
  // user laser beam
  // ---------------
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

  // enemies
  // -------
  // image
  const imgEnemy = new Image();
  imgEnemy.src = "assets/img/enemy.png"; 

  // class object
  class Enemy {
    constructor(x, y) {
    this.x = x;
    this.y = y;   
    this.speed = 100;    
    }
  }   

  // vector
  let enemies = [];

  // initial enemies and position to start the game
  let initialEnemyX = 10;  
  let initialEnemyY;

  for (let i = 0; i <=9; i++){
    let objEnemy = new Enemy(initialEnemyX, getRandom(-1000,-100));
    enemies.push(objEnemy);
    initialEnemyX += 140;    
    initialEnemyY = getRandom(-1000,-100);
  }


  
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

      // init explodeRunBtn image
      // ------------------------
      explodeRunBtn.onload = function () {  
        // implementation 
        // init but do not draw now            
         //ctx.drawImage(explodeRunBtn, 10, 10, 78, 96,10, 10,78,96);       
         //ctx.drawImage(explodeRunBtn, 10, 10); 
      }

      // init enemy image
      // ------------------------
      imgEnemy.onload = function () {  
        // implementation 
        // init but do not draw now         
      }

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
   
  // Event listenner to start the Game
  document.querySelector(".btn_run").addEventListener("click", () =>{             
    hideRunBtn();
    // we can draw a little explosion for this event click ;-)
    drawExplodeRun = true;
    //calling game loop    
    window.requestAnimationFrame(gameLoop);  
  });    

  function hideRunBtn(){
    const run = document.querySelector(".btn_run");
    run.style.display = 'none';
  }

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
          
    //console.log(gameStatus);

      if (gameStatus == 'notYetStarted'){                           
          for(let i = 0; i < arrayLaser.length; i++){ 
            if ((arrayLaser[i].laserY < divRunPos.bottom) && (arrayLaser[i].laserX > divRunPos.left) && (arrayLaser[i].laserX < divRunPos.right)){
              //hit run btn                            
              hideRunBtn();                            
              gameStatus = 'start';              
              arrayLaser.splice(i,1);               
              accudeltaTime = dt;
              drawExplodeRun = true;
            }           

          }

      }
          
      update();      
      draw(); 
      
      /*
      if(arrayLaser.length > 0){
        console.log(newObjUserLaser); 
      }
      */

      // for dt calcul
      // hrt is last time when requestAnimationFrame was called
      last = hrt;
     
    window.requestAnimationFrame(gameLoop);      
    
  }  
  
  // 1st time calling game loop
  window.requestAnimationFrame(gameLoop);  
    
})();