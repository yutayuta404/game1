import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import confetti from 'canvas-confetti';
import { Sparkles, Play } from 'lucide-react';
import type { TeamSide } from '../types/clash';
import { sound } from '../utils/audio';

interface BallDropCanvasProps {
  phase: 'betting' | 'dropping' | 'finished';
  onBallLanded: (winner: TeamSide) => void;
  onManualTriggerDrop?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export const BallDropCanvas: React.FC<BallDropCanvasProps> = ({
  phase,
  onBallLanded,
  onManualTriggerDrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballBodyRef = useRef<Matter.Body | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasLandedRef = useRef<boolean>(false);
  const particlesRef = useRef<Particle[]>([]);
  const [activeSideGlow, setActiveSideGlow] = useState<'messi' | 'ronaldo' | null>(null);

  // Keep latest callbacks/phase in refs so the single render loop never restarts
  const onBallLandedRef = useRef(onBallLanded);
  onBallLandedRef.current = onBallLanded;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Setup Matter.js world + ONE unified render loop (runs once on mount)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Force explicit canvas dimensions from parent container
    const width = canvas.parentElement?.clientWidth || 360;
    const height = 280;
    canvas.width = width;
    canvas.height = height;

    const { Engine, Bodies, Composite, Events } = Matter;
    const engine = Engine.create({
      gravity: { x: 0, y: 0.55 }, // slowed for suspenseful drop
    });
    engineRef.current = engine;

    const world = engine.world;

    // ---- Static world (walls, funnels, pegboard) built ONCE ----
    const wallOptions: Matter.IChamferableBodyDefinition = {
      isStatic: true,
      restitution: 0.6,
      friction: 0.05,
    };

    const funnelLeft = Bodies.rectangle(
      width * 0.08, height * 0.28, width * 0.28, 12,
      { ...wallOptions, angle: Math.PI / 4 }
    );
    const funnelRight = Bodies.rectangle(
      width * 0.92, height * 0.28, width * 0.28, 12,
      { ...wallOptions, angle: -Math.PI / 4 }
    );

    const leftWall = Bodies.rectangle(-5, height / 2, 20, height, wallOptions);
    const rightWall = Bodies.rectangle(width + 5, height / 2, 20, height, wallOptions);

    const centerDivider = Bodies.rectangle(width / 2, height - 25, 8, 60, {
      isStatic: true,
      chamfer: { radius: 3 },
      restitution: 0.5,
    });

    const floor = Bodies.rectangle(width / 2, height + 15, width, 30, {
      isStatic: true,
    });

    // Triangle pegboard grid
    const rows = 6;
    const pegRadius = 4.5;
    const pegs: Matter.Body[] = [];
    const pegSpacingY = 24;
    const startY = 48;

    for (let row = 0; row < rows; row++) {
      const count = row + 3;
      const pegSpacingX = (width * 0.62) / (rows + 2);
      const rowWidth = (count - 1) * pegSpacingX;
      const startX = (width - rowWidth) / 2;

      for (let col = 0; col < count; col++) {
        const x = startX + col * pegSpacingX;
        const y = startY + row * pegSpacingY;
        pegs.push(Bodies.circle(x, y, pegRadius, {
          isStatic: true,
          restitution: 0.75,
          friction: 0.02,
          label: 'peg',
        }));
      }
    }

    Composite.add(world, [leftWall, rightWall, centerDivider, floor, funnelLeft, funnelRight, ...pegs]);

    // Collision sounds + sparks
    const handleCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
      event.pairs.forEach((pair) => {
        const a = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB.label === 'ball' ? pair.bodyB : null;
        if (!a) return;
        const other = pair.bodyA.label === 'ball' ? pair.bodyB : pair.bodyA;
        if (other.label === 'peg') {
          sound.playPegBounce();
          for (let i = 0; i < 4; i++) {
            particlesRef.current.push({
              x: a.position.x,
              y: a.position.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: Math.random() > 0.5 ? '#F59E0B' : '#60A5FA',
              size: Math.random() * 2.5 + 1.5,
              alpha: 1,
              decay: 0.04 + Math.random() * 0.03,
            });
          }
        }
      });
    };
    Events.on(engine, 'collisionStart', handleCollision);

    // ---- SINGLE unified render loop: physics + drawing together ----
    const ctx = canvas.getContext('2d');
    let lastTime = performance.now();

    const renderLoop = (currentTime: number) => {
      const delta = Math.min(currentTime - lastTime, 33.33);
      lastTime = currentTime;
      Engine.update(engine, delta);

      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0D1117');
      bgGrad.addColorStop(1, '#111827');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Zone backlights (blue left, red right)
      const drawZoneGlow = (cx: number, color: string) => {
        const g = ctx.createRadialGradient(cx, height - 20, 10, cx, height - 20, width * 0.4);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - width * 0.25, height * 0.55, width * 0.5, height * 0.45);
      };
      drawZoneGlow(width * 0.25, 'rgba(37, 99, 235, 0.3)');
      drawZoneGlow(width * 0.75, 'rgba(239, 68, 68, 0.3)');

      // Golden pegs with glow ring
      pegs.forEach((peg) => {
        const px = peg.position.x;
        const py = peg.position.y;
        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, pegRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, pegRadius, 0, Math.PI * 2);
        const pg = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, pegRadius);
        pg.addColorStop(0, '#FFFFFF');
        pg.addColorStop(0.5, '#F59E0B');
        pg.addColorStop(1, '#B45309');
        ctx.fillStyle = pg;
        ctx.fill();
        ctx.restore();
      });

      // Center divider
      ctx.save();
      ctx.fillStyle = '#4B5563';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 4, height - 55, 8, 60, 4);
      ctx.fill();
      ctx.restore();

      // Collector labels
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#60A5FA';
      ctx.fillText('MESSI', width * 0.25, height - 12);
      ctx.fillStyle = '#F87171';
      ctx.fillText('RONALDO', width * 0.75, height - 12);
      ctx.restore();

      // Ball
      const ball = ballBodyRef.current;
      if (ball) {
        const { x, y } = ball.position;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        const bg = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 9);
        bg.addColorStop(0, '#FFFBEB');
        bg.addColorStop(0.4, '#FBBF24');
        bg.addColorStop(0.8, '#D97706');
        bg.addColorStop(1, '#92400E');
        ctx.fillStyle = bg;
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // Landing detection
        if (y >= height - 35 && !hasLandedRef.current) {
          hasLandedRef.current = true;
          const winningSide: TeamSide = x < width / 2 ? 'messi' : 'ronaldo';
          setActiveSideGlow(winningSide);
          sound.playWin();
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.6, x: winningSide === 'messi' ? 0.35 : 0.65 },
              colors: winningSide === 'messi'
                ? ['#3B82F6', '#60A5FA', '#93C5FD']
                : ['#EF4444', '#F87171', '#FCA5A5'],
            });
          } catch {
            /* noop */
          }
          onBallLandedRef.current(winningSide);
        }
      }

      // Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Top spawner dispenser
      ctx.save();
      ctx.fillStyle = '#1F2937';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 20, 2, 40, 16, [0, 0, 8, 8]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(phaseRef.current === 'dropping' ? 'DROP!' : '0XDUEL', width / 2, 13);
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      Events.off(engine, 'collisionStart', handleCollision);
      Composite.clear(world, false);
      Engine.clear(engine);
    };
  }, []);

  // Phase changes only spawn/remove the dynamic ball — static world untouched
  useEffect(() => {
    if (phase === 'dropping' && engineRef.current) {
      hasLandedRef.current = false;
      setActiveSideGlow(null);
      sound.playDropStart();

      const width = canvasRef.current?.width || 360;
      if (ballBodyRef.current) {
        Matter.Composite.remove(engineRef.current.world, ballBodyRef.current);
        ballBodyRef.current = null;
      }

      const randomOffset = (Math.random() - 0.5) * 14;
      const ball = Matter.Bodies.circle(width / 2 + randomOffset, 18, 9, {
        restitution: 0.72,
        friction: 0.02,
        frictionAir: 0.008,
        density: 0.04,
        label: 'ball',
      });
      Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 1.5, y: 1 });

      ballBodyRef.current = ball;
      Matter.Composite.add(engineRef.current.world, ball);
    } else if (phase === 'betting') {
      if (ballBodyRef.current && engineRef.current) {
        Matter.Composite.remove(engineRef.current.world, ballBodyRef.current);
        ballBodyRef.current = null;
      }
      hasLandedRef.current = false;
      setActiveSideGlow(null);
    }
  }, [phase]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[280px] bg-[#090D12] rounded-xl overflow-hidden border border-[#30363D] shadow-inner"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#161B22]/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-[#30363D] text-[10px] text-gray-300 font-mono">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>Matter.js 2D Physics</span>
      </div>

      {onManualTriggerDrop && phase === 'betting' && (
        <button
          onClick={() => {
            sound.playClick();
            onManualTriggerDrop();
          }}
          title="Instant Drop Test"
          className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold active:scale-95 transition-transform cursor-pointer"
        >
          <Play className="w-2.5 h-2.5 fill-amber-300" />
          <span>Demo Drop</span>
        </button>
      )}

      {activeSideGlow === 'messi' && (
        <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-500/20 pointer-events-none animate-pulse border-r-2 border-blue-400" />
      )}
      {activeSideGlow === 'ronaldo' && (
        <div className="absolute inset-y-0 right-0 w-1/2 bg-red-500/20 pointer-events-none animate-pulse border-l-2 border-red-400" />
      )}
    </div>
  );
};