export async function processAudioFromURL(audioUrl) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await preloadAudio(audioUrl, audioContext);

        if (!audioBuffer) {
            throw new Error("AudioBuffer is null or undefined.");
        }

        return new Promise((resolve, reject) => {
            const worker = new Worker("audioWorker.js");
            const channelData = audioBuffer.getChannelData(0);

            if (!channelData) {
                reject(new Error("AudioBuffer channel data is empty or invalid."));
            }

            worker.postMessage({ audioBuffer: channelData.slice(0, 48000), sampleRate: audioBuffer.sampleRate });

            worker.onmessage = ({ data }) => {
                if (data.error) {
                    reject(new Error(data.error));
                } else {
                    const { onsets, tempo } = data;
                    const notes = generateNotesFromOnsets(onsets);
                    resolve({ notes, tempo, onsets });
                }
            };

            worker.onerror = (error) => reject(error);
        });
    } catch (error) {
        console.error("Error in processAudioFromURL:", error);
        throw error;
    }
}

function generateNotesFromOnsets(onsets) {
    return onsets.map((onset, index) => ({
        lane: index % 4,
        time: onset * 1000, // Convert seconds to milliseconds for accuracy
        y: -50, // Initial y-position off-screen
        duration: 0,
    }));
}

export async function preloadAudio(audioUrl, audioContext) {
    try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (!audioBuffer) {
            throw new Error("Failed to decode audio data.");
        }

        return audioBuffer;
    } catch (error) {
        console.error("Error in preloadAudio:", error);
        throw error;
    }
}
