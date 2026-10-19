import { soundManager } from '../audio/soundManager';
import { BackgroundJellyfish, GameState, GroundDetail, Obstacle, ObstacleType, Particle, Player } from '../types/game';
import { GameRenderer } from './renderer';

export interface GameEngineCallbacks {
  onStateChange: (state: GameState) => void;
  onScoreUpdate: (score: number, highScore: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private callbacks: GameEngineCallbacks;

  // Game state
  private state: GameState = 'TITLE_MENU';
  private score: number = 0;
  private highScore: number = 0;
  private gameSpeed: number = 380; // px per second
  private baseSpeed: number = 380;
  private groundOffset: number = 0;
  private groundY: number = 240;

  // Day / Deep Sea Night cycle
  private dayNightProgress: number = 0; // 0 (day) to 1 (night)

  // Player
  private player: Player;
  private readonly defaultWidth = 50;
  private readonly defaultHeight = 64;
  private readonly duckWidth = 66;
  private readonly duckHeight = 34;

  // Obstacles & Background Entities
  private obstacles: Obstacle[] = [];
  private nextObstacleDistance: number = 500;
  private jellyfishes: BackgroundJellyfish[] = [];
  private particles: Particle[] = [];
  private groundDetails: GroundDetail[] = [];

  // Hitstop & screen shake
  private hitstopTimer: number = 0;
  private screenShakeIntensity: number = 0;
  private milestoneFlashTimer: number = 0;
  private lastMilestonePassed: number = 0;

  // Physics constants
  private readonly gravity = 1850;
  private readonly jumpForce = -640;
  private readonly minJumpForce = -360;

  // Input states & buffer
  private isJumpHeld: boolean = false;
  private isDuckHeld: boolean = false;
  private jumpBufferedTime: number = 0; // ms
  private coyoteTimer: number = 0; // ms

  // Animation frame
  private lastTime: number = 0;
  private animFrameId: number | null = null;
  private idCounter: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.renderer = new GameRenderer(this.ctx);
    this.callbacks = callbacks;

    // Load high score
    try {
      const saved = localStorage.getItem('spongebob_runner_hi_score');
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      this.highScore = 0;
    }

    // Initialize player
    this.player = {
      x: 70,
      y: 0,
      vy: 0,
      width: this.defaultWidth,
      height: this.defaultHeight,
      isGrounded: true,
      isDucking: false,
      runCycle: 0,
      bubbleTimer: 0,
      blinkTimer: 3,
      eyeXOffset: 0,
      hatAngle: 0,
    };

    this.resizeCanvas();
    this.seedInitialWorld();
    this.bindEvents();
    this.startLoop();
  }

