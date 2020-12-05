(() => { 
  
  // _________
  // functions
  // _________

  
  // draw
  // ----
  function draw(){        
    isUserLaserOutOfScreen = false;
    index = [];
    cptUserLaserOutOfScreen = 0;
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);  
    // draw spaceship at current position
    ctx.drawImage(spaceship, x, y);      
    // draw userLaser if is shooting   
    for(let i = 0; i < arrayLaser.length; i++){            
      // ctx.drawImage(userLaser, 40, 173, 15, 31,laserX, laserY,15,31);     
      arrayLaser[i].laserY = arrayLaser[i].laserY - userLaserSpeed;    
      ctx.drawImage(userLaser, 40, 173, 15, 31,arrayLaser[i].laserX, arrayLaser[i].laserY,15,31);   
               
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

        // this test just for debug
        // si la rafalle de tir non stop est autorisé, 
        // il peut arrivé parfois que 2 tirs sorte en même temps du cadre de l'écran
        // c'est rare mais cela peut arrivé à cause d'une microseconde de ralentissement du game loop
        // due sans doute au rythme soutenue de rafraichissement à cause de la rafale de tir.
        // if (j>0){console.log(`cptUserLaserOutOfScreen : ${cptUserLaserOutOfScreen}`); }
      }        
      
      isUserLaserOutOfScreen = false;
    }  
    
  }

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
  
  // global spaceship
  // ----------------
  const spaceship = new Image();
  spaceship.src = "assets/img/hero.png";
  let max_x;
  let x;
  let y;

  // global user laser beam
  // ----------------------
  const userLaser = new Image();
  userLaser.src = "assets/img/beams.png";    
  let userLaserSpeed = 10;
  let laserX;
  let laserY;
  let arrayLaser = [];
  
  function objUserLaser(laserX, laserY) {
    this.laserX = laserX;
    this.laserY = laserY;    
  }

  let isUserLaserOutOfScreen = false;
  let index = [];
  let cptUserLaserOutOfScreen;

  // init spaceship image
  // --------------------
  spaceship.onload = () => {      
    max_x = (canvas.width - spaceship.width);
    x = ((canvas.width - spaceship.width) / 2);
    y = canvas.height - spaceship.height;  
    ctx.drawImage(spaceship, x, y);
   
    // init userLaser image
    // --------------------    
    userLaser.onload = function () {             
      // implementation       
      
      // init but do not draw now, we have not yet shoot ;-)      
    } // end userLaser.onload

  } // end spaceship.onload
  
  

// start Game
document.querySelector(".btn_run").addEventListener("click", () =>{    
  const run = document.querySelector(".btn_run");
  run.style.display = 'none';

    // event listener "keydown"
    window.addEventListener("keydown", doKeyDown, true);
    function doKeyDown(e) {
     //alert( e.keyCode );
  
    // space bar (to fire) 
    if (e.keyCode == 32){              
      let newObjUserLaser = new objUserLaser((x + (spaceship.width / 2) - 7), (y + (spaceship.height - 102) + 5 ));
      arrayLaser.push(newObjUserLaser);  
  
    }
  
    // right
    if (e.keyCode == 39){      
      x += 15;    
      if (x > max_x){      
        x = max_x;
      }      
    }
  
    // left
    if (e.keyCode == 37){
      x -= 15;
      if (x < 0){
        x = 0 ;
      }            
    }   
   
  } // end event listener "keydown"
  
    // Game loop
    // ---------
    
  
    window.requestAnimationFrame(gameLoop);
    function gameLoop() {	          
      draw();    
      window.requestAnimationFrame(gameLoop);
    }
  

});  



  

  


})();
