import { BackgroundJellyfish, GroundDetail, Obstacle, Particle, Player } from '../types/game';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Main render pass
   */
  public render(
    width: number,
    height: number,
    player: Player,
    obstacles: Obstacle[],
    jellyfishes: BackgroundJellyfish[],
    particles: Particle[],
    groundDetails: GroundDetail[],
    groundOffset: number,
    groundY: number,
    score: number,
    highScore: number,
    dayNightProgress: number, // 0 = sunny day, 1 = deep sea night
    milestoneFlashTimer: number,
    isGameOver: boolean,
    cameraShake: { x: number; y: number }
  ) {
    const ctx = this.ctx;

    ctx.save();
    // Apply camera shake
    ctx.translate(cameraShake.x, cameraShake.y);

    // 1. Draw Sky / Ocean Background
    this.drawSkyBackground(width, height, dayNightProgress);

    // 2. Draw Faint Bikini Bottom Flower Clouds in Far Sky
    this.drawFlowerClouds(width, groundY, groundOffset * 0.1, dayNightProgress);

    // 3. Draw Background Jellyfish (replacing Dino clouds)
    this.drawBackgroundJellyfish(jellyfishes, dayNightProgress);

    // 4. Draw Ambient Rising Bubbles & Particles
    this.drawParticles(particles);

    // 5. Draw Sandy Ground with Details
    this.drawGround(width, height, groundY, groundOffset, groundDetails, dayNightProgress);

    // 6. Draw Obstacles
    this.drawObstacles(obstacles, dayNightProgress);

    // 7. Draw Player (SpongeBob)
    this.drawSpongeBob(player, groundY, isGameOver, dayNightProgress);

    // 8. Draw Classic Retro HUD (HI 00000 00123)
    this.drawRetroScore(width, score, highScore, milestoneFlashTimer, dayNightProgress);

    ctx.restore();
  }

  /**
   * Ocean background with day/deep-sea night lighting transition
   */
  private drawSkyBackground(width: number, height: number, progress: number) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, height);

    if (progress <= 0.01) {
      // Crisp sunny Bikini Bottom turquoise waters
      grad.addColorStop(0, '#53c5eb');
      grad.addColorStop(0.55, '#78daf2');
      grad.addColorStop(1, '#97e8f7');
    } else if (progress >= 0.99) {
      // Deep sea / Rock bottom luminescent navy
      grad.addColorStop(0, '#071127');
      grad.addColorStop(0.55, '#0b1d3d');
      grad.addColorStop(1, '#112b54');
    } else {
      // Interpolated colors
      const r1 = Math.round(83 * (1 - progress) + 7 * progress);
      const g1 = Math.round(197 * (1 - progress) + 17 * progress);
      const b1 = Math.round(235 * (1 - progress) + 39 * progress);

      const r2 = Math.round(151 * (1 - progress) + 17 * progress);
      const g2 = Math.round(232 * (1 - progress) + 43 * progress);
      const b2 = Math.round(247 * (1 - progress) + 84 * progress);

      grad.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
      grad.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle sun/water light shafts from surface during daytime
    if (progress < 0.8) {
      const alpha = (1 - progress) * 0.08;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const startX = (width * (i * 0.28 + 0.1)) % width;
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX + 80, 0);
        ctx.lineTo(startX + 140, height);
        ctx.lineTo(startX + 40, height);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /**
   * Signature stylized flower clouds (Bikini Bottom sky)
   */
  private drawFlowerClouds(width: number, groundY: number, offset: number, nightProgress: number) {
    const ctx = this.ctx;
    const cloudColors = nightProgress > 0.5
      ? ['rgba(120, 160, 220, 0.15)', 'rgba(160, 140, 240, 0.12)']
      : ['rgba(255, 225, 240, 0.45)', 'rgba(215, 240, 255, 0.45)', 'rgba(245, 215, 255, 0.45)'];

    const flowers = [
      { bx: 150, by: 45, size: 28, petals: 5, color: cloudColors[0] },
      { bx: 480, by: 70, size: 36, petals: 5, color: cloudColors[1 % cloudColors.length] },
      { bx: 820, by: 50, size: 32, petals: 5, color: cloudColors[0] },
      { bx: 1150, by: 65, size: 40, petals: 5, color: cloudColors[2 % cloudColors.length] },
    ];

    flowers.forEach((f) => {
      let x = (f.bx - offset) % (width + 200);
      if (x < -100) x += width + 200;

      ctx.save();
      ctx.translate(x, f.by);
      ctx.fillStyle = f.color;

      // Draw center circle
      ctx.beginPath();
      ctx.arc(0, 0, f.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Draw 5 rounded petals
      for (let p = 0; p < f.petals; p++) {
        const angle = (p * (Math.PI * 2)) / f.petals;
        const px = Math.cos(angle) * f.size * 0.65;
        const py = Math.sin(angle) * f.size * 0.65;
        ctx.beginPath();
        ctx.arc(px, py, f.size * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  /**
   * Background Jellyfish (the requested cloud replacement)
   * Pulsing translucent bells with undulating tentacles gliding across the sky.
   */
  private drawBackgroundJellyfish(jellyfishes: BackgroundJellyfish[], nightProgress: number) {
    const ctx = this.ctx;

    jellyfishes.forEach((jelly) => {
      ctx.save();
      ctx.translate(jelly.x, jelly.y);

      // Pulse squash & stretch
      const pulse = Math.sin(jelly.pulsePhase);
      const widthScale = 1 + pulse * 0.15;
      const heightScale = 1 - pulse * 0.12;

      const r = jelly.size;
      const isNight = nightProgress > 0.5;

      // Bell color
      let bellFill = 'rgba(255, 138, 185, 0.72)';
      let bellBorder = 'rgba(235, 75, 140, 0.85)';
      let spotFill = 'rgba(215, 45, 120, 0.75)';

      if (isNight) {
        // Glowing bioluminescent jelly at night
        bellFill = 'rgba(100, 230, 255, 0.8)';
        bellBorder = 'rgba(180, 255, 255, 0.95)';
        spotFill = 'rgba(255, 255, 255, 0.9)';
      } else if (jelly.color === 'purple') {
        bellFill = 'rgba(210, 145, 255, 0.72)';
        bellBorder = 'rgba(175, 85, 245, 0.85)';
        spotFill = 'rgba(145, 50, 220, 0.75)';
      }

      // Outer glow for nighttime
      if (isNight) {
        ctx.shadowColor = '#64e6ff';
        ctx.shadowBlur = 12;
      }

      ctx.scale(widthScale, heightScale);

      // 1. Draw Bell Dome
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.bezierCurveTo(-r, -r * 1.35, r, -r * 1.35, r, 0);
      // Ruffled bottom edge
      ctx.quadraticCurveTo(r * 0.6, r * 0.25, 0, 0);
      ctx.quadraticCurveTo(-r * 0.6, r * 0.25, -r, 0);
      ctx.closePath();

      ctx.fillStyle = bellFill;
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = bellBorder;
      ctx.stroke();

      // 2. Bell Spots (Iconic SpongeBob Jellyfish spots)
      ctx.fillStyle = spotFill;
      ctx.beginPath();
      ctx.arc(-r * 0.45, -r * 0.5, r * 0.16, 0, Math.PI * 2);
      ctx.arc(0, -r * 0.75, r * 0.18, 0, Math.PI * 2);
      ctx.arc(r * 0.42, -r * 0.48, r * 0.15, 0, Math.PI * 2);
      ctx.arc(-r * 0.15, -r * 0.35, r * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow for tentacles
      ctx.shadowBlur = isNight ? 6 : 0;

      // 3. Waving Tentacles
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = bellBorder;
      ctx.lineCap = 'round';

      const tentacleCount = 4;
      const tentacleSpacing = (r * 1.5) / (tentacleCount - 1);
      const startX = -r * 0.75;

      for (let t = 0; t < tentacleCount; t++) {
        const tx = startX + t * tentacleSpacing;
        const tentaclePhase = jelly.pulsePhase + t * 0.8;
        const wave = Math.sin(tentaclePhase) * (r * 0.28);
        const wave2 = Math.cos(tentaclePhase * 0.8) * (r * 0.35);

        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.bezierCurveTo(
          tx + wave,
          jelly.tentacleLength * 0.4,
          tx - wave2,
          jelly.tentacleLength * 0.7,
          tx + wave * 0.6,
          jelly.tentacleLength
        );
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  /**
   * Sandy ocean floor with rolling details
   */
  private drawGround(
    width: number,
    height: number,
    groundY: number,
    offset: number,
    details: GroundDetail[],
    nightProgress: number
  ) {
    const ctx = this.ctx;

    // Ground base color
    let sandColor = '#dfba68';
    let sandDark = '#c49e49';
    let sandHighlight = '#f3d389';

    if (nightProgress > 0.5) {
      sandColor = '#3a4454';
      sandDark = '#252e3d';
      sandHighlight = '#566479';
    }

    // Main sand bed
    ctx.fillStyle = sandColor;
    ctx.fillRect(0, groundY, width, height - groundY);

    // Top surface line with subtle texture
    ctx.strokeStyle = sandDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // Top highlight rim
    ctx.strokeStyle = sandHighlight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 2);
    ctx.lineTo(width, groundY + 2);
    ctx.stroke();

    // Scrolling sand grains, shells, and kelp sprouts
    details.forEach((d) => {
      let x = (d.x - offset) % (width + 100);
      if (x < -50) x += width + 100;

      const y = groundY + d.y;

      if (d.type === 'pebble') {
        ctx.fillStyle = nightProgress > 0.5 ? '#6a788d' : d.color;
        ctx.beginPath();
        ctx.ellipse(x, y, d.size * 1.4, d.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'shell') {
        ctx.fillStyle = nightProgress > 0.5 ? '#9db0cc' : '#fcedc7';
        ctx.strokeStyle = nightProgress > 0.5 ? '#435166' : '#d2aa5c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, d.size, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (d.type === 'grass') {
        ctx.strokeStyle = nightProgress > 0.5 ? '#2f6556' : '#3ea44b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.quadraticCurveTo(x + 5, groundY - d.size * 0.6, x + 3, groundY - d.size);
        ctx.moveTo(x + 3, groundY);
        ctx.quadraticCurveTo(x - 4, groundY - d.size * 0.5, x - 2, groundY - d.size * 0.8);
        ctx.stroke();
      } else if (d.type === 'starfish') {
        ctx.fillStyle = nightProgress > 0.5 ? '#7b497f' : '#ff7b72';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const px = x + Math.cos(a) * d.size;
          const py = y + Math.sin(a) * d.size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          const aInner = a + Math.PI / 5;
          ctx.lineTo(x + Math.cos(aInner) * (d.size * 0.4), y + Math.sin(aInner) * (d.size * 0.4));
        }
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  /**
   * Draw obstacles (Kelp clusters, Anchor, Urchin, Chum Trap, Wild Electric Jellyfish)
   */
  private drawObstacles(obstacles: Obstacle[], nightProgress: number) {
    const ctx = this.ctx;

    obstacles.forEach((obs) => {
      ctx.save();
      ctx.translate(obs.x, obs.y);

      switch (obs.type) {
        case 'kelp_single':
        case 'kelp_double':
          this.drawKelpObstacle(obs, nightProgress);
          break;
        case 'anchor':
          this.drawAnchorObstacle(obs, nightProgress);
          break;
        case 'urchin':
          this.drawUrchinObstacle(obs, nightProgress);
          break;
        case 'plankton_trap':
          this.drawChumBucketTrap(obs, nightProgress);
          break;
        case 'flying_electric_jelly':
          this.drawElectricJelly(obs);
          break;
        case 'flying_clam':
          this.drawFlyingClam(obs);
          break;
      }

      ctx.restore();
    });
  }

  private drawKelpObstacle(obs: Obstacle, nightProgress: number) {
    const ctx = this.ctx;
    const isDouble = obs.type === 'kelp_double';
    const mainColor = nightProgress > 0.5 ? '#2a755d' : '#2ea043';
    const darkColor = nightProgress > 0.5 ? '#174737' : '#1c6d2c';

    // Stalk 1
    ctx.fillStyle = mainColor;
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;

    const stalks = isDouble ? [0, obs.width * 0.45] : [obs.width * 0.2];

    stalks.forEach((sx, idx) => {
      const h = obs.height - idx * 8;
      ctx.beginPath();
      ctx.moveTo(sx, obs.height);
      ctx.bezierCurveTo(
        sx - 8,
        obs.height * 0.65,
        sx + 10,
        obs.height * 0.35,
        sx,
        obs.height - h
      );
      ctx.bezierCurveTo(
        sx + 14,
        obs.height * 0.35,
        sx + 2,
        obs.height * 0.65,
        sx + 12,
        obs.height
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Kelp leaf lobes
      for (let y = obs.height - 12; y > obs.height - h; y -= 16) {
        ctx.beginPath();
        ctx.ellipse(sx + (idx % 2 === 0 ? 8 : -4), y, 9, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  private drawAnchorObstacle(obs: Obstacle, nightProgress: number) {
    const ctx = this.ctx;
    const metal = nightProgress > 0.5 ? '#5a687d' : '#475569';
    const rust = nightProgress > 0.5 ? '#7f5347' : '#9a432e';

    ctx.strokeStyle = metal;
    ctx.fillStyle = rust;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    const cx = obs.width / 2;

    // Top loop ring
    ctx.beginPath();
    ctx.arc(cx, 10, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Center vertical shank
    ctx.beginPath();
    ctx.moveTo(cx, 18);
    ctx.lineTo(cx, obs.height - 10);
    ctx.stroke();

    // Crossbar
    ctx.beginPath();
    ctx.moveTo(cx - 14, 28);
    ctx.lineTo(cx + 14, 28);
    ctx.stroke();

    // Curved bottom flukes
    ctx.beginPath();
    ctx.arc(cx, obs.height - 24, 18, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.stroke();

    // Fluke arrowheads
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(cx - 18, obs.height - 18);
    ctx.lineTo(cx - 24, obs.height - 30);
    ctx.lineTo(cx - 10, obs.height - 24);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 18, obs.height - 18);
    ctx.lineTo(cx + 24, obs.height - 30);
    ctx.lineTo(cx + 10, obs.height - 24);
    ctx.closePath();
    ctx.fill();
  }

  private drawUrchinObstacle(obs: Obstacle, nightProgress: number) {
    const ctx = this.ctx;
    const cx = obs.width / 2;
    const cy = obs.height / 2;
    const r = obs.width * 0.32;

    // Spikes
    ctx.strokeStyle = nightProgress > 0.5 ? '#a855f7' : '#1e1b4b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const spikeCount = 14;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i * Math.PI * 2) / spikeCount;
      const sx = cx + Math.cos(angle) * (r * 1.55);
      const sy = cy + Math.sin(angle) * (r * 1.55);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    // Dark core body
    ctx.fillStyle = nightProgress > 0.5 ? '#3b0764' : '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Alert glowing eyes
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawChumBucketTrap(obs: Obstacle, nightProgress: number) {
    const ctx = this.ctx;
    const cx = obs.width / 2;

    // Chum Bucket metal bucket
    ctx.fillStyle = nightProgress > 0.5 ? '#4b5563' : '#64748b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(cx - 14, 12);
    ctx.lineTo(cx + 14, 12);
    ctx.lineTo(cx + 10, obs.height);
    ctx.lineTo(cx - 10, obs.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red Chum Bucket glove/logo or Plankton's evil single antenna
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, 12);
    ctx.lineTo(cx, 2);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // "CHUM" letters indicator
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHUM', cx, obs.height - 10);
  }

  private drawElectricJelly(obs: Obstacle) {
    const ctx = this.ctx;
    const cx = obs.width / 2;
    const cy = obs.height * 0.4;
    const r = obs.width * 0.38;

    // Electric glow
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;

    // Buzzing wild blue bell
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.quadraticCurveTo(cx, cy + r * 0.4, cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Electric arcs / sparks
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 2);
    ctx.lineTo(cx - 2, cy + 12);
    ctx.lineTo(cx - 7, cy + 16);
    ctx.lineTo(cx - 4, cy + obs.height - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 6, cy + 2);
    ctx.lineTo(cx + 3, cy + 11);
    ctx.lineTo(cx + 8, cy + 15);
    ctx.lineTo(cx + 5, cy + obs.height - 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  private drawFlyingClam(obs: Obstacle) {
    const ctx = this.ctx;
    const cx = obs.width / 2;
    const cy = obs.height / 2;

    ctx.fillStyle = '#f472b6';
    ctx.strokeStyle = '#be185d';
    ctx.lineWidth = 2;

    // Top shell (snapping)
    const snap = Math.sin(obs.animTimer * 10) * 0.25;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-snap);
    ctx.beginPath();
    ctx.arc(0, -4, 16, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Bottom shell
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(snap);
    ctx.beginPath();
    ctx.arc(0, 4, 16, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Pearl / eye inside
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx + 1, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Iconic SpongeBob character renderer (replaces Dino)
   */
  private drawSpongeBob(player: Player, groundY: number, isGameOver: boolean, nightProgress: number) {
    const ctx = this.ctx;
    ctx.save();

    const px = player.x;
    const py = player.y;

    ctx.translate(px, py);

    if (player.isDucking && player.isGrounded && !isGameOver) {
      // DUCKING SLIDE STATE: flattened horizontal squished sponge
      this.drawSpongeBobDucking(player);
    } else {
      // UPRIGHT RUNNING / JUMPING / GAME OVER STATE
      this.drawSpongeBobUpright(player, isGameOver);
    }

    ctx.restore();
  }

  /**
   * Upright running & jumping SpongeBob
   */
  private drawSpongeBobUpright(player: Player, isGameOver: boolean) {
    const ctx = this.ctx;
    const w = player.width;
    const h = player.height;

    const isJumping = !player.isGrounded;
    const runCycle = player.runCycle;

    // Leg animation phase
    const legAngle1 = isJumping ? 0.3 : Math.sin(runCycle) * 0.65;
    const legAngle2 = isJumping ? -0.4 : -Math.sin(runCycle) * 0.65;

    // Sponge bobbing bounce
    const bounceY = isJumping ? 0 : Math.abs(Math.sin(runCycle * 2)) * 3;

    ctx.save();
    ctx.translate(0, -bounceY);

    // 1. LEGS & SHOES (Drawn behind body)
    this.drawLeg(ctx, w * 0.32, h - 8, legAngle1);
    this.drawLeg(ctx, w * 0.68, h - 8, legAngle2);

    // 2. BROWN SQUARE PANTS
    const pantsY = h - 22;
    const pantsH = 14;

    ctx.fillStyle = '#854d0e'; // Warm brown pants
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.rect(4, pantsY, w - 8, pantsH);
    ctx.fill();
    ctx.stroke();

    // Black belt dashes
    ctx.fillStyle = '#1c1917';
    for (let bx = 9; bx < w - 10; bx += 10) {
      ctx.fillRect(bx, pantsY + 2, 5, 2.5);
    }

    // 3. WHITE SHIRT & RED TIE
    const shirtY = pantsY - 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.rect(4, shirtY, w - 8, 8);
    ctx.fill();
    ctx.stroke();

    // Shirt collar points
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(w * 0.32, shirtY);
    ctx.lineTo(w * 0.42, shirtY + 5);
    ctx.lineTo(w * 0.46, shirtY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.68, shirtY);
    ctx.lineTo(w * 0.58, shirtY + 5);
    ctx.lineTo(w * 0.54, shirtY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vibrant Red Necktie
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.2;

    const tieWind = isJumping ? 3 : Math.sin(runCycle) * 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, shirtY + 1);
    ctx.lineTo(w * 0.45 + tieWind, shirtY + 8);
    ctx.lineTo(w * 0.5 + tieWind, shirtY + 13);
    ctx.lineTo(w * 0.55 + tieWind, shirtY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. MAIN SPONGE BODY (Yellow porous rectangle with wavy edges)
    const bodyY = 6;
    const bodyH = shirtY - bodyY + 1;

    ctx.fillStyle = '#facc15'; // Iconic SpongeBob Bright Yellow
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Slightly wavy organic sponge contour
    ctx.moveTo(4, bodyY);
    ctx.quadraticCurveTo(w * 0.5, bodyY - 2, w - 4, bodyY);
    ctx.quadraticCurveTo(w - 2, bodyY + bodyH * 0.5, w - 4, bodyY + bodyH);
    ctx.lineTo(4, bodyY + bodyH);
    ctx.quadraticCurveTo(2, bodyY + bodyH * 0.5, 4, bodyY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Green/Olive Sponge Pores
    ctx.fillStyle = '#84cc16';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(9, bodyY + 8, 3.5, 0, Math.PI * 2);
    ctx.arc(12, bodyY + 22, 2.8, 0, Math.PI * 2);
    ctx.arc(w - 10, bodyY + 9, 3.2, 0, Math.PI * 2);
    ctx.arc(w - 12, bodyY + 26, 2.5, 0, Math.PI * 2);
    ctx.arc(w * 0.5, bodyY + 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 5. CHEEKS & FRECKLES
    // Right cheek dimple
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w * 0.8, bodyY + 24, 5, -0.2, Math.PI * 0.7);
    ctx.stroke();

    // 3 Freckle dots on cheek
    ctx.fillStyle = '#9a3412';
    ctx.beginPath();
    ctx.arc(w * 0.76, bodyY + 22, 1, 0, Math.PI * 2);
    ctx.arc(w * 0.82, bodyY + 21, 1, 0, Math.PI * 2);
    ctx.arc(w * 0.79, bodyY + 25, 1, 0, Math.PI * 2);
    ctx.fill();

    // 6. EYES & NOSE
    const eyeRadius = 9;
    const eyeY = bodyY + 14;
    const eye1X = w * 0.42;
    const eye2X = w * 0.72;

    if (isGameOver) {
      // Dizzy X eyes on game over!
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      [eye1X, eye2X].forEach((ex) => {
        ctx.beginPath();
        ctx.moveTo(ex - 5, eyeY - 5);
        ctx.lineTo(ex + 5, eyeY + 5);
        ctx.moveTo(ex + 5, eyeY - 5);
        ctx.lineTo(ex - 5, eyeY + 5);
        ctx.stroke();
      });
    } else {
      // Big cartoon eyes
      [eye1X, eye2X].forEach((ex) => {
        // Eyelashes (3 on each eye)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ex - 4, eyeY - eyeRadius);
        ctx.lineTo(ex - 6, eyeY - eyeRadius - 5);
        ctx.moveTo(ex, eyeY - eyeRadius);
        ctx.lineTo(ex, eyeY - eyeRadius - 6);
        ctx.moveTo(ex + 4, eyeY - eyeRadius);
        ctx.lineTo(ex + 6, eyeY - eyeRadius - 5);
        ctx.stroke();

        // White eyeball
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Blue iris looking forward
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(ex + 2, eyeY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Black pupil
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(ex + 2.5, eyeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Catchlight reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + 1.5, eyeY - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 6. EYES & NOSE (Attached right on the face)
    // Cute rounded nose firmly attached on the face between the two eyes
    const noseBaseX = (eye1X + eye2X) * 0.5;
    const noseBaseY = eyeY + 2;

    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(noseBaseX + 1.5, noseBaseY, 4, 6, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 7. MOUTH & TWO BUCK TEETH
    const mouthY = eyeY + 12;
    if (isGameOver) {
      // Wavy shocked mouth
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.35, mouthY + 4);
      ctx.quadraticCurveTo(w * 0.5, mouthY - 3, w * 0.75, mouthY + 3);
      ctx.stroke();
    } else {
      // Joyful toothy grin
      ctx.fillStyle = '#7f1d1d'; // Inside mouth
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(w * 0.35, mouthY);
      ctx.quadraticCurveTo(w * 0.58, mouthY + 10, w * 0.82, mouthY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tongue
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(w * 0.6, mouthY + 6, 4, Math.PI, 0, true);
      ctx.fill();

      // Two iconic square buck teeth sticking down!
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;

      ctx.fillRect(w * 0.46, mouthY, 4.5, 5);
      ctx.strokeRect(w * 0.46, mouthY, 4.5, 5);

      ctx.fillRect(w * 0.54, mouthY, 4.5, 5);
      ctx.strokeRect(w * 0.54, mouthY, 4.5, 5);
    }

    // 8. ARMS (Attached to the side of the body/torso, with opposite arm attached on the other side)
    this.drawArms(ctx, w, h, shirtY, runCycle, isJumping, isGameOver);

    ctx.restore();
  }

  /**
   * Ducking SpongeBob: Squashed pancake sponge sliding low
   */
  private drawSpongeBobDucking(player: Player) {
    const ctx = this.ctx;
    const w = player.width;
    const h = player.height;

    // Body is squashed wide and low (e.g. 70x36)
    ctx.save();

    // Back leg kicking out flat
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, h - 12);
    ctx.lineTo(-6, h - 8);
    ctx.stroke();

    // Black shoe kicking
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(-8, h - 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brown pants (horizontal slice)
    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 1.8;
    ctx.fillRect(4, h - 18, 18, 14);
    ctx.strokeRect(4, h - 18, 18, 14);

    // White shirt
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, h - 18, 10, 14);
    ctx.strokeRect(22, h - 18, 10, 14);

    // Red tie trailing back
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(26, h - 11);
    ctx.lineTo(16, h - 14);
    ctx.lineTo(14, h - 9);
    ctx.closePath();
    ctx.fill();

    // Yellow Squashed Head/Body
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(30, 4, w - 34, h - 8, [6, 12, 12, 6]);
    ctx.fill();
    ctx.stroke();

    // Pores
    ctx.fillStyle = '#84cc16';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(38, 12, 2.5, 0, Math.PI * 2);
    ctx.arc(w - 12, 10, 3, 0, Math.PI * 2);
    ctx.arc(w - 18, 22, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Focused ducking eyes
    const eyeX = w - 18;
    const eyeY = 12;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(eyeX + 1.5, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Nose attached on face in front of eye
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(eyeX + 3.5, eyeY + 3, 4, 3, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Two buck teeth
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w - 18, 20, 3.5, 4);
    ctx.fillRect(w - 13, 20, 3.5, 4);

    // Opposite (left) arm attached to body flank, tucked along side
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(18, h - 14);
    ctx.lineTo(8, h - 10);
    ctx.stroke();

    // Right arm attached to front torso flank, reaching forward holding jellyfish net
    ctx.save();
    // White shirt sleeve on flank
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(w - 22, 22, 3, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Yellow arm extending forward from sleeve
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w - 20, 22);
    ctx.lineTo(w + 4, 22);
    ctx.stroke();

    // Net handle & ring
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w + 4, 22);
    ctx.lineTo(w + 14, 23);
    ctx.stroke();

    ctx.strokeStyle = '#ec4899';
    ctx.strokeRect(w + 14, 16, 8, 12);

    ctx.restore();

    ctx.restore();
  }

  private drawLeg(ctx: CanvasRenderingContext2D, hipX: number, hipY: number, angle: number) {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(angle);

    // Yellow thin leg
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 10);
    ctx.stroke();

    // White sock with blue & red stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5, 8, 5, 6);

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-2.5, 9.5, 5, 1.2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2.5, 11.5, 5, 1.2);

    // Shiny black shoe with heel
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(3, 15, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoe shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2, 13.5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawArms(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    shirtY: number,
    runCycle: number,
    isJumping: boolean,
    isGameOver: boolean
  ) {
    const rightArmAngle = isGameOver ? 1.2 : isJumping ? -1.1 : Math.cos(runCycle) * 0.7;
    // Opposite left arm swings in counter-phase during run cycle
    const leftArmAngle = isGameOver ? -0.8 : isJumping ? -1.1 : -Math.cos(runCycle) * 0.7;

    const shoulderY = shirtY - 2;

    // --- 1. OPPOSITE ARM (Left arm without net, attached to opposite torso flank) ---
    ctx.save();
    ctx.translate(4, shoulderY);

    // Left white shirt sleeve attached to torso side
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 4.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left yellow arm swinging
    ctx.rotate(leftArmAngle);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, 8);
    ctx.stroke();

    // Left hand (cute rounded cartoon hand)
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(-8, 9, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- 2. JELLYFISH NET ARM (Right arm, attached to right torso flank next to face) ---
    ctx.save();
    ctx.translate(w - 4, shoulderY);

    // Right white shirt sleeve attached to torso side
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#543007';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right yellow arm
    ctx.rotate(rightArmAngle);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(11, 4);
    ctx.stroke();

    // Hand
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(12, 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Jellyfish Catching Net (iconic wooden handle + pink hoop/mesh)
    ctx.strokeStyle = '#a16207'; // Wooden bamboo handle
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(12, 4);
    ctx.lineTo(23, 7);
    ctx.stroke();

    // Pink Net Hoop
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.strokeRect(23, -1, 10, 16);

    // White mesh lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(23, 4);
    ctx.lineTo(33, 4);
    ctx.moveTo(23, 10);
    ctx.lineTo(33, 10);
    ctx.moveTo(28, -1);
    ctx.lineTo(28, 15);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Particles (sand dust, jump bubbles, collision stars)
   */
  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx;

    particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'bubble') {
        ctx.strokeStyle = '#bae6fd';
        ctx.fillStyle = 'rgba(224, 242, 254, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Bubble highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sand') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sponge_crumb') {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      }

      ctx.restore();
    });
  }

  /**
   * Classic Chrome Dino style score in top right:
   * "HI 00482  00120"
   * Blinks when passing 100-point milestones.
   */
  private drawRetroScore(
    width: number,
    score: number,
    highScore: number,
    milestoneFlashTimer: number,
    nightProgress: number
  ) {
    const ctx = this.ctx;
    const isNight = nightProgress > 0.5;

    // Flash visibility toggle (blinks 4 times)
    if (milestoneFlashTimer > 0) {
      const flashCount = Math.floor(milestoneFlashTimer * 10);
      if (flashCount % 2 === 1) {
        // Blink off during flash
        return;
      }
    }

    const textColor = isNight ? '#e2e8f0' : '#334155';
    const mutedColor = isNight ? '#64748b' : '#94a3b8';

    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = '700 15px "Press Start 2P", monospace';

    const scoreStr = String(Math.floor(score)).padStart(5, '0');
    const highScoreStr = String(Math.floor(highScore)).padStart(5, '0');

    const rightMargin = width - 24;
    const topMargin = 22;

    // Current score
    ctx.fillStyle = textColor;
    ctx.fillText(scoreStr, rightMargin, topMargin);

    // High score (if > 0)
    if (highScore > 0) {
      ctx.fillStyle = mutedColor;
      ctx.fillText(`HI ${highScoreStr}  `, rightMargin - 95, topMargin);
    }

    ctx.restore();
  }
}
