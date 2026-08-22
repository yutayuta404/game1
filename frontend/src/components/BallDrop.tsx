'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Matter from 'matter-js';
import type { WinnerSide } from '@/types';

interface BallDropProps {
  winner: WinnerSide | null;
  jackpotHit: boolean;
  jackpotAmount: number;
  onComplete: () => void;
}

export function BallDrop({ winner, jackpotHit, jackpotAmount, onComplete }: BallDropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const ballsRef = useRef<Matter.Body[]>([]);
  const [showResult, setShowResult] = useState(false);
  const winnerRef = useRef(winner);
  const jackpotRef = useRef({ hit: jackpotHit, amount: jackpotAmount });

  winnerRef.current = winner;
  jackpotRef.current = { hit: jackpotHit, amount: jackpotAmount };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = Matter.Engine.create();
    engine.world.gravity.y = 1.2;
    engineRef.current = engine;

    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width: canvas.width,
        height: canvas.height,
        wireframes: false,
        background: 'transparent',
      },
    });
    renderRef.current = render;

    const width = canvas.width;
    const height = canvas.height;

    const ground = Matter.Bodies.rectangle(width / 2, height + 20, width, 40, {
      isStatic: true,
      render: { fillStyle: 'transparent' },
    });

    const leftWall = Matter.Bodies.rectangle(-20, height / 2, 40, height, {
      isStatic: true,
      render: { fillStyle: 'transparent' },
    });

    const rightWall = Matter.Bodies.rectangle(width + 20, height / 2, 40, height, {
      isStatic: true,
      render: { fillStyle: 'transparent' },
    });

    const funnelLeft = Matter.Bodies.trapezoid(width * 0.3, height * 0.6, 20, height * 0.4, 0.5, {
      isStatic: true,
      render: { fillStyle: '#334155', strokeStyle: '#475569', lineWidth: 2 },
      chamfer: { radius: 10 },
    });

    const funnelRight = Matter.Bodies.trapezoid(width * 0.7, height * 0.6, 20, height * 0.4, -0.5, {
      isStatic: true,
      render: { fillStyle: '#334155', strokeStyle: '#475569', lineWidth: 2 },
      chamfer: { radius: 10 },
    });

    const funnelBottom = Matter.Bodies.rectangle(width / 2, height * 0.82, width * 0.4, 20, {
      isStatic: true,
      render: { fillStyle: '#334155', strokeStyle: '#475569', lineWidth: 2 },
    });

    const winnerZone = Matter.Bodies.rectangle(
      winnerRef.current === 'MESSI' ? width * 0.3 : width * 0.7,
      height * 0.9,
      width * 0.35,
      40,
      {
        isStatic: true,
        isSensor: true,
        label: 'winnerZone',
        render: { 
          fillStyle: winnerRef.current === 'MESSI' ? 'rgba(0, 120, 212, 0.3)' : 'rgba(229, 57, 53, 0.3)',
          strokeStyle: winnerRef.current === 'MESSI' ? '#0078D4' : '#E53935',
          lineWidth: 2,
        },
      }
    );

    Matter.World.add(engine.world, [
      ground, leftWall, rightWall,
      funnelLeft, funnelRight, funnelBottom,
      winnerZone
    ]);

    const createBall = (x: number, color: string, label: string) => {
      const ball = Matter.Bodies.circle(x, -50, 24, {
        restitution: 0.3,
        friction: 0.1,
        frictionAir: 0.02,
        density: 0.001,
        label,
        render: {
          fillStyle: color,
          strokeStyle: color === '#0078D4' ? '#005A9E' : '#C62828',
          lineWidth: 3,
        },
        plugin: {
          attractors: [
            function(bodyA: Matter.Body, bodyB: Matter.Body) {
              return {
                x: (bodyB.position.x - bodyA.position.x) * 0.0001,
                y: (bodyB.position.y - bodyA.position.y) * 0.0001,
              };
            }
          ]
        }
      });
      return ball;
    };

    const messiBall = createBall(width * 0.25, '#0078D4', 'messi');
    const ronaldoBall = createBall(width * 0.75, '#E53935', 'ronaldo');

    ballsRef.current = [messiBall, ronaldoBall];
    Matter.World.add(engine.world, [messiBall, ronaldoBall]);

    let winnerDetected = false;

    Matter.Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        if ((pair.bodyA.label === 'winnerZone' || pair.bodyB.label === 'winnerZone') &&
            (pair.bodyA.label === 'messi' || pair.bodyA.label === 'ronaldo' ||
             pair.bodyB.label === 'messi' || pair.bodyB.label === 'ronaldo')) {
          if (!winnerDetected) {
            winnerDetected = true;
            setTimeout(() => {
              setShowResult(true);
              setTimeout(onComplete, 3000);
            }, 1000);
          }
        }
      }
    });

    Matter.Render.run(render);

    const runEngine = () => {
      Matter.Engine.update(engine, 1000 / 60);
      animationIdRef.current = requestAnimationFrame(runEngine);
    };
    runEngine();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      Matter.Render.stop(render);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (renderRef.current) {
          renderRef.current.options.width = canvas.width;
          renderRef.current.options.height = canvas.height;
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="relative w-full h-64 overflow-hidden rounded-xl bg-dark-900/50 border border-dark-700">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">
          <div className="flex items-center gap-2 bg-dark-900/80 px-3 py-1 rounded-full border border-messi-500/50">
            <div className="w-3 h-3 rounded-full bg-messi-500" />
            <span className="text-xs text-messi-400 font-medium">Messi</span>
          </div>
          <div className="flex items-center gap-2 bg-dark-900/80 px-3 py-1 rounded-full border border-ronaldo-500/50">
            <div className="w-3 h-3 rounded-full bg-ronaldo-500" />
            <span className="text-xs text-ronaldo-400 font-medium">Ronaldo</span>
          </div>
        </div>
      </div>

      {showResult && winnerRef.current && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-4"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="mb-4"
          >
            <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto ${
              winnerRef.current === 'MESSI' 
                ? 'border-messi-500 bg-messi-500/20' 
                : 'border-ronaldo-500 bg-ronaldo-500/20'
            }`}>
              <span className="text-4xl font-bold" style={{ color: winnerRef.current === 'MESSI' ? '#0078D4' : '#E53935' }}>
                {winnerRef.current === 'MESSI' ? 'M' : 'R'}
              </span>
            </div>
          </motion.div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: winnerRef.current === 'MESSI' ? '#0078D4' : '#E53935' }}>
            {winnerRef.current} Wins!
          </h2>
          {jackpotRef.current.hit && jackpotRef.current.amount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center gap-2 bg-gold-500/20 border border-gold-500 px-4 py-2 rounded-full"
            >
              <span className="text-gold-500 text-lg">💰 JACKPOT!</span>
              <span className="text-gold-500 font-mono text-xl">{jackpotRef.current.amount.toFixed(2)}</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}