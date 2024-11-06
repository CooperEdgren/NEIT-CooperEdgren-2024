const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1000;
canvas.height = 500;

// Game Variables
let isJumping = false;
let gravity = 0.65; // Gravity strength
let jumpStrength = 16; // Initial jump speed
let gameSpeed = 2;
let score = 0;
let gameOver = false;

// Player Object
const player = {
  x: 50,
  y: canvas.height - 40, // Start at the bottom (adjusted to 40px above the ground level)
  width: 40,
  height: 40,
  color: '#00FF00',
  velocityY: 0, // Vertical velocity for smooth jumping and falling
  groundLevel: canvas.height - 40 // Set ground level to bottom of the canvas minus height of the player
};

// Obstacles
const obstacles = [];
let obstacleTimer = 0;
let nextObstacleIn = Math.floor(Math.random() * 100) + 50; // Random interval to spawn next obstacle

// Game Loop
function gameLoop() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player Gravity and Jumping Logic
  if (isJumping) {
    // Apply gravity and vertical velocity to jump
    player.velocityY -= gravity; // Make the jump arc
  } else {
    // Player is falling down, apply gravity if the player is not on the ground
    if (player.y < player.groundLevel) {
      player.velocityY += gravity; // Apply gravity to fall down
    } else {
      player.velocityY = 0; // Stop falling when the player reaches the ground
      player.y = player.groundLevel; // Ensure the player stays on the ground
      isJumping = false; // Reset jumping state when player reaches the ground
    }
  }

  // Prevent player from falling below the ground level (bottom of the canvas)
  if (player.y > player.groundLevel) {
    player.y = player.groundLevel; // Lock player to ground level
  }

  // Update player position based on velocity
  player.y -= player.velocityY;

  // Draw Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Obstacles Logic
  obstacleTimer++;

  // Only spawn a new obstacle after a random interval
  if (obstacleTimer >= nextObstacleIn) {
    obstacles.push({
      x: canvas.width,
      y: canvas.height - 60, // Obstacles at ground level
      width: 30,
      height: Math.random() * 50 + 30
    });

    // Reset the timer and generate a new random interval for the next obstacle
    nextObstacleIn = Math.floor(Math.random() * 100) + 50; // Random interval between 50 and 150 frames
    obstacleTimer = 0; // Reset the timer
  }

  // Move Obstacles
  obstacles.forEach((obstacle, index) => {
    obstacle.x -= gameSpeed;

    // Collision Detection
    if (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    ) {
      gameOver = true;
      displayGameOver();
    }

    // Remove off-screen obstacles
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
      score++;
    }

    // Draw Obstacles
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  // Score Display
  ctx.font = '20px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Score: ' + score, 10, 30);

  // Next frame
  requestAnimationFrame(gameLoop);
}

// Keydown Event Listener for Jumping
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && !isJumping && !gameOver) {
    isJumping = true;
    player.velocityY = jumpStrength; // Start with initial jump speed
  }
});

// Display Game Over screen
function displayGameOver() {
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '30px Arial';
  ctx.fillText('Game Over!', canvas.width / 2 - 75, canvas.height / 2 - 30);
  ctx.font = '20px Arial';
  ctx.fillText('Final Score: ' + score, canvas.width / 2 - 60, canvas.height / 2 + 10);
  ctx.fillText('Press Space to Restart', canvas.width / 2 - 90, canvas.height / 2 + 40);
}

// Restart Game
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && gameOver) {
    resetGame();
  }
});

// Reset Game after Game Over
function resetGame() {
  player.y = canvas.height - 40; // Reset player to ground level
  player.velocityY = 0;
  obstacles.length = 0;
  score = 0;
  gameSpeed = 2;
  gameOver = false;
  obstacleTimer = 0;
  nextObstacleIn = Math.floor(Math.random() * 100) + 50; // Reset random interval for next obstacle
  gameLoop();
}

// Start the game loop
gameLoop();
