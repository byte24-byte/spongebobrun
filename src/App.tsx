/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Pause, Play, RotateCcw, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './types/game';
import { soundManager } from './audio/soundManager';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Initialize Canvas & Game Engine once
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, {
      onStateChange: (state: GameState) => {
        setGameState(state);
      },
      onScoreUpdate: (curScore: number, hiScore: number) => {
        setScore(Math.floor(curScore));
        setHighScore(Math.floor(hiScore));
        if (curScore > hiScore && hiScore > 0) {
          setIsNewRecord(true);
        }
      },
    });

    engineRef.current = engine;

    // Window resize observer
    const handleResize = () => {
      engine.resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game controls
      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engine.handleJumpPress();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        engine.handleDuckPress();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        engine.togglePause();
      } else if (e.code === 'Enter') {
        if (engine.getState() === 'TITLE_MENU' || engine.getState() === 'GAME_OVER') {
          engine.startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        engine.handleJumpRelease();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        engine.handleDuckRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      engine.destroy();
    };
  }, []);

  const handleStartOrRestart = () => {
    setIsNewRecord(false);
    engineRef.current?.startGame();
  };

  const handleTogglePause = () => {
    engineRef.current?.togglePause();
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Touch handlers for mobile
  const handleTouchJumpStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    engineRef.current?.handleJumpPress();
  };

  const handleTouchJumpEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    engineRef.current?.handleJumpRelease();
  };

  const handleTouchDuckStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    engineRef.current?.handleDuckPress();
  };

  const handleTouchDuckEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    engineRef.current?.handleDuckRelease();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col items-center justify-center font-sans-fun select-none">
      {/* 1. Dedicated Isolated Canvas Viewport */}
      <div className="relative w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full block cursor-pointer"
          onClick={() => {
            if (gameState === 'TITLE_MENU' || gameState === 'GAME_OVER') {
              handleStartOrRestart();
            } else if (gameState === 'PLAYING') {
              engineRef.current?.handleJumpPress();
              setTimeout(() => engineRef.current?.handleJumpRelease(), 120);
            }
          }}
        />
      </div>

      {/* 2. Top Perimeter Status Cluster (Low-Occlusion, World-Matched) */}
      <header className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between pointer-events-none z-20">
        {/* Left: Minimal Game Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/70 border border-amber-400/30 px-3.5 py-1.5 rounded-xl shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#facc15]" />
            <span className="text-xs md:text-sm font-extrabold tracking-wide text-amber-300">
              스폰지밥 런
            </span>
          </div>

          {highScore > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/60 border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>최고기록</span>
              <span className="font-arcade text-amber-300 text-[11px] tabular-nums ml-1">
                {String(highScore).padStart(5, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Right: Functional Quick Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {gameState === 'PLAYING' && (
            <button
              onClick={handleTogglePause}
              title="일시 정지 (Esc)"
              aria-label="Pause game"
              className="p-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-md transition-colors"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleToggleMute}
            title={isMuted ? '소리 켜기' : '소리 끄기'}
            aria-label="Toggle sound"
            className="p-2.5 rounded-xl bg-slate-900/75 hover:bg-slate-800 text-slate-200 border border-slate-700/60 shadow-md transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* 3. Title Screen Overlay */}
      {gameState === 'TITLE_MENU' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/40 pointer-events-auto">
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-400/40 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center">
            {/* Bespoke Inline SVG Logo */}
            <div className="mb-4">
              <svg width="240" height="74" viewBox="0 0 240 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Yellow Cartoon Sponge Text Outline */}
                <text
                  x="120"
                  y="42"
                  textAnchor="middle"
                  fontFamily="'Press Start 2P', monospace"
                  fontSize="22"
                  fontWeight="900"
                  fill="#ca8a04"
                >
                  SPONGE
                </text>
                <text
                  x="120"
                  y="40"
                  textAnchor="middle"
                  fontFamily="'Press Start 2P', monospace"
                  fontSize="22"
                  fontWeight="900"
                  fill="#facc15"
                >
                  SPONGE
                </text>
                <text
                  x="120"
                  y="65"
                  textAnchor="middle"
                  fontFamily="'Press Start 2P', monospace"
                  fontSize="15"
                  fontWeight="800"
                  fill="#38bdf8"
                >
                  RUNNER
                </text>
              </svg>
            </div>

            <p className="text-sm text-sky-200 mb-6 font-medium">
              해파리가 둥실 떠다니는 비키니시티를 질주하세요!
            </p>

            {/* Start CTA Button */}
            <button
              onClick={handleStartOrRestart}
              className="w-full py-4 px-6 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-base tracking-wider uppercase shadow-[0_4px_20px_rgba(250,204,21,0.4)] hover:shadow-[0_6px_25px_rgba(250,204,21,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>게임 시작하기</span>
            </button>

            {/* Flat Control Hints */}
            <div className="mt-6 pt-5 border-t border-slate-800 w-full text-xs text-slate-400 flex flex-col gap-2">
              <div className="flex items-center justify-center gap-3 font-semibold text-slate-300">
                <span className="bg-slate-800 px-2.5 py-1 rounded-md text-amber-300 border border-slate-700">스페이스 / ↑</span>
                <span>점프</span>
                <span className="text-slate-600">·</span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-md text-amber-300 border border-slate-700">↓</span>
                <span>숙이기</span>
              </div>
              <p className="text-[11px] text-slate-400">
                모바일 환경에서는 화면 하단 버튼 또는 탭으로 조작할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Pause Screen Modal */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/60 pointer-events-auto">
          <div className="max-w-xs w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center">
            <h2 className="text-xl font-extrabold text-white mb-2">일시 정지</h2>
            <p className="text-xs text-slate-400 mb-6">잠시 쉬어가는 비키니시티</p>

            <button
              onClick={handleTogglePause}
              className="w-full py-3.5 px-6 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>계속 달리기 (Esc)</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/50 pointer-events-auto">
          <div className="max-w-sm w-full bg-slate-900/95 border border-rose-500/40 rounded-3xl p-7 text-center shadow-2xl flex flex-col items-center">
            <div className="text-rose-400 font-arcade text-lg tracking-wider mb-2">
              GAME OVER
            </div>

            <p className="text-xs text-slate-400 mb-6 font-medium">
              장애물에 걸려 넘어졌어요!
            </p>

            {/* Score Summary Box */}
            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>획득 점수</span>
                <span className="font-arcade text-white text-base tabular-nums">
                  {String(score).padStart(5, '0')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>최고 기록</span>
                </span>
                <span className="font-arcade text-amber-300 text-sm tabular-nums">
                  {String(highScore).padStart(5, '0')}
                </span>
              </div>

              {isNewRecord && (
                <div className="mt-1 py-1 px-3 bg-amber-400/10 border border-amber-400/30 rounded-xl text-amber-300 text-xs font-bold text-center">
                  신기록 달성 축하합니다!
                </div>
              )}
            </div>

            {/* Restart Button */}
            <button
              onClick={handleStartOrRestart}
              className="w-full py-4 px-6 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-2xl text-sm tracking-wider uppercase shadow-[0_4px_20px_rgba(250,204,21,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>다시 달리기 (Space / Enter)</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Mobile On-Screen Action Controls (Floating thumb buttons) */}
      {gameState === 'PLAYING' && (
        <div className="md:hidden absolute bottom-5 left-0 right-0 px-6 flex items-center justify-between pointer-events-none z-20">
          {/* Duck Button (Left Thumb) */}
          <button
            onTouchStart={handleTouchDuckStart}
            onTouchEnd={handleTouchDuckEnd}
            onMouseDown={handleTouchDuckStart}
            onMouseUp={handleTouchDuckEnd}
            className="pointer-events-auto w-16 h-16 rounded-2xl bg-slate-900/80 active:bg-amber-500/80 border-2 border-amber-400/40 text-amber-300 active:text-slate-950 flex flex-col items-center justify-center shadow-xl active:scale-90 transition-all select-none"
            aria-label="Duck / Slide"
          >
            <ArrowDown className="w-6 h-6" />
            <span className="text-[10px] font-extrabold mt-0.5">숙이기</span>
          </button>

          {/* Jump Button (Right Thumb) */}
          <button
            onTouchStart={handleTouchJumpStart}
            onTouchEnd={handleTouchJumpEnd}
            onMouseDown={handleTouchJumpStart}
            onMouseUp={handleTouchJumpEnd}
            className="pointer-events-auto w-18 h-18 rounded-2xl bg-amber-400/90 active:bg-amber-300 border-2 border-amber-200 text-slate-950 flex flex-col items-center justify-center shadow-xl active:scale-90 transition-all select-none"
            aria-label="Jump"
          >
            <ArrowUp className="w-7 h-7 stroke-[3]" />
            <span className="text-[11px] font-black mt-0.5">점프!</span>
          </button>
        </div>
      )}
    </div>
  );
}
