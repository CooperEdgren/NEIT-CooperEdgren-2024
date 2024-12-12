// Utility for creating AudioContext
const createAudioContext = () => {
    return new (window.AudioContext || window.webkitAudioContext)();
};

// Function to analyze audio
export const processAudioFromURL = async (url) => {
    const audioContext = createAudioContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Load and setup AudioWorkletProcessor
    await audioContext.audioWorklet.addModule('./scripts/audioProcessorWorklet.js');
    const audioWorkletNode = new AudioWorkletNode(audioContext, 'analyze-audio', {
        processorOptions: {
            onsetThreshold: 0.8,
            bufferSize: 2048
        }
    });    

    // Data analysis variables
    const tempoData = { bpm: null };
    const onsetData = [];
    const pitchData = [];

    audioWorkletNode.port.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'pitch') {
            pitchData.push(data);
        } else if (type === 'onset') {
            onsetData.push(data);
        } else if (type === 'bpm') {
            tempoData.bpm = data;
        }
    };

    // Connect nodes
    source.connect(analyser);
    analyser.connect(audioWorkletNode);
    audioWorkletNode.connect(audioContext.destination);

    // Start the source to gather data
    source.start(0);

    // Stop after some time (e.g., 10 seconds) to finalize analysis
    await new Promise((resolve) => setTimeout(resolve, 10000));
    source.stop();

    return {
        notes: generateNotes(onsetData, pitchData, tempoData.bpm),
        tempo: tempoData.bpm,
        onsets: onsetData
    };
};

// Detect pitch (handled in Worklet)
const detectPitch = (buffer, sampleRate) => {
    // Delegated to audio worklet
};

// Detect onset (handled in Worklet)
const detectOnset = (buffer) => {
    // Delegated to audio worklet
};

// Detect tempo (basic implementation)
const detectTempo = (audioBuffer, sampleRate) => {
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(offlineContext.destination);

    const bpmDetector = require('bpm-detective'); // Optional external library

    return bpmDetector(audioBuffer, sampleRate).bpm;
};
const assignLaneBasedOnPitch = (pitch) => {
    if (!pitch) return Math.floor(Math.random() * 4); // Default random lane if pitch is null
    const pitchRange = [80, 400]; // Customize based on expected pitch range
    const laneCount = 4;
    const normalizedPitch = Math.min(Math.max(pitch, pitchRange[0]), pitchRange[1]);
    const lane = Math.floor(((normalizedPitch - pitchRange[0]) / (pitchRange[1] - pitchRange[0])) * laneCount);
    return Math.min(lane, laneCount - 1); // Ensure within bounds
};
// Generate notes
const generateNotes = (onsets, pitches, bpm) => {
    const notes = [];
    onsets.forEach((onset, index) => {
        const lane = assignLaneBasedOnPitch(pitches[index]?.pitch);
        notes.push({
            lane,
            time: onset,
            pitch: pitches[index]?.pitch || null
        });
    });
    return notes;
};