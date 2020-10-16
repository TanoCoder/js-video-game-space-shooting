(() => { 

  let canvas = document.getElementById("canvas");
  let ctx = canvas.getContext("2d");

  // window size

  canvas.width  = window.innerWidth - 10;
  canvas.height = window.innerHeight - 75;

  let max_x = (canvas.width - 67);
  
  let x = (canvas.width / 2) - 70; 
  let y = canvas.height - 110;

  // cannon image  
  const cannon = new Image();
  cannon.src = "cannon.svg";  
  
  cannon.onload = function () {      
    ctx.drawImage(cannon, x, y);
  }
    
  window.addEventListener("keydown", doKeyDown, true);

  function doKeyDown(e) {
    // alert( e.keyCode );
    
    // right
    if (e.keyCode == 39){      
      x += 15;
      
      if (x > max_x){
        x = max_x;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);  // clear canvas
      ctx.drawImage(cannon, x, y);         // draw image at current position
    }

    // left
    if (e.keyCode == 37){
      x -= 15;

      if (x < 0){
        x = -9 ;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);  // clear canvas
      ctx.drawImage(cannon, x, y);         // draw image at current position
    }
    
    // fire
    if (e.keyCode == 32){

    }

  } // end doKeyDown

  document.getElementById("run").addEventListener("click", () =>{
    //alert("test run"); 
  });  


})();
