
// Setup Variables

var database = firebase.database();
var playerArray;
var turn = 1;
var wins = 0;
var losses = 0;
var playNum = 0;
var enemy = 0;
var actions = ["Rock", "Paper", "Scissors"];
var activeRound = false;
var winner = 0;
// var chatArray =["Welcome"];
console.log("restart");
// ######## DB MONITORING ##############

// start monitoring for player and turn changes
// use the global playerArray variable to grab and propagate the new data
database.ref().on("value", function (snapshot) {

  // Print the initial data to the console.
  playerSnap = snapshot.val();
  console.log(playerSnap);

  // call game function with every change in DB
  game();

  // If any errors are experienced, log them to console.
}, function (errorObject) {
  console.log("Error: " + errorObject.code);
});


// ######## INITIAL GAME STARTUP ##############

// Game Start Button
$("#add-name").on("click", function (event) {
  event.preventDefault();

  // Get Player Name
  var playerName = $("#player-name").val().trim();

  // make initial object for insertion into DB
  var playerData = {
    name: playerName,
    choice: "none",
    wins: wins,
    losses: losses
  }

  // XXXX  TEST FOR CURRENT GAME STATE IN DB XXXXXX

  // case of no players at all
  if (jQuery.isEmptyObject(playerSnap)) {
    playNum = 1;
    enemy = 2;
    console.log("player is first data and One");
  }
  // case of players but no player 1
  else {
    if (jQuery.isEmptyObject(playerSnap.player[1])) {
      playNum = 1;
      enemy = 2;
      console.log("player is One");
    }
    // case of players but no player 2
    else {
      if (jQuery.isEmptyObject(playerSnap.player[2])) {
        playNum = 2;
        enemy = 1;
        console.log("player is Two" + playNum);
      }
      else {
        // case of both players - use playNum0 as flag to stop future actions
        playNum = 0;
        console.log("Game is full");
      }
    }
  };

  // assuming not in game full state, write out data using playNum to hit correct field

  if (playNum > 0) {
    database.ref("/player/" + playNum).set(playerData);
    database.ref("/turn").set(turn);
    // database.ref("/chat").set(chatArray);

    // Set remove function to remove data on disconnect
    database.ref("/player/" + playNum).onDisconnect().remove();
    database.ref("/turn").onDisconnect().remove();
    database.ref("/chat").onDisconnect().remove();

    console.log("player: " + playNum);
    // Clear the name form and playStatus (case of full game getting in) and welcome player
    $("#name-form").empty();
    $("#playStatus").empty();

    // write out welcome
    $("#name-form").html(`<div><p>Hello ${playerName}!  You are Player ${playNum}.</p></div>`);
    // write name in appropriate player box
    $("#playerDisplay-" + playNum).html(`<div class="name"><p>${playerName}</p></div>`);
  }
  // write out message for case of full game
  else {
    $("#playStatus").append("<div><p>Game is full, please check back....</p></div>");
    console.log("game is full - come back")
    // if extra time, add monitoring and alert function using interval timer
  };

});

// ######## GAME FUNCTION THAT EXECUTES EVERY DB CHANGE ##############

function game() {
  console.log("function game()")

  //  Code for when there is an opponent
  if (!jQuery.isEmptyObject(playerSnap.player[enemy])) {
    $("#playerDisplay-" + enemy).html(`<div class="name"><p>${playerSnap.player[enemy].name}</p></div>`);

    // display who's turn it is
    if (playerSnap.turn === playNum) {
      var message = "It's Your Turn!"
    }
    else {
      var message = "Waiting for " + playerSnap.player[enemy].name + " to choose."
    };
    $("#messages").html(`<p>${message}</p>`);

    // Code to put Opponent's pick in box if ready
    // activeround flag to avoid putting last round data into DOM
    if (activeRound && (playerSnap.player[enemy].choice !== "none")) {
      $("#playerAction-" + enemy).empty();
      $("#playerAction-" + enemy).html(`<p class="pick">${playerSnap.player[enemy].choice}</div>`);
      winLose();
    };

    // Draw selector buttons

    buttons();


  } //  Code for when there is NOT an opponent
  else {
    $("#playerDisplay-" + enemy).html(`<div><p>Waiting for Player ${enemy}</p></div>`);
    $("#playerAction-" + playNum).empty();
    $("#messages").empty();
    $("#chat-messages").empty();
    // reset win/loss to 0 when someone leaves  but a flag to stop it on first connect
    if (playNum !== 0) {
      database.ref("/player/" + playNum + "/wins").set(0);
      database.ref("/player/" + playNum + "/losses").set(0);
      $("#playerScore-" + playNum).html(`<div><p>Wins: 0 Losses: 0 </p></div>`);
    };

  }
 
};
chat();


// ######## BUTTON DRAW and CHOICES WRITE- gets called when there is opponent ##############

