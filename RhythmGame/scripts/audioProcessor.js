// Advanced note generation script for rhythm game

const audioCache = {}; // Cache for preloaded audio files

async function preloadAudio(url) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    audioCache[url] = buffer;
    return buffer;
}

async function generateSyncedNotesFromURL(audioUrl) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    let audioBuffer;
    try {
        audioBuffer = audioCache[audioUrl] || await preloadAudio(audioUrl);
    } catch (error) {
        console.error("Failed to load or decode audio:", error);
        throw new Error("Audio processing failed");
    }


    // Analyze tempo from the audio buffer
    const bpm = await getTempo(audioBuffer);
    const beatInterval = 60 / bpm; // Time between beats in seconds

    const notes = [];
    const duration = audioBuffer.duration;

    // Generate notes based on beat intervals
    for (let t = 0; t < duration; t += beatInterval) {
        const isLongNote = Math.random() < 0.3; // 30% chance to generate a long note
        notes.push({
            lane: Math.floor(Math.random() * 4), // Random lane assignment
            time: t,
            duration: isLongNote ? beatInterval * 2 : 0 // Long note duration
        });
    }

    return notes;
}

// Extract tempo from AudioBuffer
async function getTempo(audioBuffer) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    const data = renderedBuffer.getChannelData(0);

    const peaks = getPeaks(data);
    const intervals = countIntervalsBetweenPeaks(peaks);
    return groupIntervals(intervals);
}

function getPeaks(data) {
    const peaks = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i] > 0.9) {
            peaks.push(i);
            i += 10000; // Skip forward a bit to avoid multiple detections of the same peak
        }
    }
    return peaks;
}

function countIntervalsBetweenPeaks(peaks) {
    const intervals = [];
    for (let i = 0; i < peaks.length - 1; i++) {
        for (let j = i + 1; j < peaks.length; j++) {
            intervals.push(peaks[j] - peaks[i]);
        }
    }
    return intervals;
}

function groupIntervals(intervals) {
    const intervalCounts = {};
    intervals.forEach(interval => {
        const roundedInterval = Math.round(interval / 10) * 10;
        if (!intervalCounts[roundedInterval]) {
            intervalCounts[roundedInterval] = 0;
        }
        intervalCounts[roundedInterval]++;
    });

    const sortedIntervals = Object.keys(intervalCounts).sort((a, b) => intervalCounts[b] - intervalCounts[a]);
    const mostCommonInterval = sortedIntervals[0];
    const tempo = 60 / (mostCommonInterval / 44100);

    return Math.round(tempo);
}

export function processAudioFromURL(audioUrl) {
    return generateSyncedNotesFromURL(audioUrl);
}
