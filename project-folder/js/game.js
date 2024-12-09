const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

let player, obstacles, score, gameRunning, audioSource;

document.getElementById("startGame").addEventListener("click", startGame);

function startGame() {
    const fileInput = document.getElementById("audioUpload");
    if (!fileInput.files[0]) {
        alert("Please upload an audio file!");
        return;
    }

    loadAudio(fileInput.files[0]).then((audio) => {
        audioSource = audio.source;
        initGame();
        audioSource.start();
        requestAnimationFrame(gameLoop);
    });
}

function initGame() {
    player = { x: 100, y: 300, width: 20, height: 20, jumpSpeed: 0 };
    obstacles = [];
    score = 0;
    gameRunning = true;
}

function spawnObstacle() {
    obstacles.push({ x: canvas.width, y: 300, width: 20, height: 20 });
}

function updateGame(deltaTime) {
    // Move obstacles and detect collisions
    obstacles.forEach((obstacle, index) => {
        obstacle.x -= 200 * (deltaTime / 1000);
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
            score++;
        }

        // Collision detection
        if (
            player.x < obstacle.x + obstacle.width &&
            player.x + player.width > obstacle.x &&
            player.y < obstacle.y + obstacle.height &&
            player.y + player.height > obstacle.y
        ) {
            gameRunning = false;
            alert("Game Over! Score: " + score);
        }
    });

    // Handle player jump
    if (player.jumpSpeed < 0 || player.y < 300) {
        player.jumpSpeed += 9.8 * (deltaTime / 1000);
        player.y += player.jumpSpeed;
        if (player.y > 300) {
            player.y = 300;
            player.jumpSpeed = 0;
        }
    }

    if (getAudioLevels() && Math.random() > 0.9) spawnObstacle();
}

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw obstacles
    ctx.fillStyle = "red";
    obstacles.forEach((obstacle) => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });

    // Draw score
    document.getElementById("scoreDisplay").textContent = "Score: " + score;
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    updateGame(16); // Assuming 60 FPS
    drawGame();

    requestAnimationFrame(gameLoop);
}

// Add controls
window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && player.y >= 300) {
        player.jumpSpeed = -300;
    }
});
