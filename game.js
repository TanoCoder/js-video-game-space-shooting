(() => { 

  let canvas = document.getElementById("canvas");
  let ctx = canvas.getContext("2d");

  // window size
  canvas.width  = window.innerWidth - 50;
  canvas.height = window.innerHeight - 50;

  // cannon image  
  const cannon = new Image();
  cannon.src = "cannon.svg";
  cannon.onload = function () {    
    ctx.drawImage(cannon, (canvas.width / 2), canvas.height - 100);
  }

  window.addEventListener("keydown", doKeyDown, true);

  function doKeyDown(e) {

    alert( e.keyCode )
    
  }

  document.getElementById("run").addEventListener("click", () =>{
    //alert("test run"); 
  });  


})();