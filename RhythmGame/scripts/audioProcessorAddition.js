async function getTempo(audioUrl) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

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
    const tempo = groupIntervals(intervals);

    return tempo;
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

// Example usage:
getTempo('path/to/your/audio/file.mp3').then(tempo => {
    console.log(`The tempo is ${tempo} BPM`);
});
