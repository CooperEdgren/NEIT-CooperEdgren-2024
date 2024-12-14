
const createAudioContext = () => {
    return new (window.AudioContext || window.webkitAudioContext)();
};

export const processAudioFromURL = async (url) => {
    const audioContext = createAudioContext();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const fallbackOnsets = [];
    const fallbackPitches = [];
    let bpm;

    try {
        await audioContext.audioWorklet.addModule('./scripts/audioProcessorWorklet.js');
        const audioWorkletNode = new AudioWorkletNode(audioContext, 'analyze-audio', {
            processorOptions: { onsetThreshold: 0.8, bufferSize: 2048 },
        });

        audioWorkletNode.port.onmessage = (event) => {
            const { type, data } = event.data;
            if (type === 'pitch') fallbackPitches.push(data);
            else if (type === 'onset') fallbackOnsets.push(data);
            else if (type === 'bpm') bpm = data;
        };

        source.connect(analyser);
        analyser.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);
    } catch (err) {
        console.warn('AudioWorklet not available, using fallback detection.');
        fallbackPitches.push(...detectPitch(audioBuffer.getChannelData(0), audioContext.sampleRate));
        fallbackOnsets.push(...detectOnset(audioBuffer.getChannelData(0)));
        bpm = detectTempo(audioBuffer, audioContext.sampleRate);
    }

    const duration = audioBuffer.duration; // Get the duration of the audio file
    await new Promise(resolve => setTimeout(resolve, Math.min(duration * 1000, 10000)));
    source.stop();

    return {
        notes: generateNotes(fallbackOnsets, fallbackPitches, bpm),
        tempo: bpm,
        onsets: fallbackOnsets,
    };
};


const detectPitch = (buffer, sampleRate) => {
    // Implement pitch detection fallback logic here
};

const detectOnset = (buffer) => {
    // Implement onset detection fallback logic here
};

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

const pitchRange = [80, 400];
const assignLaneBasedOnPitch = (pitch) => {
    if (!pitch) return Math.floor(Math.random() * 4);
    const laneCount = 4;
    const normalizedPitch = Math.min(Math.max(pitch, pitchRange[0]), pitchRange[1]);
    const lane = Math.floor(((normalizedPitch - pitchRange[0]) / (pitchRange[1] - pitchRange[0])) * laneCount);
    return Math.min(lane, laneCount - 1);
};

const generateNotes = (onsets, pitches, bpm) => {
    const notes = [];
    onsets.forEach((onset, index) => {
        const lane = assignLaneBasedOnPitch(pitches[index]?.pitch);
        notes.push({ lane, time: onset, pitch: pitches[index]?.pitch || null });
    });
    return notes;
};