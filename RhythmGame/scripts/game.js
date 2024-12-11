import { processAudio } from ".audioProcessor.js";

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
const laneKeys = ['a', 's', 'd', 'f']; // Keys for lanes
let audioContext;
let audioBuffer;
let audioSource;
const TIMING_WINDOW = 160; // Timing window in pixels

// Event listeners for game controls
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('audio-upload').addEventListener('change', handleAudioUpload);

// Add restart button functionality
document.getElementById('restart-button').addEventListener('click', restartGame);

document.addEventListener('keydown', handleKeyDown);
canvas.addEventListener('touchstart', handleTouchStart);

// Function to start the game
function startGame() {
    if (!isGameRunning) {
        if (audioBuffer) {
            playAudio();
        }
        isGameRunning = true;
        requestAnimationFrame(gameLoop);
    }
}

// Function to toggle pause
function togglePause() {
    isGameRunning = !isGameRunning;
    if (isGameRunning) {
        if (audioSource) {
            audioContext.resume();
        }
        requestAnimationFrame(gameLoop);
    } else {
        if (audioSource) {
            audioContext.suspend();
        }
    }
}

// Updated function to handle audio upload
function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        
        const reader = new FileReader();
        reader.onload = function (e) {
            audioContext.decodeAudioData(e.target.result, function (buffer) {
                audioBuffer = buffer;

                // Use processAudio to generate synced notes
                processAudio(buffer, audioContext.sampleRate).then(syncedNotes => {
                    notes = syncedNotes.map(note => ({
                        lane: note.lane,
                        y: -50 - note.time * 500, // Convert time to y-position
                    }));

                    console.log('Generated synced notes:', notes);
                });
            });
        };

        reader.readAsArrayBuffer(file);
    }
}




// Function to play audio
function playAudio() {
    if (audioBuffer && audioContext) {
        stopAudio(); // Stop any previous audio
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioContext.destination);
        audioSource.start(0);
    }
}

// Function to stop audio
function stopAudio() {
    if (audioSource) {
        audioSource.stop();
        audioSource.disconnect();
        audioSource = null;
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

// Handle keydown events
function handleKeyDown(event) {
    const laneIndex = laneKeys.indexOf(event.key);
    if (laneIndex !== -1) {
        checkNoteHit(laneIndex);
    }
}

// Handle touchstart events
function handleTouchStart(event) {
    const touchX = event.touches[0].clientX;
    const laneIndex = Math.floor((touchX / canvas.width) * 4); // Map touch to lane
    if (laneIndex >= 0 && laneIndex < lanes.length) {
        checkNoteHit(laneIndex);
    }
}

// Check if a note is hit
function checkNoteHit(laneIndex) {
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (note.lane === laneIndex && Math.abs(note.y - canvas.height * 0.9) < TIMING_WINDOW) {
            // Remove the note and update score
            notes.splice(i, 1);
            score += 10 * multiplier;
            streak++;
            multiplier = Math.min(5, 1 + Math.floor(streak / 10)); // Max multiplier is 5x
            updateScoreDisplay();
            return;
        }
    }
    // Miss if no note is close enough
    streak = 0;
    multiplier = 1;
    updateScoreDisplay();
}

// Update score display
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
    document.getElementById('streak').textContent = streak;
    document.getElementById('multiplier').textContent = `${multiplier}x`;
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
    stopAudio(); // Stop audio on fail
    alert('Game Over!');
}

// Function to restart the game
function restartGame() {
    isGameRunning = false;
    score = 0;
    streak = 0;
    multiplier = 1;
    missedNotes = 0;
    notes = [];
    stopAudio(); // Stop current audio
    if (audioBuffer) {
        generateNotes(audioBuffer); // Regenerate notes
    }
    updateScoreDisplay();
    startGame();
}
