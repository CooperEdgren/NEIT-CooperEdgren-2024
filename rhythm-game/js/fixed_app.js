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
}

  if (!audioBuffer) {
    alert('Please upload an audio file first!');
    return;
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

function generateNotes() {
    const duration = audioBuffer.duration;
    const peaks = detectPeaks(audioBuffer.getChannelData(0));
  
    peaks.forEach(time => {
      const lane = lanes[Math.floor(Math.random() * lanes.length)];
      const note = { time, lane, y: -50, hit: false }; // Start y slightly above the screen
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
  activeKeys[key] = true;

  lanes.forEach(lane => {
    if (key === lane.key) {
      checkNoteHit(lane.x);
    }
  });
}

function handleKeyup(event) {
  const key = event.key.toUpperCase();
  activeKeys[key] = false;
}

const TIMING_WINDOW = 0.15;

function checkNoteHit(laneX) {
    const currentTime = audioContext.currentTime;
  
    notes.forEach(note => {
      const timingDifference = Math.abs(note.time - currentTime);
      const isCloseEnough = Math.abs(note.y - (canvas.height - 100)) < 15; // Adjust for hit area
  
      if (
        !note.hit &&
        timingDifference < TIMING_WINDOW &&
        note.lane.x === laneX &&
        isCloseEnough
      ) {
        note.hit = true;
        streak += 1;
        comboMultiplier = Math.min(1 + Math.floor(streak / 5), 5);
        score += 100 * comboMultiplier;
        console.log(`Hit! Score: ${score}, Streak: ${streak}, Multiplier: ${comboMultiplier}`);
      }
    });
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
  checkNoteHit(laneX);

  requestAnimationFrame(gameLoop);
}

function updateNotes(deltaTime) {
    const speed = 0.5; // Adjust speed for visible movement
    const currentTime = audioContext.currentTime;
  
    notes = notes.filter(note => {
      const missed = !note.hit && note.time < currentTime - TIMING_WINDOW;
      if (missed) {
        streak = 0; // Reset streak on miss
        comboMultiplier = 1;
        console.log('Missed Note:', note);
      }
      return !missed; // Remove missed notes
    });
  
    notes.forEach(note => {
      // Move notes down based on time
      if (!note.hit) {
        note.y += deltaTime * speed;
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
