
import { processAudioFromURL, preloadAudio } from "./audioProcessor.js";

// Select canvas and set up context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// Set up variables
let isGameRunning = false;
let score = 0;
let streak = 0;
let multiplier = 1;
let missedNotes = 0;
let notes = [];
let originalNotes = [];
const lanes = [0.2, 0.4, 0.6, 0.8];
const laneKeys = ['a', 's', 'd', 'f'];
let audioContext;
let audioBuffer;
let audioSource;
let audioStartTime = 0;
let pausedTime = 0;
let activeLongNote = null;
const TIMING_WINDOW = 160;

// Event listeners for game controls
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('audio-upload').addEventListener('change', handleAudioUpload);
document.getElementById('restart-button').addEventListener('click', restartGame);

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchend', handleTouchEnd);

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
            resumeAudio();
        }
        requestAnimationFrame(gameLoop);
    } else {
        if (audioSource) {
            pauseAudio();
        }
    }
}

// Handle audio upload
function handleAudioUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        alert("Please select a valid audio file.");
        return;
    }

    const file = files[0];
    const audioUrl = URL.createObjectURL(file);

    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    preloadAudio(audioUrl).then(buffer => {
        audioBuffer = buffer;
        return processAudioFromURL(audioUrl);
    }).then(syncedNotes => {
        notes = syncedNotes.map(note => ({
            lane: note.lane,
            y: -50 - note.time * 500,
            duration: note.duration,
            held: false
        }));
        originalNotes = JSON.parse(JSON.stringify(notes)); // Save original positions
    }).catch(error => {
        console.error("Error processing audio:", error);
        alert("Failed to process the audio file. Please try again.");
    });
}

// Function to play audio
function playAudio() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (audioBuffer && audioContext) {
        stopAudio();
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;
        audioSource.connect(audioContext.destination);
        audioStartTime = audioContext.currentTime - pausedTime;
        audioSource.start(0, pausedTime);
        pausedTime = 0;
    }
}

// Function to pause audio
function pauseAudio() {
    if (audioSource) {
        pausedTime = audioContext.currentTime - audioStartTime;
        stopAudio();
    }
}

// Function to resume audio
function resumeAudio() {
    if (audioBuffer && audioContext) {
        playAudio();
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

// Handle keydown events
function handleKeyDown(event) {
    const laneIndex = laneKeys.indexOf(event.key);
    if (laneIndex !== -1) {
        checkNoteHit(laneIndex);
    }
}

// Handle keyup events
function handleKeyUp(event) {
    if (activeLongNote) {
        activeLongNote.held = false;
        activeLongNote = null;
    }
}

// Handle touchstart events
function handleTouchStart(event) {
    const touchX = event.touches[0].clientX;
    const laneIndex = Math.floor((touchX / canvas.width) * 4);
    if (laneIndex >= 0 && laneIndex < lanes.length) {
        checkNoteHit(laneIndex);
    }
}

// Handle touchend events
function handleTouchEnd() {
    if (activeLongNote) {
        activeLongNote.held = false;
        activeLongNote = null;
    }
}

// Check if a note is hit
function checkNoteHit(laneIndex) {
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (note.lane === laneIndex && Math.abs(note.y - canvas.height * 0.9) < TIMING_WINDOW) {
            if (note.duration > 0) {
                note.held = true;
                activeLongNote = note;
                holdLongNoteScore(note);
            }
            notes.splice(i, 1);
            score += 10 * multiplier;
            streak++;
            multiplier = Math.min(5, 1 + Math.floor(streak / 10));
            updateScoreDisplay();
            return;
        }
    }
    streak = 0;
    multiplier = 1;
    updateScoreDisplay();
}

// Increment score for holding long notes
function holdLongNoteScore(note) {
    const interval = setInterval(() => {
        if (note.held) {
            score += 1;
            updateScoreDisplay();
        } else {
            clearInterval(interval);
        }
    }, 1);
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
        note.y += 5;
        if (note.y > canvas.height) {
            missedNotes++;
            if (missedNotes > 5) failState();
        }
    });
}

// Render game state
function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lanes.forEach((lane, index) => {
        ctx.fillStyle = 'gray';
        ctx.fillRect(lane * canvas.width - 20, 0, 40, canvas.height);
    });
    notes.forEach(note => {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(lanes[note.lane] * canvas.width, note.y, 20, 0, Math.PI * 2);
        ctx.fill();
        if (note.duration > 0) {
            const startY = note.y;
            const endY = startY + note.duration * 500;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(lanes[note.lane] * canvas.width - 10, startY, 20, endY - startY);
            ctx.beginPath();
            ctx.arc(lanes[note.lane] * canvas.width, endY, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Handle fail state
function failState() {
    isGameRunning = false;
    stopAudio();
    alert('Game Over!');
}

// Restart game
function restartGame() {
    isGameRunning = false;
    score = 0;
    streak = 0;
    multiplier = 1;
    missedNotes = 0;
    notes = JSON.parse(JSON.stringify(originalNotes)); // Reset to original positions
    pausedTime = 0;
    stopAudio();
    startGame();
}
