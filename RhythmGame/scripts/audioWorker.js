self.onmessage = async function (event) {
    const { audioBuffer, sampleRate } = event.data;
    console.log("Worker received audio buffer:", audioBuffer.length);
    console.log("Worker received sample rate:", sampleRate);
    try {
        const onsets = detectOnsets(audioBuffer, sampleRate);
        console.log("Detected onsets:", onsets);

        const tempo = detectTempo(audioBuffer, sampleRate);
        console.log("Detected tempo:", tempo);
        
        self.postMessage({ tempo, onsets });
    } catch (error) {
        console.error("Error in worker:", error);
        self.postMessage({ error: `Audio Worker Error: ${error.message}` });
    }
};

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

function analyzeChunks(buffer, chunkSize, sampleRate) {
    const onsets = [];
    const numChunks = Math.ceil(buffer.length / chunkSize);

    for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = buffer.slice(start, end);

        const chunkOnsets = detectOnsets(chunk, sampleRate);
        onsets.push(...chunkOnsets.map(onset => onset + start / sampleRate));
    }

    return onsets;
}

function detectOnsets(audioBuffer, sampleRate) {
    console.log("Starting onset detection...");
    const onsets = []; // Add your logic to detect onsets

    // For debugging, create placeholder onsets
    for (let i = 0; i < 10; i++) {
        onsets.push(i * 0.5); // Add an onset every 0.5 seconds
    }

    console.log("Onsets detected:", onsets);
    return onsets;
}

