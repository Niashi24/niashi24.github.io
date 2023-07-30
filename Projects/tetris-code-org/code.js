//section handles everything except for the main screen/play area

//menu theme
playSound("Puyo-Puyon-(N64)---What-Doing--you-Play.mp3",true);


onEvent("titleControlButton","click", function() {
  setScreen("controlScreen");
  if (getChecked("SFXCheck"))
    playSound("assets/button.mp3");
});

onEvent("titleSettingsButton","click",function() {
  setScreen("settingsScreen");
  if (getChecked("SFXCheck"))
    playSound("assets/button.mp3");
});

onEvent("settingsBackButton","click",function() {
  setScreen("titleScreen");
  if (getChecked("SFXCheck"))
    playSound("assets/button.mp3");
});

onEvent("nextSlider","input",function() {
  numNext = getNumber("nextSlider");
  setText("nextLabel","Number of Next Pieces (Default 1): "+ numNext);
});

onEvent("DASSlider","input",function() {
  DAS = getNumber("DASSlider");
  setText("DASLabel","Delayed Auto Shift (Default 4): "+ DAS);
});

onEvent("ARRSlider","input",function() {
  ARR = getNumber("ARRSlider");
  setText("ARRLabel","Automatic Repeat Rate (Default 2): "+ ARR);
});

onEvent("controlsBackButton","click",function() {
  setScreen("titleScreen");
  if (getChecked("SFXCheck"))
    playSound("assets/button.mp3");
});

onEvent("musicCheck","click",function(){
  if (getChecked("musicCheck"))
    playSound("Puyo-Puyon-(N64)---What-Doing--you-Play.mp3",true);
  else
    stopSound();
});



var controlTexts = [
    "#: Keyboard - Button - Description\n\n"+
      "1:   Left        -      ←    - Move Left\n"+
      "2:   Right      -     →     - Move Right\n"+
      "3:   Down     -      ↓      - Soft Drop\n"+
      "4:    Up        -      ↑     - Hard Drop\n"+
      "5:    X          -      A    - Rotate Right\n"+
      "6:    Z          -      B     - Rotate Left\n"+
      "7:    C          -      C      - Left",
      
    "#: Description\n\n"+
      "8: Matrix - main playing field\n"+
      "9: Next Queue - displays the next pieces (can be changed/disabled in settings)\n"+
      "10: Hold Queue - displays the held piece (can be disabled in settings)\n"+
      "11: Score/Level Display - displays the total score and the current level."+
        "level increases every 10 lines, and gravity increases as level increases",
      
    "#:  Keyboard      -  Button - Description\n\n"+
      "12. Space          -     ⏸      -   Pause Button\n"+
      "13.                    -     ᐊ       -   Back Button\n"+
      "14.                    -               -   FPS Counter\n"+
      "15. Esc             -      ↺    -   Restart Button"];

setText("controlTextLabel",controlTexts[0]);

onEvent("controlsDropdown","change",function() {
  var i = 0;
  var input = getText("controlsDropdown");
  if (input == "Controller Inputs (1-7)")
    i = 0;
  else if (input == "Game (8-11)")
    i = 1;
  else if (input == "UI Elements (12-15)")
    i = 2;
  setText("controlTextLabel",controlTexts[i]);
});



