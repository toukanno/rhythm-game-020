const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const startButton = document.getElementById('start-button');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombEl = document.getElementById('bomb');
const bossEl = document.getElementById('boss');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();

const state = {
  running: false,
  score: 0,
  timer: 0,
  waveTimer: 0,
  phase: 'intro',
  combo: 0,
  stars: [],
  bullets: [],
  enemyBullets: [],
  enemies: [],
  particles: [],
  boss: null,
  bombCharge: 100,
  invuln: 0,
  player: null,
  lastTime: 0,
};

function resetGame() {
  state.score = 0;
  state.timer = 0;
  state.waveTimer = 0;
  state.phase = 'stage';
  state.combo = 0;
  state.bullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.particles = [];
  state.boss = null;
  state.bombCharge = 100;
  state.invuln = 0;
  state.player = {
    x: WIDTH / 2,
    y: HEIGHT - 90,
    radius: 12,
    speed: 290,
    focusSpeed: 180,
    cooldown: 0,
    lives: 3,
  };
  state.stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    speed: 40 + Math.random() * 160,
    size: Math.random() * 2 + 1,
  }));
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  livesEl.textContent = '♥'.repeat(Math.max(0, state.player?.lives ?? 0)) || '0';
  bombEl.textContent = state.bombCharge >= 100 ? 'READY' : `${Math.floor(state.bombCharge)}%`;
  bossEl.textContent = state.boss ? `${Math.max(0, Math.ceil((state.boss.hp / state.boss.maxHp) * 100))}%` : '--';
}

function startGame() {
  resetGame();
  state.running = true;
  overlay.classList.add('hidden');
}

function endGame(won) {
  state.running = false;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = won ? 'STAGE CLEAR' : 'GAME OVER';
  overlayMessage.textContent = won
    ? `スコア ${state.score} / ボス撃破成功！ Enter またはボタンで再挑戦できます。`
    : `スコア ${state.score} / もう一度挑戦しよう。 Enter またはボタンで再開できます。`;
  startButton.textContent = 'もう一回';
}

function spawnEnemy(type = 'drone') {
  const lane = Math.random() * (WIDTH - 80) + 40;
  const enemy = {
    type,
    x: lane,
    y: -30,
    radius: type === 'heavy' ? 18 : 14,
    speed: type === 'heavy' ? 95 : 140,
    hp: type === 'heavy' ? 12 : 5,
    maxHp: type === 'heavy' ? 12 : 5,
    fireCooldown: 0.8 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    drift: 40 + Math.random() * 50,
  };
  state.enemies.push(enemy);
}

function spawnBoss() {
  state.phase = 'boss';
  state.boss = {
    x: WIDTH / 2,
    y: 120,
    radius: 42,
    hp: 320,
    maxHp: 320,
    t: 0,
    fireCooldown: 0.2,
  };
}

function shootPlayer() {
  const p = state.player;
  state.bullets.push(
    { x: p.x, y: p.y - 18, vy: -520, radius: 5, damage: 1 },
    { x: p.x - 12, y: p.y - 10, vy: -520, radius: 4, damage: 1 },
    { x: p.x + 12, y: p.y - 10, vy: -520, radius: 4, damage: 1 },
  );
}

function radialBurst(x, y, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count;
    state.enemyBullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 6 });
  }
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 14; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 180;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.6,
      color,
    });
  }
}

function useBomb() {
  if (state.bombCharge < 100 || !state.running) return;
  state.bombCharge = 0;
  state.enemyBullets = [];
  state.enemies.forEach((enemy) => {
    enemy.hp -= 5;
  });
  if (state.boss) state.boss.hp -= 36;
  spawnExplosion(state.player.x, state.player.y, '#7af4ff');
}

function hitPlayer() {
  if (state.invuln > 0) return;
  state.player.lives -= 1;
  state.invuln = 2.4;
  state.combo = 0;
  spawnExplosion(state.player.x, state.player.y, '#ff6b8a');
  if (state.player.lives <= 0) {
    endGame(false);
  }
}

