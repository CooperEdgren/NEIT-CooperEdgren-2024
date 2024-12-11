import { processAudioFromURL, preloadAudio } from "./audioProcessor.js";
document.addEventListener('DOMContentLoaded', () => {
// Select canvas and set up context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;
const visualizerCanvas = document.getElementById('visualizer-canvas');
const visualizerCtx = visualizerCanvas.getContext('2d');
visualizerCanvas.width = canvas.width;
visualizerCanvas.height = canvas.height;

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
let analyser; // Global variable for the analyser node
const activeLanes = [false, false, false, false];



// Event listeners for game controls
document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('audio-upload').addEventListener('change', handleAudioUpload);
document.getElementById('restart-button').addEventListener('click', restartGame);

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchend', handleTouchEnd);

// Function to render visualizer
function renderVisualizer() {
    if (!analyser || !isGameRunning) return;

    requestAnimationFrame(renderVisualizer);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;

        visualizerCtx.fillStyle = `rgb(${barHeight + 100}, 50, 150)`;
        visualizerCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

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

        // Set up analyser node
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        // Connect nodes
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);

        audioSource.start(0);
        renderVisualizer(); // Start visualizer rendering
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
        activeLanes[laneIndex] = true; // Set lane as active
        checkNoteHit(laneIndex);
    }
}


// Handle keyup events
function handleKeyUp(event) {
    const laneIndex = laneKeys.indexOf(event.key);
    if (laneIndex !== -1) {
        activeLanes[laneIndex] = false; // Set lane as inactive
    }
    if (activeLongNote && activeLongNote.lane === laneIndex) {
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
    const scoreElement = document.getElementById('score');
    const streakElement = document.getElementById('streak');
    const multiplierElement = document.getElementById('multiplier');

    console.log('Score Element:', scoreElement);
    console.log('Streak Element:', streakElement);
    console.log('Multiplier Element:', multiplierElement);

    if (scoreElement) scoreElement.textContent = score;
    if (streakElement) streakElement.textContent = streak;
    if (multiplierElement) multiplierElement.textContent = `${multiplier}x`;
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

    // Draw lanes with highlight if active
    lanes.forEach((lane, index) => {
        if (activeLanes[index]) {
            // Create gradient
            const gradient = ctx.createLinearGradient(
                lane * canvas.width - 20, 0, lane * canvas.width + 20, canvas.height
            );
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = 'gray';
        }
        ctx.fillRect(lane * canvas.width - 20, 0, 40, canvas.height);
    });
        // Draw timing window line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.9 - TIMING_WINDOW);
        ctx.lineTo(canvas.width, canvas.height * 0.9 - TIMING_WINDOW);
        ctx.stroke();
        //Draw Notes
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

});
