import {processAudioFromURL} from "./audioProcessor.js";
import {setupVisualizer} from "./visualizer.js";
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
let lastUpdate = 0;
const FRAME_RATE = 60; // Target FPS
let score = 0;
let streak = 0;
let multiplier = 1;
let missedNotes = 0;
let notes = [];
let originalNotes = [];
const lanes = [0.2, 0.4, 0.6, 0.8];
const laneKeys = ['a', 's', 'd', 'f'];
let audioContext = null;
let audioBuffer;
let audioSource;
const audioStartTime = 0;
let pausedTime = 0;
let onsets = [];
let detectedTempo = 0;
let activeLongNote = null;
const TIMING_WINDOW = 160;
let analyser; // Global variable for the analyser node
const activeLanes = [false, false, false, false];
const particles = [];
const colors = ['rgba(255, 0, 0, 1)', 'rgba(0, 255, 0, 1)', 
    'rgba(0, 0, 255, 1)', 'rgba(255, 255, 0, 1)'];
let noteGenerationMode = "pitch"; // Default to pitch detection

    // Listen for dropdown changes
    document.getElementById("note-generation-mode").addEventListener("change", (event) => {
        noteGenerationMode = event.target.value;
        console.log(`Note Generation Mode set to: ${noteGenerationMode}`);
    });
    
    document.getElementById("note-generation-mode").addEventListener("change", (event) => {
        noteGenerationMode = event.target.value;
        const modeText = noteGenerationMode === "pitch" ? "Pitch Detection" : "Onset Detection";
        document.getElementById("current-mode").textContent = `Current Mode: ${modeText}`;
    });
    
// Event listeners for game controls
const startButton = document.getElementById('start-button');
if (startButton) {
    startButton.addEventListener('click', startGame);
} else {
    console.error("Start button not found in the DOM.");
}

const pauseButton = document.getElementById('pause-button');
if (pauseButton) {
    pauseButton.addEventListener('click', togglePause);
} else {
    console.error("Pause button not found in the DOM.");
}

const uploadAudio = document.getElementById('upload-audio');
if (uploadAudio) {
    uploadAudio.addEventListener('change', handleAudioUpload);
} else {
    console.error("Upload audio input not found in the DOM.");
}

const restartButton = document.getElementById('restart-button');
if (restartButton) {
    restartButton.addEventListener('click', restartGame);
} else {
    console.error("Restart button not found in the DOM.");
}

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

    // Draw bars
    const barWidth = visualizerCanvas.width / bufferLength;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        visualizerCtx.fillStyle = `rgb(${barHeight + 50}, 50, ${255 - barHeight})`;
        visualizerCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }

    // Render pulse effect
    renderPulse(detectedTempo); // Pass the detected tempo to the pulse renderer
}

// Function to start the game
/**
 * Starts the game by initializing the game loop and audio playback.
 * Ensures the game state is set to running.
 */
function startGame() {
    if (!isGameRunning) {
        if (audioBuffer) {
            playAudio();
        }
        isGameRunning = true;
        requestAnimationFrame(() => gameLoop(detectedTempo)); // Pass detectedTempo
    }
}

// Function to toggle pause
/**
 * Toggles the game between paused and running states.
 * Pauses or resumes audio playback based on the game state.
 */
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
/**
 * Handles the audio file upload event.
 * Processes the uploaded audio file to generate notes, tempo, and onsets.
 * @param {Event} event - The file input change event.
 */
async function handleAudioUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) {
        alert("Please select a valid audio file.");
        return;
    }

    const file = files[0];
    const audioUrl = URL.createObjectURL(file);

    try {
        console.log("Uploading audio file:", file.name);
        console.log("Generated audio URL:", audioUrl);

        const { notes, tempo, onsets } = await processAudioFromURL(audioUrl);

        if (!notes || notes.length === 0) {
            throw new Error("No notes were generated.");
        }

        setGameNotes(notes);
        setGameTempo(tempo);

        console.log("Notes loaded:", notes);
        console.log("Tempo detected:", tempo);
    } catch (error) {
        console.error("Error processing audio:", error);
        alert("Failed to process the audio file.");
    }
}

async function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("AudioContext resumed");
    }

    return audioContext;
}

// Function to play audio
/**
 * Plays the uploaded audio file using the Web Audio API.
 * Initializes the analyser for the visualizer and connects the audio graph.
 */
