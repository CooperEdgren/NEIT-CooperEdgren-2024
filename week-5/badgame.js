const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1000;
canvas.height = 500;

    // Define Game Variables
    let isJumping = false;
    let gravity = 0.7;
    let jumpStrength = 16;
    let gameSpeed = 6.6;
    let score = 0;
    let gameOver = false;

    const player = {
      x: 100,
      y: canvas.height - 100,
      width: 50,
      height: 50,
      velocityY: 0,
    };

    const groundLevel = canvas.height - player.height;

    let obstacles = [];
    let obstacleTimer = 0;
    let nextObstacleIn = getRandomInterval(60, 120);

    // Utility function to generate random interval
    function getRandomInterval(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Reset Game
    function resetGame() {
      player.y = groundLevel;
      player.velocityY = 0;
      isJumping = false;
      score = 0;
      gameOver = false;
      obstacles = [];
      obstacleTimer = 0;
      nextObstacleIn = getRandomInterval(60, 120);
      gameSpeed = 6.6;
      gameLoop();
    }

    // Handle Obstacles
    function createObstacle() {
      const height = getRandomInterval(30, 80);
      obstacles.push({
        x: canvas.width,
        y: canvas.height - height,
        width: 30,
        height: height,
      });
    }

    // Collision Detection
    function checkCollision(player, obstacle) {
      return (
        player.x < obstacle.x + obstacle.width &&
        player.x + player.width > obstacle.x &&
        player.y < obstacle.y + obstacle.height &&
        player.y + player.height > obstacle.y
      );
    }

    // Start Game Loop
    function gameLoop() {
      if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "30px Arial";
        ctx.fillText("Game Over! Press Space to Restart", canvas.width / 4, canvas.height / 2);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Handle Player Gravity and Jumping
      if (player.y < groundLevel) {
        // Apply gravity while in the air
        player.velocityY += gravity;
        player.y += player.velocityY;
      } else {
        // Player is on the ground
        player.y = groundLevel;
        player.velocityY = 0;
        isJumping = false;
      }

      // Draw Player
      ctx.fillStyle = "blue";
      ctx.fillRect(player.x, player.y, player.width, player.height);

      // Handle Obstacles
      obstacleTimer++;
      if (obstacleTimer >= nextObstacleIn) {
        createObstacle();
        obstacleTimer = 0;
        nextObstacleIn = getRandomInterval(60, 120);
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.x -= gameSpeed;

        // Check for collision
        if (checkCollision(player, obstacle)) {
          gameOver = true;
          break;
        }

        // Remove off-screen obstacles and increment score
        if (obstacle.x + obstacle.width < 0) {
          obstacles.splice(i, 1);
          score++;
        }

        // Draw obstacles
        ctx.fillStyle = "green";
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      }

      // Display score
      ctx.fillStyle = "black";
      ctx.font = "20px Arial";
      ctx.fillText(`Score: ${score}`, 20, 30);

      // Request next frame
      requestAnimationFrame(gameLoop);
    }

    // Listen for Keydown Events
    document.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        if (gameOver) {
          resetGame();
        } else if (!isJumping && player.y === groundLevel) {
          isJumping = true;
          player.velocityY = -jumpStrength;
        }
      }
    });

    // Start the game
    gameLoop();