// everything below is for the main screen/play area

  //number of frames for a piece to automatically fall 1 unit
  var gravity = 15;
  //counter for the gravity
  var gravityCounter = gravity;  
  
  //Automatic Repeat Rate (in frames) 
  //number of frames for a piece to move after holding the button down (after delayed autoshift)
  //resets every time the piece moves left,right, or down (not including gravity)
  var ARR = 2;
  //counter for ARR
  var ARRcounter = ARR;
  
  //Delayed Auto Shift (in frames)
  //number of frames after a left or right key is pressed until it automatically repeats (see ARR)
  var DAS = 6;
  
  //list to store the all of the placed blocks
  //when a piece is placed, the blocks from that piece go into here, and the piece resets
  var blockHolder = [];
  
  //whether or not to show the center of rotation for the main piece, changed in settings, false by default
  var showRotation = getChecked("rotationCheck");
  
  //randomizer that handles creating new pieces
  var randomizer = new pieceRandomizer();
  
  //number of pieces to show in the next queue. default 1, can be changed in settings
  var numNext = 1;
  
  //holds the next few pieces. Current set to hold the next 1 pieces,
  //but can handle as many as can fit on screen (must be at least 1 piece)
  var nextHolder = new NextUI();
  
  //holds the held piece
  var holder = new HoldUI();
  
  //after a piece is held, cannot be hold again until a piece is placed
  var canHold = true;
  
  //main piece that is always being controlled
  var mainPiece = nextHolder.grabPiece();
  
  //boolean variables that are true when that button is currently being pressed, and false when it isnt
  //Ex. left is true when the left button or the left arrow key is pressed down
  var left = false,right = false,up = false,down = false;
  
  //int variable that increments by 1 each frame.
  var frameCounter = 0;
  
  //variable that holds the score
  var score = 0;
  
  //variable that holds the score from the previous game
  //defaults to 0 if there is no previous game
  var prevScore = 0;
  
  //stores the number of lines cleared during the sessions
  var totalLines = 0;
  
  //Current Level. Used to determine gravity
  var level = 1;
  
  //sets if the game is currently not running
  //will be true if the game is paused
  var isPaused = false;
  
  setActiveCanvas("mainCanvas1");
  
  
  //boolean variable that controls whether or not the canvas will be drawn on that frame
  //whenever in the code it says "needsToPaint = true;", it will draw the canvas on that frame.
  //You will find this code segment wherever something visual changes, i.e. piece moves left
  var needsToPaint = true;
  
  //Because drawing with canvas can be somewhat slow, drawing a lot of objects at once causes
  //the scene to look like its flickering because it takes time to draw each object.
  //So you have two canvases, one to display, and one to hide. They switch states each time you draw.
  //You draw to one canvas, hide the displayed canvas, and display the previously hidden canvas
  //that way, it only shows the finished frame to the player
  //If you know game programming patterns, this is called a "Double Buffer"
  var canvasSwitch = true;

//MAIN RUN METHOD
  //this timedLoop counts how many frames per second the scene is performing at
  //and outputs it to the top right corner of the screen
  timedLoop(1000,function (){ 
    //console.log(frameCounter);
    setText("fpsLabel","FPS: "+frameCounter);
    frameCounter = 0;
  });
  
  //dictates the amount of frames per second the program runs at
  //actual frames per second will be lower as the round goes on because of lag
  var fps = 60;
  
  var mainRunMethod;
  onEvent("titlePlayButton","click",function() {
    setScreen("playScreen");
    stopSound(); //stops title theme
    if (getChecked("SFXCheck"))
      playSound("assets/button.mp3"); //play click sound
    if (getChecked("musicCheck"))
      playSound("assets/tetris_gameboy_theme.mp3",true); //play looping tetris bg music
    
    //converts frames per second to miliseconds per frame
    mainRunMethod = timedLoop(1000/fps, updateScreen); 
    
    DAS = getNumber("DASSlider");
    ARR = getNumber("ARRSlider");
    gameOver();
  });
  
  
  function updateScreen() { //main run method (loops forever)
    frameCounter++; //increments once per frame 
    
    level = Math.floor(totalLines/10) + 1;
    
    
    gravity = 15 - level + 1; //
    
    setText("scoreLabel","Score: "+score+"\nLevel: "+level+"\nPrevious Score: "+prevScore);
    
    //actions
    if (ARRcounter == 1) {
      //multiple moves at the same
      if (left) {
        mainPiece.moveLeft();
        needsToPaint = true;
      }
      if (right) {
        mainPiece.moveRight();
        needsToPaint = true;
      }
      if (up) {
        //hardDrop();
      }
      if (down) {
        var moved = tryMoveDown(); //tries to move down, and returns true if successful
        if (moved) {
          score+=1;
        }
        needsToPaint = true;
      }
      //if any movement happens
      if (left || right || up || down) {
        //reset counter
        ARRcounter = ARR;
      }
    } else {
      ARRcounter = Math.max(1,ARRcounter-1); //decrease by one every frame until it hits 1
    }
      
    if (gravityCounter == 1) {
      tryMoveDown();
      needsToPaint = true;
      
      //reset gravity counter
      gravityCounter = gravity;
      
    } else {
      gravityCounter = Math.max(1,gravityCounter-1); //decrease by one every frame until it hits 1
    }
    
    //DRAWING
    
    if (needsToPaint) { //only draw when it needs to
      
      //draws main background
      setStrokeColor("white");
      setFillColor("#414141");
      rect(0,0,getProperty("mainCanvas1","width"),getProperty("mainCanvas1","height"));
      
      //draws matrix
      drawMatrixBG();
      
      //draws the pieces that are coming up (and the box for its ui)
      nextHolder.draw();
      
      //draws the piece that is held (and the box for its ui)
      holder.draw();
      
      //draws all of the placed blocks
      setStrokeColor("black");
      for (var i = 0; i < blockHolder.length; i++) {
        blockHolder[i].draw();
      }
      
      //draw the piece that is being controlled
      mainPiece.draw();
      
      switchCanvases();
      
      needsToPaint = false;
    }
    
    
  }

