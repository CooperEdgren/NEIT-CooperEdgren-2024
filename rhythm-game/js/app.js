let time = 0; // declare and initiallize time variable
let color = '#ffffff'; // declares color

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

const audioUpload = document.getElementById('audioUpload');
const startGameButton = document.getElementById('startGame');

let audioContext, audioBuffer, sourceNode, analyser, dataArray;
let notes = [];
let activeKeys = {}; // Tracks currently pressed keys
let score = 0;
let streak = 0;
let comboMultiplier = 1;
let gameActive = false;
let lastTimestamp = 0;

// Lanes for notes
const lanes = [
  { key: 'A', x: 150, color: '#ff4d4d' },
  { key: 'S', x: 300, color: '#4d94ff' },
  { key: 'D', x: 450, color: '#4dff4d' },
  { key: 'F', x: 600, color: '#ffff4d' },
];

audioUpload.addEventListener('change', handleAudioUpload);
startGameButton.addEventListener('click', startGame);
window.addEventListener('keydown', handleKeydown);
window.addEventListener('keyup', handleKeyup);

function handleAudioUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      const audioData = e.target.result;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioBuffer = await audioContext.decodeAudioData(audioData);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        console.log('Audio successfully uploaded and processed.');
      } catch (error) {
        alert('Error decoding audio file. Please upload a valid MP3 or WAV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert('No file selected. Please choose an audio file.');
  }
}


function startGame() {
    if (!audioBuffer) {
        alert('Please upload an audio file first!');
        return;
    }

    // Stop previous game states
    if (sourceNode) sourceNode.stop();
    gameActive = true;

    // Reset game variables
    notes = [];
    score = 0;
    streak = 0;
    comboMultiplier = 1;
    lastTimestamp = 0;

    // Clear the canvas before starting
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Prepare and start audio
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
    sourceNode.start();

    // Begin game loop
    requestAnimationFrame(gameLoop);


  if (!audioBuffer) {
    alert('Please upload an audio file first!');
    return;
  }

  function gameLoop(timestamp = 0) {
    if (!gameActive) return;
  
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLanes();
    updateNotes(deltaTime);
    drawNotes();
    drawScore();
    checkNoteHit(lane);
    adjustColorBrightness(color, amount);
    drawFeedback();
    togglePause();
    restartGame();
  
    requestAnimationFrame(gameLoop);
  }  

  // Reset game state
  notes = [];
  score = 0;
  streak = 0;
  comboMultiplier = 1;
  lastTimestamp = 0;
  gameActive = true;

  // Connect audio nodes
  sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);

  // Start audio playback
  sourceNode.start(0);
  generateNotes();
  gameLoop();
}

var lane = lanes[Math.floor(Math.random() * lanes.length)];
var note = { time, lane, y: -50, hit: false }; //Starts notes slightly off screen

function generateNotes() {
    const duration = audioBuffer.duration;
    const peaks = detectPeaks(audioBuffer.getChannelData(0));
  
    peaks.forEach(time => {
      notes.push(note);
      console.log('Generated Note:', note); // Debugging: Log note details
    });
  }
  

function detectPeaks(data) {
  const threshold = 0.5;
  const peaks = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i] > threshold) {
      peaks.push(i / audioBuffer.sampleRate);
      i += 10000; // Skip to reduce close detections
    }
  }
  return peaks;
}

function handleKeydown(event) {
  const key = event.key.toUpperCase();
  if (!activeKeys[key]) {
    console.log(`Key pressed: ${key}`);
  }
  activeKeys[key] = true;
}

function handleKeyup(event) {
  const key = event.key.toUpperCase();
  if (activeKeys[key]) {
    console.log(`Key released: ${key}`);
  }
  activeKeys[key] = false;
}


const TIMING_WINDOW = 0.15;
let feedbackMessage = '';
let feedbackTimer = 0;

function checkNoteHit(lane) {
    const currentTime = audioContext.currentTime;
    notes.forEach(note => {
        if (!note.hit && Math.abs(note.time - currentTime) < TIMING_WINDOW && note.lane.x === lane) {
            note.hit = true;
            feedbackMessage = 'Hit!';
            feedbackTimer = 30; // Display feedback for 30 frames
        }
    });
}

function drawFeedback() {
    if (feedbackTimer > 0) {
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText(feedbackMessage, canvas.width / 2, canvas.height - 120);
        feedbackTimer--;
    }
}

function togglePause() {
  gameActive = !gameActive;
  if (gameActive) {
      requestAnimationFrame(gameLoop);
  }
}


function updateNotes(deltaTime) {
  const speed = 0.1 * deltaTime; // Adjust speed factor for smooth movement
  notes = notes.filter(note => {
    const missed = !note.hit && note.y > canvas.height; // Remove notes falling past screen
    if (missed) {
      streak = 0; 
      comboMultiplier = 1;
      console.log('Missed Note:', note);
    }
    return !missed;
  });

  notes.forEach(note => {
    if (!note.hit) {
      note.y += speed; // Move notes downwards
    }
  });
}


function drawLanes() {
  lanes.forEach(lane => {
    ctx.fillStyle = lane.color;
    ctx.fillRect(lane.x - 25, 0, 50, canvas.height);
    // Draw the judgment line
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 100); // Near the bottom of the screen
    ctx.lineTo(canvas.width, canvas.height - 100);
    ctx.stroke();


    if (activeKeys[lane.key]) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(lane.x - 25, canvas.height - 100, 50, 100);
    }
  });
}

function drawNotes() {
    notes.forEach(note => {
      if (note.y >= 0 && note.y <= canvas.height) {
        // Create a slightly darker or lighter color for the notes
        const noteColor = note.hit ? 'gray' : adjustColorBrightness(note.lane.color, -30);
  
        // Draw the note
        ctx.fillStyle = noteColor;
        ctx.beginPath();
        ctx.arc(note.lane.x, note.y, 10, 0, Math.PI * 2);
        ctx.fill();
  
        // Optional: Add a border for better visibility
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }


  function adjustColorBrightness(color, amount) {
    // Extract RGB values from the hex color
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(Math.min((num >> 16) + amount, 255), 0);
    const g = Math.max(Math.min(((num >> 8) & 0x00FF) + amount, 255), 0);
    const b = Math.max(Math.min((num & 0x0000FF) + amount, 255), 0);
  
    return `rgb(${r},${g},${b})`;
}
  
  

function drawScore() {
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Streak: ${streak}`, 10, 60);
  ctx.fillText(`Multiplier: x${comboMultiplier}`, 10, 90);
}

function restartGame() {
    // Reset all game states
    gameActive = false;
    notes = [];
    score = 0;
    streak = 0;
    comboMultiplier = 1;
    lastTimestamp = 0;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stop any ongoing audio
    if (sourceNode) {
        sourceNode.stop();
    }

    // Restart the game
    startGame();
}


function gameLoop(timestamp = 0) {
  if (!gameActive) return;

  const deltaTime = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLanes();
  updateNotes(deltaTime);
  drawNotes();
  drawScore();
  checkNoteHit(lane);
  adjustColorBrightness(color, amount);
  drawFeedback();
  togglePause();
  restartGame();

  requestAnimationFrame(gameLoop);
}

