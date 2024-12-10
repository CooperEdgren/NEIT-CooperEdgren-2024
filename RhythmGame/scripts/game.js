
// Select canvas and set up context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth * 0.75;
canvas.height = window.innerHeight * 0.75;

// Set up variables
let isGameRunning = false;
let score = 0;
let streak = 0;
let multiplier = 1;
let missedNotes = 0;
let notes = []; // Array to store notes
const lanes = [0.2, 0.4, 0.6, 0.8]; // Lane positions as percentages

// Event listeners for game controls
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('audio-upload').addEventListener('change', handleAudioUpload);

// Function to start the game
function startGame() {
    if (!isGameRunning) {
        isGameRunning = true;
        requestAnimationFrame(gameLoop);
    }
}

// Function to toggle pause
function togglePause() {
    isGameRunning = !isGameRunning;
    if (isGameRunning) requestAnimationFrame(gameLoop);
}

// Function to handle audio upload and generate notes
function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const audioContext = new AudioContext();
        const reader = new FileReader();
        reader.onload = function(e) {
            audioContext.decodeAudioData(e.target.result, function(buffer) {
                generateNotes(buffer);
            });
        };
        reader.readAsArrayBuffer(file);
    }
}

// Function to generate notes from audio (simplified logic)
function generateNotes(buffer) {
    const duration = buffer.duration;
    const noteCount = Math.floor(duration * 2); // Example: 2 notes per second
    for (let i = 0; i < noteCount; i++) {
        notes.push({
            lane: Math.floor(Math.random() * 4), // Random lane
            y: -50 - i * 150 // Staggered vertical positions
        });
    }
}

// Game loop
function gameLoop() {
    if (!isGameRunning) return;
    updateGame();
    renderGame();
    requestAnimationFrame(gameLoop);
}

// Update game state
function updateGame() {
    notes.forEach(note => {
        note.y += 5; // Move notes down
        if (note.y > canvas.height) {
            missedNotes++;
            if (missedNotes > 5) failState();
        }
    });
}

// Render game state
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lanes
    lanes.forEach((lane, index) => {
        ctx.fillStyle = 'gray';
        ctx.fillRect(lane * canvas.width - 20, 0, 40, canvas.height);
    });

    // Draw notes
    notes.forEach(note => {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(lanes[note.lane] * canvas.width, note.y, 20, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Handle fail state
function failState() {
    isGameRunning = false;
    alert('Game Over!');
}