//FUNCTIONS

  function switchCanvases() {
    if (canvasSwitch) {
      setActiveCanvas("mainCanvas1");
      showElement("mainCanvas2");
      hideElement("mainCanvas1");
      canvasSwitch = false;
    } else {
      setActiveCanvas("mainCanvas2");
      showElement("mainCanvas1");
      hideElement("mainCanvas2");
      canvasSwitch = true;
    }
    
  }

  //draws the Tetris matrix
  function drawMatrixBG() {
    //white fill and black outline
    setStrokeColor("black");
    setFillColor("white");
    
    rect(75,50,100,200); //main matrix box
    
    rect(20,50,55,50); //hold box
    
    
  }
  
  //Multiplies each item in the list by a factor
  //list {List{Integer}}
  //factor {Integer}
  //return {List{Integer}} 
  function multiplyListByFactor(list, factor) {
    var returnList = [];
    for (var i = 0; i < list.length; i++) {
      returnList[i] = list[i] * factor;
    }
    return returnList;
  }
  
  
  //checks if the inputted piece is intersecting with 
  //either sides of the play field (the matrix)
  //piece {Piece} piece that is checked for collision with
  //return {boolean} whether or not the inputted piece intersects with the wall
  function intersectsWithWall(piece) {
    //Moves through all individual blocks in the piece
    for (var i = 0; i < piece.blocks.length; i++) {
      //gets the X-position of the block
      var pieceX = piece.blocks[i].x;
      //if this block is outside the playfield, return true
      if (pieceX < 75 || pieceX > 165)
        return true;
    }
    //if none of the blocks are outside the playfield, return false
    return false;
  }
  
  //checks if the inputted piece is intersecting with
  //the floor of the playfield (the matrix)
  //piece {Piece} piece that is checked for collision with
  //return {boolean} whether or not the inputted piece intersects with the floor
  function intersectsWithFloor(piece) {
    //Moves through all individual blocks in the piece
    for (var i = 0; i < piece.blocks.length; i++) {
      //if the piece is too far down, return true
      if (piece.blocks[i].y > 240)
        return true;
    }
    //if none of the blocks are too far down, return false
    return false;
  }
  
  //checks if the inputted piece is intersecting with
  //the other blocks
  //piece {Piece}
  function intersectsWithStack(piece) {
    //checks each piece with each block
    for (var i = 0; i < piece.blocks.length; i++) {
      for (var j = 0; j < blockHolder.length;j++) {
        if (piece.blocks[i].intersects(blockHolder[j]))
          return true;
      }
    }
    return false;
  }
  
  //function that tries to move the main piece down
  //if unsuccessful in moving the piece down, it will instead place it
  //return {boolean} whether or not the movement was successful
  function tryMoveDown() {
    var testPiece = copyPiece(mainPiece); //copy the main piece
      testPiece.moveDown(); //move the main piece down
      if (intersectsWithFloor(testPiece) || intersectsWithStack(testPiece)) {
        //if it intersects with other pieces or the floor, then place the piece
        mainPiece.place();
        //gets the amount of lines cleared after placing the piece
        var linesCleared = checkForLineClears();
        if (linesCleared > 0 && linesCleared < 4) {
          if (getChecked("SFXCheck"))
            playSound("assets/clear.mp3");
        } else if (linesCleared == 4) {
          if (getChecked("SFXCheck"))
            playSound("assets/tetris_clear.mp3");
        }
        //calculate score for clearing the lines
        score+=getScore(linesCleared);
        //add lines cleared to the total lines
        totalLines += linesCleared;
        //reset the main piece
        mainPiece = nextHolder.grabPiece();
        //if the main piece still intersects with the other pieces after placing
        //then the user loses
        if (intersectsWithStack(mainPiece))
          gameOver();
          
        return false; //unsuccessfully moved down
        
      } else {
        //if it doesnt intersect, then it is safe to move down
        //move the main piece down
        mainPiece.moveDown();
        return true; //successfully moved down
      }
  }
  
  //function that moves the piece down until it either intersects 
  //with the floor or the stack, and then places the piece
  //return {Integer} number of lines
  function hardDrop() {
    //if hard drop is not enabled
    if (!getChecked("hardDropCheck"))
      return 0; //no lines cleared
    //Until you hit the floor or the other blocks,...
    while (!(intersectsWithFloor(mainPiece) || intersectsWithStack(mainPiece))) {
      score+=2; //increase the score by 2
      mainPiece.moveDown(); //and move the piece down
    }
    //piece is currently inside wall or inside a different piece
    //so move it up one
    mainPiece.moveUp(); 
    //and place the piece down
    mainPiece.place();
    //and then reset the peice
    mainPiece = nextHolder.grabPiece();
    //if theres a piece in the way of the respawning piece
    if (intersectsWithStack(mainPiece)) {
      //blockout, game over
      gameOver();
      return 0; //no lines cleared
    } //else {
    var linesCleared = checkForLineClears(); //clears lines and returns amount of lines cleared
    if (linesCleared > 0 && linesCleared < 4) {
      //play a "eh" sound because a tetris wasn't cleared
      //don't play a sound if nothing was cleared
      if (getChecked("SFXCheck"))
        playSound("assets/clear.mp3");
    } else if (linesCleared == 4) {
      //play a cool sound because a tetris was cleared
      if (getChecked("SFXCheck"))
        playSound("assets/tetris_clear.mp3");
    }
    //add the score to the main score based on lines cleared and level
    score+=getScore(linesCleared);
    //add the lines cleared to the total (for calculating level)
    totalLines += linesCleared;
    //need to update picture next frame
    needsToPaint = true;
    
    return linesCleared;
  }
  
  //returns a complete copy of the inputted Piece
  //piece {Piece}
  //return {Piece}
  function copyPiece(piece) {
    var returnPiece = new Piece(piece.type,piece.rot);
    returnPiece.x = piece.x;
    returnPiece.y = piece.y;
    returnPiece.updateLocations();
    return returnPiece;
  }
  
  //Clears all filled lines and returns amount of lines cleared lines 
  //return {Integer} 
  function checkForLineClears() {
    var toRemove = checkFullRows();
    for (var i = toRemove.length - 1; i >= 0; i--) {
      for (var j = 0; j < blockHolder.length; j++) {
        var yIndex = 24 - (blockHolder[j].y/10); //lowest piece is at y=240. -240 / 10 + 24 = 0
        if (yIndex > toRemove[i]) {
          blockHolder[j].moveDown();
        } else if (yIndex == toRemove[i]) {
          removeItem(blockHolder,j);
          j--; //account for shifting of array contents
        }
      }
    }
    return toRemove.length;
  }
  
  //returns list of rows that have all spaces filled in
  //return {List{Integer}}
  function checkFullRows() {
    var numInRoww = numInEachRow();
    var returnList = [];
    for (var j = 0; j < numInRoww.length; j++) {
      if (numInRoww[j] == 10) {
        appendItem(returnList,j);
      }
    }
    return returnList;
  }
  
  //returns a list of number of the amount of blocks in each row
  //return {List{Integer}}
  function numInEachRow() {
    var numInRow = [];
    for (var x = 0; x < 22; x++)
      numInRow[x] = 0;
      
    for (var i = 0; i < blockHolder.length; i++) {
      var yIndex = 24-blockHolder[i].y/10; //lowest piece is at y=240. -240 / 10 + 24 = 0
      numInRow[yIndex]++;
    }
    return numInRow;
  }
  
  //returns the score given the input amount of lines cleared based on the level
  //lines {Integer} amount of lines cleared. 0 <= lines <= 4
  //return {Integer} score based on the level and amount of lines cleared
  function getScore(lines) {
    
    switch(lines) {
      case 1: //single clear
        return 100 * level;
      case 2: //double clear
        return 300 * level;
      case 3: //triple clear
        return 500 * level;
      case 4: //tetris clear
        return 800 * level;
      default://no clears
        return 0;
    }
  }
  
  //function that resets the entire game. Called whenever the user loses or starts a new game
  function gameOver() {
    //console.log(score);
    prevScore = score; //
    score = 0; //reset score
    totalLines = 0; //reset total lines cleared
    blockHolder = []; //reset playfield
    showRotation = getChecked("rotationCheck");
    randomizer.reset(); //reset piece randomizer
    nextHolder.reset(); //reset next queue
    holder.reset(); //clear hold queue
    canHold = true; //resets ability to hold a piece
    mainPiece = nextHolder.grabPiece(); //reset main piece
    
  }
  
  
  onEvent("pausePlayButton", "click", pausePlay);
  function pausePlay() {
    if (getChecked("SFXCheck")) //if sfx are enabled
      playSound("assets/button.mp3"); //play a button sound
    
    
    if (isPaused) { //if the game is paused
      //continue the game
      mainRunMethod = timedLoop(1000/fps, updateScreen);
      //game is no longer paused
      isPaused = false;
      if (getChecked("musicCheck")) //if music is enabled
        //start the music up again
        playSound("assets/tetris_gameboy_theme.mp3", true);
      //update display
      setText("pausePlayButton","⏸");
    } else { //if the game isn't paused
      //stop the game
      stopTimedLoop(mainRunMethod);
      //stop the music
      stopSound("assets/tetris_gameboy_theme.mp3");
      //game is now paused
      isPaused = true;
      //update display
      setText("pausePlayButton","▶");
    }
  }
  
  onEvent("restartButton","click",function() {
    gameOver();
    if (getChecked("SFXCheck"))
      playSound("assets/button.mp3");
  });
  
  onEvent("backMainButton","click",function() {
    //reset game
    gameOver();
    //stop music
    stopSound();
    if (getChecked("SFXCheck")) //if sfx enabled
      playSound("assets/button.mp3"); //play a button noise
    if (getChecked("musicCheck")) { //if music enabled
      //start music
      playSound("Puyo-Puyon-(N64)---What-Doing--you-Play.mp3", true);
    }
    
    //stop game
    stopTimedLoop(mainRunMethod);
    //game has to be unpaused when starting it up later
    isPaused = false;
    //update display for later
    setText("pausePlayButton","⏸");
    
    //move to title screen
    setScreen("titleScreen");
  });
  
  onEvent("playScreen","mouseup",function() {
    //this is done so if the player presses down on a button
    //moves their mouse/finger off the button, and then lets go of screen
    left = false;
    up = false;
    right = false;
    down = false;
  });
  
  onEvent("playScreen","keydown",function(event) {
    var key = event.key;
    if (!isPaused) {
      switch (key) {
        case "Left":
          leftPressed();
          break;
        case "Up":
          upPressed();
          break;
        case "Right":
          rightPressed();
          break;
        case "Down":
          downPressed();
          break;
        case "z":
          bPressed();
          break;
        case "x":
          aPressed();
          break;
        case "c":
          cPressed();
          break;
        case " ": //spacebar
          pausePlay();
          break;
      }
    }
  });
  
  onEvent("playScreen","keyup",function(event) {
    var key = event.key;
    if (!isPaused) {
      switch (key) {
        case "Left":
          leftDepressed();
          break;
        case "Up":
          upDepressed();
          break;
        case "Right":
          rightDepressed();
          break;
        case "Down":
          downDepressed();
          break;
        case "z":
          bDepressed();
          break;
        case "x":
          aDepressed();
          break;
        case "c":
          cDepressed();
          break;
        case "Esc":
          gameOver();
          break;
        case " ":
          //upDepressed();
          break;
      }
    }
  });
  
  onEvent("leftButton","mousedown",leftPressed);
  onEvent("leftButton","mouseup",leftDepressed);
  //onEvent("leftButton","mouseout",leftDepressed);
  function leftPressed() {
    if (!isPaused) {
      if (!left) { //if this is the first press
        //instant movement
        mainPiece.moveLeft();
        //needs to update display
        needsToPaint = true;
        //sets a delay before the piece will start moving again
        ARRcounter = DAS;
      }
      //sets left to true
      left = true;
    }
  }
  function leftDepressed() {
    left = false;
  }
  
  onEvent("upButton","mousedown",upPressed);
  onEvent("upButton","mouseup",upDepressed);
  //onEvent("upButton","mouseout",leftDepressed);
  function upPressed() {
    up = true;
    
    hardDrop();
  }
  function upDepressed() {
    up = false;
  }
  
  onEvent("rightButton","mousedown",rightPressed);
  onEvent("rightButton","mouseup",rightDepressed);
  //onEvent("rightButton","mouseout",leftDepressed);
  function rightPressed() {
    if (!isPaused) {
      if (!right) { //if first press
        //instantly move
        mainPiece.moveRight();
        //needs to paint next frame
        needsToPaint = true;
        //sets a delay before the piece will start moving again
        ARRcounter = DAS;
      }
      right = true;
    }
  }
  function rightDepressed() {
    right = false;
  }
  
  onEvent("downButton","mousedown",downPressed);
  onEvent("downButton","mouseup",downDepressed);
  //onEvent("downButton","mouseout",leftDepressed);
  function downPressed() {
    down = true;
  }
  function downDepressed() {
    down = false;
  }
  
  onEvent("aButton","mousedown",aPressed);
  onEvent("aButton","mouseup",aDepressed);
  //onEvent("aButton","mouseout",leftDepressed);
  function aPressed() {
    //rotate piece
    if (!isPaused) { //dont want to rotate something when its paused
      mainPiece.rotateRight(); //rotate the piece right
      //if the piece intersects with anything
      if (intersectsWithWall(mainPiece) || intersectsWithFloor(mainPiece) || intersectsWithStack(mainPiece))
        //rotate it back
        mainPiece.rotateLeft();
      else
        //rotation successful! now just need to update image
        needsToPaint = true;
    }
  }
  function aDepressed() {
    
  }
  
  onEvent("bButton","mousedown",bPressed);
  onEvent("bButton","mouseup",bDepressed);
  //onEvent("bButton","mouseout",leftDepressed);
  function bPressed() {
    if (!isPaused) {//dont want to rotate something when its paused
      mainPiece.rotateLeft();//rotate the piece right
      //if the piece intersects with anything
      if (intersectsWithWall(mainPiece) || intersectsWithFloor(mainPiece) || intersectsWithStack(mainPiece))
        //rotate it back
        mainPiece.rotateRight();
      else
        //rotation successful! now just need to update image
        needsToPaint = true;
    }
  }
  function bDepressed() {
    
  }
  
  onEvent("cButton","mousedown",cPressed);
  onEvent("cButton","mouseup",cDepressed);
  function cPressed() {
    if (!isPaused) { //don't hold if its paused
      if (canHold) //if its allowed to hold
        mainPiece = holder.hold(); //hold it
      canHold = false; //player has to place a piece before it can hold again
      needsToPaint = true; //need to update display
    }
  }
  function cDepressed() {
    
  }