function buttons() {
  console.log("function buttons()")

  // make it so it doesn't redraw over picks
  if (!activeRound) {
    // Generate Game Choices (being lazy and using GIFY project code)
    $("#playerAction-" + playNum).empty();

    // Looping through the array of actions
    for (var i = 0; i < actions.length; i++) {

      var but = $("<button>");
      // Adding a class of subject-btn to our button
      but.addClass("action-btn");
      // Adding a data-attribute
      but.attr("data-name", actions[i]);
      // Providing the initial button text
      but.text(actions[i]);
      // Adding the button to the buttons-view div
      $("#playerAction-" + playNum).append(but);
    }

    $(".action-btn").on("click", function () {
      pick = $(this).attr("data-name");
      console.log(pick);

      // use DB turn if we can enter data, also use activeROund flag to avoid errant
      // DOM rewrites or data entry - turns field indicates which play is up.

      if (playerSnap.turn === playNum) {
        activeRound = true;
        // write choice and switch turns to firebase
        database.ref("/player/" + playNum + "/choice").set(pick);
        database.ref("/turn").set(enemy);
      };
    });
  };
  if (activeRound) {
    // write choice out in window (also clears buttons so I don't have to stop them)
    $("#playerAction-" + playNum).empty();
    $("#playerAction-" + playNum).html(`<p class="pick">${pick}</div>`);
  };
  $("#playerScore-" + playNum).html(`<div><p>Wins: ${playerSnap.player[playNum].wins} Losses: ${playerSnap.player[playNum].losses}</p></div>`);
};


// ######## GAME WIN/LOSE logic- gets called when there are two choices ##############


function winLose() {
  console.log("function winLose()")

  var oneGuess = playerSnap.player[1].choice;
  var twoGuess = playerSnap.player[2].choice

  // yoinked this from earlier RPS activity, but use winner flag to indicate winner or tie(0)
  if (oneGuess === twoGuess) {
    winner = 0;
  } else if (oneGuess === 'Rock' && twoGuess === 'Paper') {
    winner = 2;
  } else if (oneGuess === 'Rock' && twoGuess === 'Scissors') {
    winner = 1;
  } else if (oneGuess === 'Paper' && twoGuess === 'Rock') {
    winner = 1;
  } else if (oneGuess === 'Paper' && twoGuess === 'Scissors') {
    winner = 2;
  } else if (oneGuess === 'Scissors' && twoGuess === 'Paper') {
    winner = 1;
  } else if (oneGuess === 'Scissors' && twoGuess === 'Rock') {
    winner = 2;
  }

  console.log("winner is: " + winner);

  // Display winner and action for 1.5 secs, then cleanup game, cleanup DB entry kicks off new round

  setTimeout(resetRound, 1500);

  if (winner > 0) {
    $("#playStatus").html(`<p class="winner">The winner is ${playerSnap.player[winner].name}!</div>`);
    if (winner === 1) {
      $("#playStatus").append(`<p class="winner">${oneGuess} beats ${twoGuess}!</div>`);
    }
    else {
      $("#playStatus").append(`<p class="winner">${twoGuess} beats ${oneGuess}!</div>`);
    }
  }
  else {
    $("#playStatus").html(`<p class="winner">It was a Tie!</div>`);
  }


};

// ######## ROUND RESET - clears choices and DOM, records W/L - gets called after round-matchup ##############

function resetRound() {
  console.log("function resetRound()")
  activeRound = false;
  // each player clears their own choice (none is used for flag in game logic)
  database.ref("/player/" + playNum + "/choice").set("none");

  if (winner == playNum) {
    database.ref("/player/" + playNum + "/wins").set(playerSnap.player[playNum].wins + 1);
  }
  else if (winner == enemy) {
    database.ref("/player/" + playNum + "/losses").set(playerSnap.player[playNum].losses + 1);
  };

  $("#playStatus").empty();
  $("#playerAction-" + enemy).empty();


  winner = 0;

};

// ######## CHAT WINDOW FUNCTIONS ##############

function chat(){

  // setup DB change listener and write to window with changes.
  database.ref("/chat/").orderByChild("dateAdded").limitToLast(1).on("child_added", function(childSnapshot) {       
    var msgOut = childSnapshot.val();
    console.log(msgOut);
    $("#chat-messages").append(`<p>${msgOut}</p>`);
  });

  // Setup button listener for new chat submission
    $("#add-msg").on("click", function (chatevent) {
      chatevent.preventDefault();
    // Get data
    var chatMessage = $("#chat-msg").val().trim();

  // logic to not do anything until there are two players (didn't want to embed this function in other calls because they're hit too much)
  if (!jQuery.isEmptyObject(playerSnap.player[enemy])) {

    var newMsg=playerSnap.player[playNum].name + ": "+ chatMessage;
    database.ref("/chat/").push(newMsg);
    }
    else{
      $("#chat-messages").empty();
      $("#chat-messages").text("waiting for other player");
    };
  });
};

// working on changing selector window color, had to quit due to time.

// function selectorWindow(who) {
//   var inputVal = document.getElementById(`"#${who}"`);
//       console.log("selector: ",who)
//       inputVal.style.borderColor = "yellow";
// };