function playAudio() {
    const audioContext = getAudioContext();
    // Ensure the AudioContext is not suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("AudioContext resumed");
        });
    }
    if (audioBuffer && audioContext) {
        stopAudio();
        audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        //Audio Connection
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
        
        console.log("Starting audio playback...");
        audioSource.start(0);
        
        console.log("AudioSource connected:", audioSource);
        
    source.buffer = audioBuffer; // Replace loadedAudioBuffer with audioBuffer
    source.connect(audioContext.destination);
    source.start(0);

        console.log("Audio playback started");
    } else {
        console.error("Audio buffer not loaded or AudioContext not initialized.");
    }
        // Set up the visualizer
        setupVisualizer(audioContext, audioSource, 'visualizer-canvas');
    
}

// Function to pause audio
/**
 * Pauses the audio playback by stopping the audio source.
 * Stores the current playback time for resumption.
 */
function pauseAudio() {
    if (audioSource) {
        pausedTime = audioContext.currentTime - audioStartTime;
        stopAudio();
    }
}

// Function to resume audio
/**
 * Resumes audio playback from the previously paused time.
 * Reinitializes the audio source if required.
 */
function resumeAudio() {
    if (audioBuffer && audioContext) {
        playAudio();
    }
}

// Function to stop audio
/**
 * Stops the currently playing audio.
 * Disconnects the audio source and resets it to null.
 */
function stopAudio() {
    if (audioSource) {
        console.log("Stopping audio playback...");
        audioSource.stop();
        audioSource.disconnect();
        audioSource = null;
    }
}
/**
 * Sets the notes array to the provided value.
 * @param {Array<Object>} newNotes - The new notes array to set.
 */

function setGameNotes(newNotes) {
    notes = newNotes;
}

// Handle keydown events
function handleKeyDown(event) {
    const laneIndex = laneKeys.indexOf(event.key);
    if (laneIndex !== -1) {
        activeLanes[laneIndex] = true;
        checkNoteHit(laneIndex);

        if (activeLongNote && activeLongNote.lane === laneIndex) {
            holdLongNoteScore(activeLongNote);
        }
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

        if (activeLongNote && activeLongNote.lane === laneIndex) {
            holdLongNoteScore(activeLongNote);
        }
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
/**
 * Checks if a note is hit within the timing window for a given lane.
 * Updates the score, streak, and multiplier if the note is hit.
 * @param {number} laneIndex - The index of the lane to check.
 */
function checkNoteHit(laneIndex) {
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        if (note.lane === laneIndex && Math.abs(note.y - canvas.height * 0.9) < TIMING_WINDOW) {
            createParticles(lanes[laneIndex] * canvas.width, canvas.height * 0.9, colors[laneIndex]);
            notes.splice(i, 1); // Remove the hit note
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
/**
 * Sets the detected game tempo.
 * @param {number} tempo - The tempo of the uploaded audio in beats per minute.
 */
function setGameTempo(tempo) {
    detectedTempo = tempo;
}

// Increment score for holding long notes
/**
 * Increments the score for holding a long note.
 * Continuously updates the score while the note is held.
 * @param {Object} note - The long note object being held.
 */
function holdLongNoteScore(note) {
    const interval = setInterval(() => {
        if (note.held) {
            score += 1;
            updateScoreDisplay();
        } else {
            clearInterval(interval);
        }
    }, 100); // Adjust interval to reasonable timing
}

// Update score display
/**
 * Updates the score, streak, and multiplier display in the DOM.
 * Ensures the displayed values reflect the current game state.
 */
function updateScoreDisplay() {
    const scoreElement = document.getElementById('score');
    const streakElement = document.getElementById('streak');
    const multiplierElement = document.getElementById('multiplier');

    if (scoreElement) scoreElement.textContent = score;
    if (streakElement) streakElement.textContent = streak;
    if (multiplierElement) multiplierElement.textContent = `${multiplier}x`;
}


// Game loop
/**
 * Main game loop responsible for updating and rendering the game state.
 * Called recursively using `requestAnimationFrame`.
 * @param {number} timestamp - The current time provided by `requestAnimationFrame`.
 */
function gameLoop(timestamp) {
    if (!isGameRunning) return;

    if (timestamp - lastUpdate >= 1000 / FRAME_RATE) {
        updateGame();
        renderGame();
        renderVisualizer();
        lastUpdate = timestamp;
    }

    requestAnimationFrame(gameLoop);
}

// Update game state
/**
 * Updates the game state, including note positions and missed notes.
 * Handles game over logic if too many notes are missed.
 */
function updateGame() {
    notes.forEach(note => {
        note.y += 5;
        if (note.y > canvas.height) {
            missedNotes++;
            if (missedNotes > 5) failState();
        }
    });
}
/**
 * Creates particle effects at the specified position for visual feedback.
 * @param {number} x - The x-coordinate of the particle effect.
 * @param {number} y - The y-coordinate of the particle effect.
 * @param {string} color - The color of the particles.
 */
function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) { // Create multiple particles per note hit
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4, // Random horizontal velocity
            vy: (Math.random() - 0.5) * 4, // Random vertical velocity
            alpha: 1, // Opacity
            color: color || `rgba(${Math.random() * 255}, ${Math.random() * 255}, 0, 1)` // Random color if not provided
        });
    }
}
/**
 * Renders all active particles on the canvas.
 * Updates particle positions and removes faded particles.
 * @param {CanvasRenderingContext2D} ctx - The rendering context of the canvas.
 */
