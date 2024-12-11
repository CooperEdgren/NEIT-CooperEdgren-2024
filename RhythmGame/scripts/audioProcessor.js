const audioCache = new Map();

export async function preloadAudio(audioUrl, audioContext) {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log("Decoded audioBuffer:", audioBuffer);
    return audioBuffer;
}

export async function processAudioFromURL(audioUrl) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await preloadAudio(audioUrl, audioContext);

    try {
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // Detect onsets and tempo directly in this script
        const onsets = detectOnsets(channelData, sampleRate);
        console.log("Detected onsets:", onsets);

        const tempo = detectTempo(channelData, sampleRate);
        console.log("Detected tempo:", tempo);

        const notes = await generateNotesFromPitch(audioBuffer, tempo, onsets);
        return { notes, tempo, onsets };
    } catch (error) {
        console.error("Error processing audio buffer:", error);
        throw error;
    }
}

async function generateNotesFromPitch(audioBuffer, tempo, onsets) {
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(analyser);
    analyser.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    const sampleRate = offlineContext.sampleRate;

    const notes = [];
    const bufferData = renderedBuffer.getChannelData(0);
    console.log("Rendering buffer data length:", bufferData.length);

    const stepSize = 256;
    let lastPitch = null;

    for (let i = 0; i < bufferData.length; i += stepSize) {
        const frame = bufferData.slice(i, i + 2048);
        const pitch = detectPitch(frame, sampleRate);

        if (pitch && (!lastPitch || Math.abs(pitch - lastPitch) > 20)) {
            notes.push({
                lane: Math.floor(Math.random() * 4),
                time: i / sampleRate,
                duration: 0,
            });
            lastPitch = pitch;
        }
    }

    console.log("Generated Notes:", notes);
    return notes;
}

function detectOnsets(buffer, sampleRate) {
    const onsets = [];
    for (let i = 0; i < buffer.length; i += sampleRate / 2) {
        onsets.push(i / sampleRate);
    }
    return onsets;
}

function detectPitch(buffer, sampleRate) {
    // Dummy pitch detection for simplicity
    return Math.random() * 440;
}
function detectTempo(buffer, sampleRate) {
    const autocorrelation = new Float32Array(buffer.length);

    for (let lag = 0; lag < autocorrelation.length; lag++) {
        let sum = 0;
        for (let i = 0; i < buffer.length - lag; i++) {
            sum += buffer[i] * buffer[i + lag];
        }
        autocorrelation[lag] = sum;
    }

    let peakLag = 0;
    let peakValue = 0;
    for (let lag = 1; lag < autocorrelation.length; lag++) {
        if (autocorrelation[lag] > peakValue) {
            peakValue = autocorrelation[lag];
            peakLag = lag;
        }
    }

    return (60 * sampleRate) / peakLag;
}