class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const { onsetThreshold = 0.8, bufferSize = 2048 } = options.processorOptions || {};
        this.onsetThreshold = onsetThreshold;
        this.bufferSize = bufferSize;
        this.buffer = [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const channelData = input[0];
        this.buffer.push(...channelData);

        if (this.buffer.length >= this.bufferSize) {
            const bpm = this.detectBPM(this.buffer);
            if (bpm) this.port.postMessage({ type: 'bpm', data: bpm });

            const pitch = this.detectPitch(this.buffer);
            if (pitch) this.port.postMessage({ type: 'pitch', data: pitch });

            const onset = this.detectOnset(this.buffer);
            if (onset) this.port.postMessage({ type: 'onset', data: currentTime });

            this.buffer = this.buffer.slice(this.bufferSize / 2);
        }

        return true;
    }

    detectBPM(buffer) {
        const autocorrelation = new Array(buffer.length).fill(0);
        for (let lag = 0; lag < buffer.length; lag++) {
            let sum = 0;
            for (let i = 0; i < buffer.length - lag; i++) {
                sum += buffer[i] * buffer[i + lag];
            }
            autocorrelation[lag] = sum;
        }

        const maxLag = autocorrelation.slice(1).reduce((maxIdx, value, idx, array) =>
            value > array[maxIdx] ? idx : maxIdx, 0) + 1;

        if (maxLag > 0) {
            const secondsPerBeat = maxLag / sampleRate;
            return 60 / secondsPerBeat;
        }
        return null;
    }

    detectPitch(buffer) {
        let maxCorrelation = 0;
        let bestLag = -1;
        for (let lag = 1; lag < buffer.length / 2; lag++) {
            let correlation = 0;
            for (let i = 0; i < buffer.length - lag; i++) {
                correlation += buffer[i] * buffer[i + lag];
            }
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                bestLag = lag;
            }
        }

        if (bestLag === -1) return null;
        return sampleRate / bestLag;
    }

    detectOnset(buffer) {
        const amplitude = buffer.reduce((sum, value) => sum + Math.abs(value), 0) / buffer.length;
        return amplitude > this.onsetThreshold;
    }
}

registerProcessor('analyze-audio', AudioProcessor);