function update(dt) {
  state.stars.forEach((star) => {
    star.y += star.speed * dt;
    if (star.y > HEIGHT + 4) {
      star.y = -4;
      star.x = Math.random() * WIDTH;
    }
  });

  if (!state.running) return;

  state.timer += dt;
  state.waveTimer += dt;
  state.invuln = Math.max(0, state.invuln - dt);
  state.bombCharge = Math.min(100, state.bombCharge + dt * 9);

  const p = state.player;
  const focus = keys.has('Shift') || keys.has('ShiftLeft') || keys.has('ShiftRight');
  const speed = (focus ? p.focusSpeed : p.speed) * dt;
  if (keys.has('ArrowLeft') || keys.has('a')) p.x -= speed;
  if (keys.has('ArrowRight') || keys.has('d')) p.x += speed;
  if (keys.has('ArrowUp') || keys.has('w')) p.y -= speed;
  if (keys.has('ArrowDown') || keys.has('s')) p.y += speed;
  p.x = Math.max(24, Math.min(WIDTH - 24, p.x));
  p.y = Math.max(36, Math.min(HEIGHT - 36, p.y));

  p.cooldown -= dt;
  if ((keys.has(' ') || keys.has('Space')) && p.cooldown <= 0) {
    p.cooldown = 0.12;
    shootPlayer();
  }

  if (state.phase === 'stage' && state.timer < 30) {
    if (state.waveTimer >= 0.9) {
      state.waveTimer = 0;
      const type = Math.random() > 0.72 ? 'heavy' : 'drone';
      spawnEnemy(type);
    }
  } else if (state.phase === 'stage' && !state.boss) {
    spawnBoss();
  }

  state.bullets.forEach((bullet) => {
    bullet.y += bullet.vy * dt;
  });
  state.bullets = state.bullets.filter((bullet) => bullet.y > -20);

  state.enemyBullets.forEach((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
  });
  state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < HEIGHT + 40 && bullet.x > -40 && bullet.x < WIDTH + 40);

  state.enemies.forEach((enemy) => {
    enemy.y += enemy.speed * dt;
    enemy.x += Math.sin(state.timer * 2 + enemy.phase) * enemy.drift * dt;
    enemy.fireCooldown -= dt;
    if (enemy.fireCooldown <= 0) {
      enemy.fireCooldown = enemy.type === 'heavy' ? 1.2 : 1.7;
      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;
      const len = Math.hypot(dx, dy) || 1;
      const base = 170 + (enemy.type === 'heavy' ? 40 : 0);
      state.enemyBullets.push({ x: enemy.x, y: enemy.y + 8, vx: (dx / len) * base, vy: (dy / len) * base, radius: enemy.type === 'heavy' ? 7 : 5 });
    }
  });
  state.enemies = state.enemies.filter((enemy) => enemy.y < HEIGHT + 40 && enemy.hp > 0);

  if (state.boss) {
    state.boss.t += dt;
    state.boss.x = WIDTH / 2 + Math.sin(state.boss.t * 0.9) * 130;
    state.boss.fireCooldown -= dt;
    if (state.boss.fireCooldown <= 0) {
      state.boss.fireCooldown = 0.55;
      radialBurst(state.boss.x, state.boss.y, 10, 140);
      const dx = p.x - state.boss.x;
      const dy = p.y - state.boss.y;
      const len = Math.hypot(dx, dy) || 1;
      state.enemyBullets.push({ x: state.boss.x, y: state.boss.y + 14, vx: (dx / len) * 210, vy: (dy / len) * 210, radius: 7 });
    }
    if (state.boss.hp <= 0) {
      spawnExplosion(state.boss.x, state.boss.y, '#ffc857');
      state.boss = null;
      endGame(true);
    }
  }

  state.particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);

  for (const enemy of state.enemies) {
    for (const bullet of state.bullets) {
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + bullet.radius) {
        enemy.hp -= bullet.damage;
        bullet.y = -50;
        if (enemy.hp <= 0) {
          state.score += enemy.type === 'heavy' ? 450 : 180;
          state.combo += 1;
          spawnExplosion(enemy.x, enemy.y, enemy.type === 'heavy' ? '#ffb347' : '#6fe8ff');
        }
      }
    }
    if (Math.hypot(enemy.x - p.x, enemy.y - p.y) < enemy.radius + p.radius) {
      enemy.hp = 0;
      hitPlayer();
    }
  }

  if (state.boss) {
    for (const bullet of state.bullets) {
      if (Math.hypot(state.boss.x - bullet.x, state.boss.y - bullet.y) < state.boss.radius + bullet.radius) {
        state.boss.hp -= bullet.damage;
        bullet.y = -50;
        state.score += 12;
      }
    }
    if (Math.hypot(state.boss.x - p.x, state.boss.y - p.y) < state.boss.radius + p.radius) {
      hitPlayer();
    }
  }

  for (const bullet of state.enemyBullets) {
    if (Math.hypot(bullet.x - p.x, bullet.y - p.y) < bullet.radius + p.radius) {
      bullet.y = HEIGHT + 100;
      hitPlayer();
    }
  }

  updateHud();
}

