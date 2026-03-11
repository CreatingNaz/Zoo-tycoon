import { Game } from './engine/Game';

const game = new Game();
game.init().catch((err) => {
  console.error('Failed to initialize game:', err);
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'color: #ff6b6b; padding: 32px; font-family: system-ui;';
  const heading = document.createElement('h2');
  heading.textContent = 'Failed to start Zoo Tycoon';
  const message = document.createElement('p');
  message.textContent = err.message;
  errorDiv.appendChild(heading);
  errorDiv.appendChild(message);
  document.body.replaceChildren(errorDiv);
});
