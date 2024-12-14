
import { setupEnhancedVisualizer } from './visualizer.js';
import { processAudioFile, detectTempo } from './audioProcessor.js';

let isGameRunning = false;
let streak = 0;
let multiplier = 1;
let audioContext;
let audioSource;

function initializeGame() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    setupEventListeners();
}

function setupEventListeners() {
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', handleAudioUpload);

    const restartButton = document.getElementById('restart-button');
    restartButton.addEventListener('click', restartGame);

    const audioInput = document.createElement('input');
    audioInput.type = 'file';
    audioInput.accept = 'audio/*';
    audioInput.id = 'audio-upload';
    document.body.appendChild(audioInput);

    audioInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                const { audioBuffer, source, analyser } = await processAudioFile(file, audioContext);
                audioSource = source;
                setupEnhancedVisualizer(audioContext, analyser, 'visualizer-canvas');
                const tempo = detectTempo(audioBuffer);
                console.log(`Detected Tempo: ${tempo} BPM`);
                startGame();
            } catch (error) {
                console.error('Error processing audio:', error);
            }
        }
    });
}

function startGame() {
    if (!isGameRunning && audioSource) {
        audioSource.start();
        isGameRunning = true;
        requestAnimationFrame(gameLoop);
    }
}

function restartGame() {
    if (isGameRunning) {
        audioSource.stop();
        isGameRunning = false;
        streak = 0;
        multiplier = 1;
        initializeGame();
    }
}

function gameLoop() {
    if (!isGameRunning) return;
    // Game logic and rendering go here
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);
