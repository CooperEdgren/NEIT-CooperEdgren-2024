// Advanced note generation script for rhythm game

async function generateSyncedNotes(audioBuffer) {
    // Audio context setup
    const offlineContext = new OfflineAudioContext(
        1, // Mono channel
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 2048;

    const gainNode = offlineContext.createGain();

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(offlineContext.destination);

    source.start(0);

    // Calculate BPM
    const bpm = await getTempoFromBuffer(audioBuffer);
    const beatInterval = 60 / bpm; // Time between beats in seconds

    // Process the audio data
    return offlineContext.startRendering().then(() => {
        const notes = [];
        const duration = audioBuffer.duration;

        // Generate notes based on beat intervals
        for (let t = 0; t < duration; t += beatInterval) {
            notes.push({
                lane: Math.floor(Math.random() * 4), // Random lane assignment
                time: t,
            });
        }

        return notes;
    });
}

// Extract tempo from AudioBuffer (adapted from getTempo)
async function getTempoFromBuffer(audioBuffer) {
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

// The extra `{` has been removed here

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

export function processAudio(audioBuffer, sampleRate) {
    return generateSyncedNotes(audioBuffer);
}

// Usage
function handleAudioUploadWithSync(event) {
    const file = event.target.files[0];
    if (file) {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            audioContext.decodeAudioData(e.target.result, function(buffer) {
                audioBuffer = buffer;

                // Generate synced notes
                generateSyncedNotes(buffer).then(syncedNotes => {
                    notes = syncedNotes.map(note => ({
                        lane: note.lane,
                        y: -50 - note.time * 500 // Adjust y-position based on time
                    }));

                    console.log('Generated synced notes:', notes);
                });
            });
        };
        reader.readAsArrayBuffer(file);
    }
}
