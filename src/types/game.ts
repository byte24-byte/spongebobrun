export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type ObstacleType =
  | 'kelp_single'
  | 'kelp_double'
  | 'anchor'
  | 'urchin'
  | 'plankton_trap'
  | 'flying_electric_jelly'
  | 'flying_clam';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  isAir: boolean;
  flySpeedBonus?: number;
  animTimer: number;
}

export interface BackgroundJellyfish {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  pulsePhase: number;
  color: 'pink' | 'purple' | 'cyan';
  tentacleLength: number;
}

export interface AmbientBubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  speedY: number;
  wobbleSpeed: number;
  wobblePhase: number;
  alpha: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'sand' | 'bubble' | 'star' | 'sponge_crumb';
}

export interface GroundDetail {
  x: number;
  y: number;
  type: 'pebble' | 'shell' | 'grass' | 'starfish';
  size: number;
  color: string;
}

export interface Player {
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  isDucking: boolean;
  runCycle: number;
  bubbleTimer: number;
  blinkTimer: number;
  eyeXOffset: number;
  hatAngle: number;
}