function drawPlayer() {
  const p = state.player;
  const blinking = state.invuln > 0 && Math.floor(state.invuln * 12) % 2 === 0;
  if (blinking) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = '#7af4ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(14, 16);
  ctx.lineTo(0, 8);
  ctx.lineTo(-14, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, '#0b1430');
  grad.addColorStop(1, '#040814');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  state.stars.forEach((star) => {
    ctx.fillStyle = `rgba(122, 244, 255, ${0.25 + star.size / 4})`;
    ctx.fillRect(star.x, star.y, star.size, star.size * 4);
  });

  ctx.strokeStyle = 'rgba(122, 244, 255, 0.08)';
  for (let y = 0; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + (state.timer * 70) % 48);
    ctx.lineTo(WIDTH, y + (state.timer * 70) % 48);
    ctx.stroke();
  }

  state.bullets.forEach((bullet) => {
    ctx.fillStyle = '#aaf8ff';
    ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 18);
  });

  state.enemyBullets.forEach((bullet) => {
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  state.enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.type === 'heavy' ? '#ffb347' : '#7d93ff';
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius);
    ctx.lineTo(enemy.radius, enemy.radius);
    ctx.lineTo(-enemy.radius, enemy.radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  if (state.boss) {
    ctx.save();
    ctx.translate(state.boss.x, state.boss.y);
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, 0, state.boss.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d0c16';
    ctx.fillRect(-24, -6, 48, 12);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(80, 18, WIDTH - 160, 14);
    ctx.fillStyle = '#ff6b8a';
    ctx.fillRect(80, 18, ((WIDTH - 160) * state.boss.hp) / state.boss.maxHp, 14);
  }

  state.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillRect(particle.x, particle.y, 4, 4);
    ctx.globalAlpha = 1;
  });

  if (state.player) drawPlayer();

  ctx.fillStyle = '#c2d3ff';
  ctx.font = '16px sans-serif';
  ctx.fillText(`TIME ${Math.max(0, Math.ceil(30 - state.timer))}`, 16, 28);
  ctx.fillText(`COMBO ${state.combo}`, 16, 50);
}

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
  state.lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  keys.add(event.key);
  keys.add(event.code);
  if (event.key === 'Enter' && !state.running) {
    startGame();
  }
  if ((event.key === 'b' || event.key === 'B') && state.running) {
    useBomb();
  }
});

document.addEventListener('keyup', (event) => {
  keys.delete(event.key);
  keys.delete(event.code);
});

startButton.addEventListener('click', startGame);
resetGame();
requestAnimationFrame(frame);
