self.onmessage = async function (event) {
    const { audioBuffer, sampleRate } = event.data;

    try {
        const onsets = detectOnsets(audioBuffer, sampleRate);
        console.log("Worker detected onsets:", onsets);

        const tempo = detectTempo(audioBuffer, sampleRate);
        console.log("Worker detected tempo:", tempo);

        self.postMessage({ onsets, tempo });
    } catch (error) {
        console.error("Worker error:", error);
        self.postMessage({ error: error.message });
    }
};

function detectOnsets(buffer, sampleRate) {
    const onsets = [];
    for (let i = 0; i < buffer.length; i += sampleRate / 2) {
        onsets.push(i / sampleRate);
    }
    return onsets;
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