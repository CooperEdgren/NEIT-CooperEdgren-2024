let lastVisualizerUpdate = 0;
let animationId;

export function setupVisualizer(audioContext, audioSource, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    audioSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderVisualizer(timestamp) {
        if (timestamp - lastVisualizerUpdate < 1000 / 30) {
            requestAnimationFrame(renderVisualizer);
            return;
        }

        lastVisualizerUpdate = timestamp;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(${barHeight + 50}, 50, ${255 - barHeight})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }

        analyser.getByteFrequencyData(dataArray);
        requestAnimationFrame(renderVisualizer);
    }

    renderVisualizer(0);
}

function stopVisualizer() {
    cancelAnimationFrame(animationId);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