//CLASSES

  //Piece class
  function Piece(type, initialRotation, initialX, initialY) {
    //0I, 1J, 2L, 3O, 4S, 5T, 6Z
    this.type = type;
    
    //variable denoting the current rotation (0-3)
    //0 - Spawn State; 1 - One Clockwise Rotation; 
    //2 - Two (Counter)Clockwise Rotations; 3 - One Counter Clockwise Rotation
    this.rot = initialRotation;
    
    if ((typeof initialX === 'undefined') && (typeof initialY === 'undefined')) {
      this.x = 115;
      this.y = 50;
      if (this.type == 0 || this.type == 3) {
        this.x+=5;
        this.y+=5;
      }
    } else {
      this.x = initialX;
      this.y = initialY;
    }
      
    
    
    //functions
    this.getRotations = function getRotations(type) {
      //based on: https://static.wikia.nocookie.net/tetrisconcept/images/3/3d/
      //SRS-pieces.png/revision/latest?cb=20060626173148
      switch (type) {
        case 0:
          return [[-15,-5,5,15],[5,5,5,5]];
        case 1:
          return [[-10,-10,0,10],[10,0,0,0]];
        case 2:
          return [[-10,0,10,10],[0,0,0,10]];
        case 3:
          return [([-5,-5,5,5]),[5,-5,5,-5]];
        case 4:
          return [[-10,0,0,10],[0,0,10,10]];
        case 5:
          return [[-10,0,0,10],[0,0,10,0]];
        case 6:
          return [[-10,0,0,10],[10,0,10,0]];
      }
    };
    
    this.rotations = this.getRotations(this.type);
    
    this.getColor = function getColor(type) {
      switch(type) {
        case 0:
          return rgb(0,255,255);
        case 1:
          return rgb(0,0,255);
        case 2:
          return rgb(255,170,0);
        case 3:
          return rgb(255,255,0);
        case 4:
          return rgb(0,255,0);
        case 5:
          return rgb(150,0,255);
        case 6:
          return rgb(255,0,0);
      }
    };
    
    this.color = this.getColor(this.type);
    
    //list of blocks in the Piece
    this.blocks = [];
    for (var i = 0; i < 4; i++) {
      this.blocks[i] = new Block(this.x,this.y,this.color);
    }
    
    this.updateLocations = function updateLocations() {
      for (var i = 0; i < this.blocks.length; i++) {
        var tempX = this.x + this.rotations[0][i];
        var tempY = this.y - this.rotations[1][i]; //subtract because positive y is down
        this.blocks[i].setLocation(tempX,tempY);
      }
    };
    
    this.updateLocations();
    
    this.setLocations = function setLocations(x,y) {
      this.x = x;
      this.y = y;
      this.updateLocations();
    } ;
    
    this.draw = function draw() {
      for (var i = 0; i < this.blocks.length; i++) {
        this.blocks[i].draw();
      }
      if (showRotation) {
        setFillColor("white");
        rect(this.x+3,this.y+3,4,4);
      }
    };
    
    this.moveDown = function moveDown() {
      this.y+=10;
      this.updateLocations();
    };
    
    this.moveUp = function moveDown() {
      this.y-=10;
      this.updateLocations();
    };
    
    this.moveRight = function moveRight() {
      this.x+=10;
      this.updateLocations();
      
      if (intersectsWithWall(this) || intersectsWithStack(this)) {
        this.x-=10;
        this.updateLocations();
      }
    };
    
    this.moveLeft = function moveLeft() {
      this.x-=10;
      this.updateLocations();
      if (intersectsWithWall(this) || intersectsWithFloor(this) || intersectsWithStack(this)) {
        this.x+=10;
        this.updateLocations();
      }
    };
    
    this.rotateRight = function rotateRight() {
      var temp = this.rotations[0];
      this.rotations[0] = this.rotations[1];            //newx = oldy
      this.rotations[1] = multiplyListByFactor(temp,-1);//newy = -oldx
      this.updateLocations();
      
      this.rot++;
      if (this.rot > 3)
        this.rot = 0;
    };
    this.rotateLeft = function rotateLeft() {
      var temp = this.rotations[0];
      this.rotations[0] = multiplyListByFactor(this.rotations[1],-1); //newx = -oldy;
      this.rotations[1] = temp; //                                      newy = oldx;
      this.updateLocations();
      
      this.rot--;
      if (this.rot < 0)
        this.rot = 3;
        
      
    };
    
    for (i = 0; i < initialRotation; i++) {
      this.rotateRight();
    }
    
    this.place = function place() {
      for (var i = 0; i < this.blocks.length; i++) {
        appendItem(blockHolder,this.blocks[i]); //add all blocks in the piece to the main stack
      }
      //allows user to hold after placing a piece
      canHold = true;
    };
    
    this.getBlocks = function getBlocks() {
      return this.blocks;
    };
  }
  
  //Block class
  function Block(x,y,color){
    //constructor
    this.x = x;
    this.y = y;
    this.color = color;
    //methods
    this.draw = function draw() {
      setFillColor(this.color);
      rect(this.x,this.y,10,10);
    };
    this.moveDown = function moveDown() { //used to move block down after a line clear
      this.y+=10;
    };
    this.moveUp = function moveUp() { //unused
      this.y-=10;
    };
    this.setLocation = function setLocation(x,y) { //sets x and y based on input
      this.x = x;
      this.y = y;
    };
    this.intersects = function intersects(block) {
      return (this.x == block.x && this.y == block.y); //blocks are on a grid
    };
  }

  //Class to handle the NEXT pieces
  function NextUI() {
    //list to hold all next pieces
     this.nextPieces = [];
     //whether or not the next ui is enabled in settings
     this.enabled = getChecked("nextEnabledCheck");
     
     //number of pieces in the next sections
     var totalPieces = numNext;
     
     //add pieces to the next ui
     for (var i = 0; i < totalPieces; i++) {
       appendItem(this.nextPieces,randomizer.grabPiece());
     }
     
     //function that resets the next ui
    this.reset = function reset() {
      //resets next pieces
      this.nextPieces = []; 
      //adds pieces to the next array based on the slider in the settings
      for (var i = 0; i < numNext; i++) {
        appendItem(this.nextPieces,randomizer.grabPiece());
      }
      
      this.enabled = getChecked("nextEnabledCheck");
    };
     
    this.grabPiece = function grabPiece() {
      var returnPiece = this.nextPieces[0]; //grabs the first next piece
      for (var i = 1; i < this.nextPieces.length; i++) {
        //shift all the pieces down by one index
        this.nextPieces[i-1] = this.nextPieces[i];
      }
      //grab a new piece from the randomizer and add it to the end of the next array
      this.nextPieces[this.nextPieces.length-1] = randomizer.grabPiece();
  
       return returnPiece;
     };
     
     //function that paints the pieces and the background box
     this.draw = function draw() {
       //if next pieces are enabled in options
       if (this.enabled) {
         setFillColor("white");
         setStrokeColor("black");
         //draw the next box
         rect(175,50,55,25 + 25*numNext); //next box
         for (var i = 0; i < this.nextPieces.length; i++) {
           //create a clone of all the next Pieces
            var tempPiece = new Piece(this.nextPieces[i].type,0);
            //set locations to the next box
            tempPiece.setLocations(198,75+25*i);
            //draw the pieces
            tempPiece.draw();
         }
       }
     };
  }
  
  //class to handle the hold queue
  function HoldUI () {
    this.holdPiece = 0; //starts out empty, will be replaced by actual piece
    
    //holds the main piece and returns either the current held piece or a new piece
    //return {Piece} 
    this.hold = function hold() {
      //if there isnt a piece held
      if (this.holdPiece == 0) {
        //create a clone of the main piece and hold it
        this.holdPiece = new Piece(mainPiece.type,0);
        //return a new piece
        return nextHolder.grabPiece();
      } else {
        //temporarily hold the hold piece
        var temp = this.holdPiece;
        //set a clone of the main piece to the held piece
        this.holdPiece = new Piece(mainPiece.type,0);
        //return the original hold piece
        return temp;
      }
    };
    
    this.draw = function draw() {
      //if there's a piece held
      if (this.holdPiece != 0) { 
        //create a clone of the held piece
        var tempPiece = new Piece(this.holdPiece.type,0);
        //move it to the hold box
        tempPiece.setLocations(45,75);
        //draw the piece
        tempPiece.draw();
      }
    };
    
    this.reset = function reset() {
      this.holdPiece = 0; //clears value
    };
  }
  
  //Class that handles the randomizing of piece
  function pieceRandomizer() {
    this.defaultBag = [0,1,2,3,4,5,6];
    this.activeBag = this.defaultBag.slice(); //copys default bag to active bag
    
    //Each set of 7 pieces will have one of each kind of tetrimino
    //This way, the player won't get unlucky and not get a certain kind of piece
    
    this.grabPiece = function grabPiece() { //grabs a random piece from the current bag
      var random = randomNumber(0,this.activeBag.length-1);
      var returnNumber = this.activeBag[random]; //gets the type of piece to return
      removeItem(this.activeBag,random); //removes piece from the bag
      if (this.activeBag.length == 0) //if there is no more pieces in the bag
        this.reset(); //reset the bag
      return new Piece(returnNumber,0); //create a new piece from the type and returns it
    };
    
    this.reset = function reset() {
      this.activeBag = this.defaultBag.slice(); //takes a copy of the default bag
    };
    
  }
  

  //CREDITS
  
    //Menu Music: What Doing, You Play? | Puyo Puyo ~n (N64)
    //Tetris Theme: Type B | Tetris (Gameboy)
    //Button SFX: Puyo Puyo Tetris (PC, Switch, PS4, XBONE, etc.)
    //SFX for Clearing Lines and Tetrises | Tetris (NES)
    
    //All Graphics are done with Canvas Drawing or Design Mode, or a picture of the game itself
    
    //tetris wiki for information about rotation
    //https://tetris.fandom.com/wiki/SRS
   
    //My highscore is 209959. See if you can beat it ;)