  public resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = parent.getBoundingClientRect();
    const w = Math.max(rect.width, 320);
    const h = Math.max(rect.height, 280);

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);

    // Dynamic ground position (ground line roughly 75% down the viewport)
    this.groundY = Math.max(h - 70, 180);

    if (this.player.isGrounded) {
      this.player.y = this.groundY - this.player.height;
    }
  }

  private seedInitialWorld() {
    const width = this.getLogicalWidth();

    // Seed background jellyfish clouds
    this.jellyfishes = [];
    const colors: ('pink' | 'purple' | 'cyan')[] = ['pink', 'pink', 'purple', 'cyan'];
    for (let i = 0; i < 5; i++) {
      this.jellyfishes.push({
        id: ++this.idCounter,
        x: (i * (width / 4) + Math.random() * 80) % width,
        y: 35 + Math.random() * (this.groundY * 0.55),
        size: 20 + Math.random() * 16,
        speed: 25 + Math.random() * 25,
        pulsePhase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
        tentacleLength: 26 + Math.random() * 18,
      });
    }

    // Seed ground details (shells, seaweed, pebbles)
    this.groundDetails = [];
    const types: ('pebble' | 'shell' | 'grass' | 'starfish')[] = ['pebble', 'shell', 'grass', 'starfish', 'pebble'];
    const colorsList = ['#a07833', '#c29b47', '#e2be68', '#fce9a6'];

    for (let i = 0; i < 35; i++) {
      this.groundDetails.push({
        x: Math.random() * (width + 200),
        y: 10 + Math.random() * 50,
        type: types[Math.floor(Math.random() * types.length)],
        size: 3 + Math.random() * 7,
        color: colorsList[Math.floor(Math.random() * colorsList.length)],
      });
    }

    this.player.y = this.groundY - this.player.height;
  }

  private bindEvents() {
    window.addEventListener('blur', this.handleBlur);
  }

  private handleBlur = () => {
    this.isJumpHeld = false;
    this.isDuckHeld = false;
  };

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('blur', this.handleBlur);
  }

  // --- External Control Actions ---

  public startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.gameSpeed = this.baseSpeed;
    this.obstacles = [];
    this.particles = [];
    this.nextObstacleDistance = 600;
    this.lastMilestonePassed = 0;
    this.milestoneFlashTimer = 0;
    this.dayNightProgress = 0;

    this.player.isDucking = false;
    this.player.width = this.defaultWidth;
    this.player.height = this.defaultHeight;
    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
    this.player.isGrounded = true;

    this.callbacks.onStateChange(this.state);
    this.callbacks.onScoreUpdate(this.score, this.highScore);
    soundManager.playBubble();
  }

  public restartGame() {
    this.startGame();
  }

  public togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.callbacks.onStateChange(this.state);
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.callbacks.onStateChange(this.state);
    }
  }

  public handleJumpPress() {
    if (this.state === 'TITLE_MENU' || this.state === 'GAME_OVER') {
      this.startGame();
      return;
    }
    if (this.state === 'PAUSED') {
      this.togglePause();
      return;
    }

    this.isJumpHeld = true;
    this.jumpBufferedTime = 0.14; // 140ms input buffer

    this.tryPerformJump();
  }

  public handleJumpRelease() {
    this.isJumpHeld = false;
    // Variable jump height: if releasing early while moving up, clamp upward velocity
    if (this.player.vy < this.minJumpForce) {
      this.player.vy = this.minJumpForce;
    }
  }

  public handleDuckPress() {
    if (this.state !== 'PLAYING') return;
    this.isDuckHeld = true;

    if (this.player.isGrounded) {
      if (!this.player.isDucking) {
        this.player.isDucking = true;
        this.player.width = this.duckWidth;
        this.player.height = this.duckHeight;
        this.player.y = this.groundY - this.duckHeight;
        soundManager.playDuck();
      }
    } else {
      // Fast fall mechanic (like Chrome Dino down key in mid-air!)
      this.player.vy += 700;
    }
  }

  public handleDuckRelease() {
    this.isDuckHeld = false;
    if (this.player.isDucking) {
      this.player.isDucking = false;
      this.player.width = this.defaultWidth;
      this.player.height = this.defaultHeight;
      this.player.y = this.groundY - this.defaultHeight;
    }
  }

  private tryPerformJump(): boolean {
    if (this.state !== 'PLAYING') return false;

    // Can jump if grounded or within coyote time (80ms)
    if (this.player.isGrounded || this.coyoteTimer > 0) {
      this.player.vy = this.jumpForce;
      this.player.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferedTime = 0;

      // Stand up if jumping while ducking
      if (this.player.isDucking) {
        this.player.isDucking = false;
        this.player.width = this.defaultWidth;
        this.player.height = this.defaultHeight;
      }

      soundManager.playJump();

      // Emit jump bubble particles
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          id: ++this.idCounter,
          x: this.player.x + Math.random() * this.player.width,
          y: this.groundY - 4,
          vx: (Math.random() - 0.7) * 80 - 40,
          vy: -Math.random() * 90 - 30,
          size: 3 + Math.random() * 4,
          color: '#bae6fd',
          alpha: 0.8,
          life: 0,
          maxLife: 0.45,
          type: 'bubble',
        });
      }
      return true;
    }
    return false;
  }

  // --- Main 60fps Game Loop ---

  private startLoop() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling on frame drops

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private update(dt: number) {
    const width = this.getLogicalWidth();

    // Update screen shake decay
    if (this.screenShakeIntensity > 0) {
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - dt * 25);
    }

    // Update background jellyfish (clouds) even in title screen
    this.updateBackgroundJellyfish(dt, width);

    // Update particles
    this.updateParticles(dt);

    if (this.state === 'PAUSED') return;

    if (this.state === 'GAME_OVER') {
      // Hitstop delay or slow motion
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      }
      return;
    }

    // Title menu idle bobbing
    if (this.state === 'TITLE_MENU') {
      this.player.runCycle += dt * 3;
      return;
    }

    // --- PLAYING STATE SIMULATION ---

    // 1. Hitstop execution
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return; // simulation frozen for impact hitstop
    }

    // 2. Score & Speed Progression
    this.score += dt * (this.gameSpeed / 40);
    this.callbacks.onScoreUpdate(this.score, this.highScore);

    // Smooth speed ramp up (from 380 to 920 max)
    this.gameSpeed = Math.min(920, this.baseSpeed + Math.sqrt(this.score) * 16);

    // Milestone fanfare check (every 100 points)
    const currentMilestone = Math.floor(this.score / 100) * 100;
    if (currentMilestone > this.lastMilestonePassed && currentMilestone > 0) {
      this.lastMilestonePassed = currentMilestone;
      this.milestoneFlashTimer = 1.4; // Flash for 1.4 seconds
      soundManager.playMilestone();
    }
    if (this.milestoneFlashTimer > 0) {
      this.milestoneFlashTimer -= dt;
    }

    // Day / Deep Sea Night cycle (transition every 700 points)
    // 0-700 = Day, 700-1400 = Night, 1400-2100 = Day, etc.
    const cyclePhase = (this.score % 1400) / 1400;
    if (cyclePhase < 0.5) {
      // 0 to 0.5: daytime, smoothly dimming towards 0.5
      if (cyclePhase > 0.42) {
        this.dayNightProgress = (cyclePhase - 0.42) / 0.08;
      } else {
        this.dayNightProgress = 0;
      }
    } else {
      // 0.5 to 1.0: nighttime, smoothly brightening towards 1.0
      if (cyclePhase > 0.92) {
        this.dayNightProgress = 1 - (cyclePhase - 0.92) / 0.08;
      } else {
        this.dayNightProgress = 1;
      }
    }

    // 3. Ground scroll
    this.groundOffset += this.gameSpeed * dt;

    // 4. Update Inputs (Buffers & Coyote)
    if (this.jumpBufferedTime > 0) {
      this.jumpBufferedTime -= dt;
      this.tryPerformJump();
    }
    if (this.player.isGrounded) {
      this.coyoteTimer = 0.08; // 80ms
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= dt;
    }

    // 5. Duck state check
    if (this.isDuckHeld && this.player.isGrounded && !this.player.isDucking) {
      this.player.isDucking = true;
      this.player.width = this.duckWidth;
      this.player.height = this.duckHeight;
      this.player.y = this.groundY - this.duckHeight;
    }

    // 6. Player Physics
    if (!this.player.isGrounded) {
      this.player.vy += this.gravity * dt;
      this.player.y += this.player.vy * dt;

      // Landing check
      const currentHeight = this.player.isDucking ? this.duckHeight : this.defaultHeight;
      if (this.player.y >= this.groundY - currentHeight) {
        this.player.y = this.groundY - currentHeight;
        this.player.vy = 0;
        this.player.isGrounded = true;

        // Dust puff on land
        for (let i = 0; i < 4; i++) {
          this.particles.push({
            id: ++this.idCounter,
            x: this.player.x + this.player.width * 0.5 + (Math.random() - 0.5) * 20,
            y: this.groundY,
            vx: (Math.random() - 0.5) * 60,
            vy: -Math.random() * 30 - 10,
            size: 2.5 + Math.random() * 2,
            color: '#c49e49',
            alpha: 0.7,
            life: 0,
            maxLife: 0.3,
            type: 'sand',
          });
        }
      }
    }

    // 7. Player Animation Cycle
    if (this.player.isGrounded) {
      this.player.runCycle += dt * (this.gameSpeed / 28);

      // Running dust puffs occasionally
      this.player.bubbleTimer += dt;
      if (this.player.bubbleTimer > 0.12) {
        this.player.bubbleTimer = 0;
        this.particles.push({
          id: ++this.idCounter,
          x: this.player.x + 8,
          y: this.groundY - 2,
          vx: -this.gameSpeed * 0.4 + (Math.random() - 0.5) * 20,
          vy: -Math.random() * 25 - 5,
          size: 2 + Math.random() * 2,
          color: '#c49e49',
          alpha: 0.6,
          life: 0,
          maxLife: 0.25,
          type: 'sand',
        });
      }
    }

    // 8. Obstacles Spawner & Movement
    this.updateObstacles(dt, width);

    // 9. Collision Detection
    this.checkCollisions();
  }

  private updateObstacles(dt: number, width: number) {
    // Move existing obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const speed = obs.flySpeedBonus ? this.gameSpeed + obs.flySpeedBonus : this.gameSpeed;
      obs.x -= speed * dt;
      obs.animTimer += dt;

      // Remove off-screen obstacles
      if (obs.x + obs.width < -100) {
        this.obstacles.splice(i, 1);
      }
    }

    // Spawn new obstacles
    this.nextObstacleDistance -= this.gameSpeed * dt;
    if (this.nextObstacleDistance <= 0) {
      this.spawnObstacle(width);
      // Dynamic gap between obstacles (randomized, slightly tighter as game gets faster)
      const minGap = Math.max(340, 520 - Math.sqrt(this.score) * 7);
      const randomExtra = Math.random() * 320;
      this.nextObstacleDistance = minGap + randomExtra;
    }
  }

  private spawnObstacle(screenWidth: number) {
    const isHighLevel = this.score > 350;
    const canSpawnAir = isHighLevel && Math.random() < 0.42;

    if (canSpawnAir) {
      // Airborne obstacles (Flying Electric Jellyfish or Flying Snapping Clam)
      const isElectric = Math.random() > 0.35;
      const obsType: ObstacleType = isElectric ? 'flying_electric_jelly' : 'flying_clam';
      const obsWidth = 44;
      const obsHeight = 36;

      // Heights:
      // High: can run under without ducking
      // Mid: MUST duck under or jump over with perfect timing
      const spawnAtMid = Math.random() < 0.7;
      const obsY = spawnAtMid
        ? this.groundY - this.defaultHeight + 10 // SpongeBob upright hits it; ducking (height 34) safely slides under!
        : this.groundY - this.defaultHeight - 38; // high flying, jump to hit or run under

      this.obstacles.push({
        id: ++this.idCounter,
        type: obsType,
        x: screenWidth + 50,
        y: obsY,
        width: obsWidth,
        height: obsHeight,
        isAir: true,
        flySpeedBonus: 40 + Math.random() * 30,
        animTimer: 0,
      });
    } else {
      // Ground obstacles
      const groundTypes: ObstacleType[] = ['kelp_single', 'kelp_double', 'anchor', 'urchin', 'plankton_trap'];
      // Random pick with weighted balance
      const pick = groundTypes[Math.floor(Math.random() * groundTypes.length)];

      let width = 36;
      let height = 50;

      switch (pick) {
        case 'kelp_single':
          width = 30;
          height = 48 + Math.random() * 12;
          break;
        case 'kelp_double':
          width = 54;
          height = 54;
          break;
        case 'anchor':
          width = 46;
          height = 58;
          break;
        case 'urchin':
          width = 40;
          height = 36;
          break;
        case 'plankton_trap':
          width = 32;
          height = 44;
          break;
      }

      this.obstacles.push({
        id: ++this.idCounter,
        type: pick,
        x: screenWidth + 40,
        y: this.groundY - height,
        width: width,
        height: height,
        isAir: false,
        animTimer: 0,
      });
    }
  }

  private checkCollisions() {
    // Tight player bounding box (inset by 5px so near misses are forgiving & rewarding)
    const pInsetX = 8;
    const pInsetY = 6;
    const px = this.player.x + pInsetX;
    const py = this.player.y + pInsetY;
    const pw = this.player.width - pInsetX * 2;
    const ph = this.player.height - pInsetY * 2;

    for (const obs of this.obstacles) {
      const oInsetX = 7;
      const oInsetY = obs.isAir ? 6 : 4;
      const ox = obs.x + oInsetX;
      const oy = obs.y + oInsetY;
      const ow = obs.width - oInsetX * 2;
      const oh = obs.height - oInsetY * 2;

      // AABB Box Intersection Check
      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
        // Impact!
        this.triggerGameOver();
        break;
      }
    }
  }

  private triggerGameOver() {
    this.state = 'GAME_OVER';
    soundManager.playHit();

    // Visual feedback: Hitstop (60ms) and camera shake
    this.hitstopTimer = 0.08;
    this.screenShakeIntensity = 12;

    // Sponge crumbs & impact star particles
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 180;
      this.particles.push({
        id: ++this.idCounter,
        x: this.player.x + this.player.width * 0.5,
        y: this.player.y + this.player.height * 0.5,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.random() * 5,
        color: i % 2 === 0 ? '#facc15' : '#fef08a',
        alpha: 1,
        life: 0,
        maxLife: 0.6,
        type: i % 3 === 0 ? 'star' : 'sponge_crumb',
      });
    }

    // High score check
    if (this.score > this.highScore) {
      this.highScore = Math.floor(this.score);
      try {
        localStorage.setItem('spongebob_runner_hi_score', String(this.highScore));
      } catch {
        // ignore
      }
    }

    this.callbacks.onStateChange(this.state);
    this.callbacks.onScoreUpdate(this.score, this.highScore);
  }

  private updateBackgroundJellyfish(dt: number, width: number) {
    this.jellyfishes.forEach((jelly) => {
      jelly.x -= jelly.speed * dt;
      jelly.pulsePhase += dt * 3.5;

      // Wrap around screen
      if (jelly.x + jelly.size * 2 < -50) {
        jelly.x = width + 50 + Math.random() * 100;
        jelly.y = 30 + Math.random() * (this.groundY * 0.55);
      }
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'bubble') {
        p.vy -= 40 * dt; // Bubbles float upward
      } else {
        p.vy += 220 * dt; // Gravity on crumbs/sand
      }

      p.alpha = Math.max(0, 1 - p.life / p.maxLife);

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private render() {
    const width = this.getLogicalWidth();
    const height = this.getLogicalHeight();

    // Screen shake vector
    const shakeX = this.screenShakeIntensity > 0 ? (Math.random() - 0.5) * this.screenShakeIntensity : 0;
    const shakeY = this.screenShakeIntensity > 0 ? (Math.random() - 0.5) * this.screenShakeIntensity : 0;

    this.renderer.render(
      width,
      height,
      this.player,
      this.obstacles,
      this.jellyfishes,
      this.particles,
      this.groundDetails,
      this.groundOffset,
      this.groundY,
      this.score,
      this.highScore,
      this.dayNightProgress,
      this.milestoneFlashTimer,
      this.state === 'GAME_OVER',
      { x: shakeX, y: shakeY }
    );
  }

  private getLogicalWidth(): number {
    return this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
  }

  private getLogicalHeight(): number {
    return this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
  }

  public getState(): GameState {
    return this.state;
  }

  public getScore(): number {
    return this.score;
  }

  public getHighScore(): number {
    return this.highScore;
  }
}
