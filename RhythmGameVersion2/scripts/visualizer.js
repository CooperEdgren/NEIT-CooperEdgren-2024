
export function setupEnhancedVisualizer(audioContext, audioSource, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    audioSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderVisualizer() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        analyser.getByteFrequencyData(dataArray);
        const barWidth = canvas.width / bufferLength;
        let x = 0;

        dataArray.forEach((value) => {
            const barHeight = value * 2;
            const hue = (value / 255) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth;
        });

        requestAnimationFrame(renderVisualizer);
    }

    renderVisualizer();
}