function renderParticles(ctx) {
    const particlesToRemove = [];

    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= 0.02; // Gradually fade out

        if (particle.alpha <= 0) {
            particlesToRemove.push(index);
            return;
        }

        ctx.fillStyle = particle.color.replace(/, 1\)/, `, ${particle.alpha})`); // Update alpha in color
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Remove faded particles
    particlesToRemove.reverse().forEach(index => particles.splice(index, 1));
}
/**
 * Renders a pulse effect on the visualizer canvas based on the detected tempo.
 * The intensity of the pulse is tied to the current beat.
 * @param {number} tempo - The detected tempo in beats per minute.
 */
function renderPulse(tempo) {
    const pulseInterval = 60 / tempo; // Seconds per beat
    const currentTime = audioContext.currentTime;

    // Calculate pulse intensity based on time
    const pulseIntensity = Math.abs(Math.sin((currentTime % pulseInterval) * Math.PI / pulseInterval));

    visualizerCtx.save();
    visualizerCtx.globalAlpha = pulseIntensity * 0.5; // Adjust opacity
    visualizerCtx.fillStyle = 'rgba(255, 50, 50, 1)';
    visualizerCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    visualizerCtx.restore();
}
/**
 * Highlights a lane briefly to indicate an onset event.
 * @param {number} onset - The onset time of the event.
 * @param {number} laneIndex - The index of the lane to highlight.
 */
function highlightLane(onset, laneIndex) {
    const elapsedTime = audioContext.currentTime - onset;
    const opacity = Math.max(0, 1 - elapsedTime / 0.5); // Fade over 0.5 seconds

    ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
    ctx.fillRect(lanes[laneIndex] * canvas.width - 20, 0, 40, canvas.height);
}

// Render game state
/**
 * Renders the game state on the canvas.
 * Draws lanes, notes, and particles, and highlights active lanes or onsets.
 */
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
    onsets.forEach((onset, index) => {
        if (audioContext.currentTime - onset < 0.5) {
            highlightLane(onset, index % lanes.length); // Rotate through lanes
        }
    });
    
        // Draw timing window line
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.9 - TIMING_WINDOW);
        ctx.lineTo(canvas.width, canvas.height * 0.9 - TIMING_WINDOW);
        ctx.stroke();
        //Draw Notes
        console.log("Rendering notes:", notes);
        notes.forEach(note => {
            const currentTime = audioContext.currentTime - audioStartTime; // Sync with audio playback
            note.y = canvas.height - (currentTime - note.time) * 50; // Adjust y-position based on time
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(lanes[note.lane] * canvas.width, note.y, 20, 0, Math.PI * 2);
        ctx.fill();
        console.log("Rendering notes:", notes);
    });
        // Render particles
        renderParticles(ctx);
}

// Handle fail state
function failState() {
    isGameRunning = false;
    stopAudio();
    alert('Game Over!');
}

// Restart game
/**
 * Restarts the game by resetting all game state variables.
 * Resets the notes to their original positions and stops audio playback.
 */
function restartGame() {
    isGameRunning = false;
    score = 0;
    streak = 0;
    multiplier = 1;
    missedNotes = 0;
    notes = JSON.parse(JSON.stringify(originalNotes)); // Reset to original positions
    pausedTime = 0;
    stopAudio();
    requestAnimationFrame(gameLoop); // Ensure game loop restarts
}

});
