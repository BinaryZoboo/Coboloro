import { useCallback, useEffect, useRef } from "react";

const CELL_SIZE       = 60;
const SNAKE_SPEED     = 140;
const INTERACTIVE_SPD = 118;
const COIN_COUNT      = 4;
const INIT_LENGTH     = 6;
const MAX_LENGTH_AI   = 24;

const C_MAIN  = "245, 193, 136";
const C_LIGHT = "248, 212, 170";
const C_DARK  = "224, 154,  90";

interface Point { x: number; y: number; }
type Direction = "up" | "down" | "left" | "right";

const DIRS: Record<Direction, Point> = {
  up:    { x:  0, y: -1 },
  down:  { x:  0, y:  1 },
  left:  { x: -1, y:  0 },
  right: { x:  1, y:  0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  up: "down", down: "up", left: "right", right: "left",
};

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",   w: "up",   W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
};

interface SnakeBackgroundProps {
  interactive?: boolean;
  onScoreChange?: (score: number) => void;
  onGameOver?: (score: number) => void;
}

export function SnakeBackground({
  interactive = false,
  onScoreChange,
  onGameOver,
}: SnakeBackgroundProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastMoveRef  = useRef<number>(0);
  const playerDirRef = useRef<Direction | null>(null);
  const deadRef      = useRef(false);

  const stateRef = useRef<{
    snake: Point[];
    direction: Direction;
    coins: Point[];
    cols: number;
    rows: number;
    coinPulse: number;
    collectAnimations: { x: number; y: number; frame: number }[];
    score: number;
  }>({
    snake: [], direction: "right", coins: [],
    cols: 0, rows: 0, coinPulse: 0, collectAnimations: [], score: 0,
  });

  const initGame = useCallback((width: number, height: number) => {
    const state = stateRef.current;
    state.cols = Math.floor(width  / CELL_SIZE);
    state.rows = Math.floor(height / CELL_SIZE);
    const sx = Math.floor(state.cols / 4);
    const sy = Math.floor(state.rows / 2);
    state.snake = [];
    for (let i = INIT_LENGTH - 1; i >= 0; i--) state.snake.push({ x: sx - i, y: sy });
    state.direction       = "right";
    state.coins           = [];
    state.collectAnimations = [];
    state.score           = 0;
    deadRef.current       = false;
    playerDirRef.current  = null;
    for (let i = 0; i < COIN_COUNT; i++) spawnCoin();
    if (interactive) onScoreChange?.(0);
  }, [interactive, onScoreChange]);

  function spawnCoin() {
    const { cols, rows, snake, coins } = stateRef.current;
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = Math.floor(Math.random() * (cols - 2)) + 1;
      const y = Math.floor(Math.random() * (rows - 2)) + 1;
      if (!snake.some(s => s.x === x && s.y === y) && !coins.some(c => c.x === x && c.y === y)) {
        coins.push({ x, y });
        return;
      }
    }
  }

  function chooseDirection(): Direction {
    const { snake, coins, direction, cols, rows } = stateRef.current;
    const head = snake[snake.length - 1];
    let nearest: Point | null = null;
    let nearestDist = Infinity;
    for (const coin of coins) {
      const d = Math.abs(coin.x - head.x) + Math.abs(coin.y - head.y);
      if (d < nearestDist) { nearestDist = d; nearest = coin; }
    }
    const candidates = (["up", "down", "left", "right"] as Direction[])
      .filter(d => d !== OPPOSITE[direction])
      .filter(d => {
        const n = { x: head.x + DIRS[d].x, y: head.y + DIRS[d].y };
        return n.x >= 0 && n.x < cols && n.y >= 0 && n.y < rows &&
               !snake.some(s => s.x === n.x && s.y === n.y);
      });
    if (!candidates.length) return direction;
    if (!nearest) return candidates[Math.floor(Math.random() * candidates.length)];
    const scored = candidates.map(d => ({
      d,
      dist: Math.abs(nearest!.x - (head.x + DIRS[d].x)) + Math.abs(nearest!.y - (head.y + DIRS[d].y)),
    })).sort((a, b) => a.dist - b.dist);
    return scored.length > 1 && Math.random() < 0.15 ? scored[1].d : scored[0].d;
  }

  function moveSnake() {
    if (deadRef.current) return;
    const state = stateRef.current;

    if (interactive) {
      const p = playerDirRef.current;
      if (p && p !== OPPOSITE[state.direction]) state.direction = p;
      playerDirRef.current = null;
    } else {
      state.direction = chooseDirection();
    }

    const delta   = DIRS[state.direction];
    const head    = state.snake[state.snake.length - 1];
    const newHead = { x: head.x + delta.x, y: head.y + delta.y };

    const oob  = newHead.x < 0 || newHead.x >= state.cols || newHead.y < 0 || newHead.y >= state.rows;
    const self = state.snake.some(s => s.x === newHead.x && s.y === newHead.y);

    if (oob || self) {
      if (interactive) {
        deadRef.current = true;
        onGameOver?.(state.score);
      } else {
        const c = canvasRef.current;
        if (c) initGame(c.width, c.height);
      }
      return;
    }

    state.snake.push(newHead);
    const ci = state.coins.findIndex(c => c.x === newHead.x && c.y === newHead.y);
    if (ci !== -1) {
      state.collectAnimations.push({ x: newHead.x, y: newHead.y, frame: 0 });
      state.coins.splice(ci, 1);
      spawnCoin();
      if (interactive) {
        state.score++;
        onScoreChange?.(state.score);
      }
    } else {
      state.snake.shift();
    }
    if (!interactive && state.snake.length > MAX_LENGTH_AI) state.snake.shift();
  }

  function drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number, ts: number) {
    const state = stateRef.current;
    state.coinPulse = (Math.sin(ts / 500) + 1) / 2;
    ctx.clearRect(0, 0, width, height);

    const { snake, coins, collectAnimations, coinPulse } = state;
    const len = snake.length;

    for (let i = 0; i < len; i++) {
      const s  = snake[i];
      const p  = i / len;
      const a  = 0.02 + p * 0.07;
      const cx = s.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = s.y * CELL_SIZE + CELL_SIZE / 2;
      const gr = CELL_SIZE * 0.85;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      glow.addColorStop(0, `rgba(${C_MAIN}, ${a.toFixed(3)})`);
      glow.addColorStop(1, `rgba(${C_MAIN}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    }

    for (let i = 1; i < len; i++) {
      const p   = i / len;
      const s   = snake[i];
      const ps  = snake[i - 1];
      const cx  = s.x  * CELL_SIZE + CELL_SIZE / 2;
      const cy  = s.y  * CELL_SIZE + CELL_SIZE / 2;
      const pcx = ps.x * CELL_SIZE + CELL_SIZE / 2;
      const pcy = ps.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${C_MAIN}, ${(0.05 + p * 0.14).toFixed(3)})`;
      ctx.lineWidth   = CELL_SIZE * (0.14 + p * 0.11);
      ctx.lineCap     = "round";
      ctx.moveTo(pcx, pcy);
      ctx.lineTo(cx,  cy);
      ctx.stroke();
    }

    for (let i = 0; i < len; i++) {
      const s      = snake[i];
      const p      = i / len;
      const isHead = i === len - 1;
      const a      = 0.10 + p * 0.28;
      const size   = isHead ? CELL_SIZE * 0.58 : CELL_SIZE * (0.28 + p * 0.16);
      const cx     = s.x * CELL_SIZE + CELL_SIZE / 2;
      const cy     = s.y * CELL_SIZE + CELL_SIZE / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);

      if (isHead) {
        const hg = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, size / 2);
        hg.addColorStop(0, `rgba(${C_LIGHT}, ${(a + 0.18).toFixed(3)})`);
        hg.addColorStop(1, `rgba(${C_MAIN},  ${a.toFixed(3)})`);
        ctx.fillStyle = hg;
      } else {
        const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
        sg.addColorStop(0, `rgba(${C_LIGHT}, ${(a * 0.9).toFixed(3)})`);
        sg.addColorStop(1, `rgba(${C_DARK},  ${(a * 0.6).toFixed(3)})`);
        ctx.fillStyle = sg;
      }
      ctx.fill();

      if (isHead) {
        const eo  = size * 0.16;
        const er  = size * 0.07;
        const dir = state.direction;
        const eyes =
          dir === "right" ? [{ dx:  eo * 0.6, dy: -eo }, { dx:  eo * 0.6, dy: eo }]
        : dir === "left"  ? [{ dx: -eo * 0.6, dy: -eo }, { dx: -eo * 0.6, dy: eo }]
        : dir === "up"    ? [{ dx: -eo, dy: -eo * 0.6 }, { dx:  eo, dy: -eo * 0.6 }]
        :                   [{ dx: -eo, dy:  eo * 0.6 }, { dx:  eo, dy:  eo * 0.6 }];
        for (const e of eyes) {
          ctx.beginPath();
          ctx.arc(cx + e.dx, cy + e.dy, er, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(26, 20, 14, 0.85)";
          ctx.fill();
        }
      }
    }

    for (const coin of coins) {
      const cx     = coin.x * CELL_SIZE + CELL_SIZE / 2;
      const cy     = coin.y * CELL_SIZE + CELL_SIZE / 2;
      const pulse  = 1 + coinPulse * 0.10;
      const coinR  = CELL_SIZE * 0.21 * pulse;
      const ga     = 0.07 + coinPulse * 0.07;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL_SIZE * 0.55);
      cg.addColorStop(0, `rgba(${C_MAIN}, ${ga.toFixed(3)})`);
      cg.addColorStop(1, `rgba(${C_MAIN}, 0)`);
      ctx.fillStyle = cg;
      ctx.fillRect(cx - CELL_SIZE, cy - CELL_SIZE, CELL_SIZE * 2, CELL_SIZE * 2);

      ctx.beginPath();
      ctx.arc(cx, cy, coinR, 0, Math.PI * 2);
      const coinGrad = ctx.createRadialGradient(cx - coinR * 0.3, cy - coinR * 0.3, 0, cx, cy, coinR);
      coinGrad.addColorStop(0,   `rgba(${C_LIGHT}, 0.55)`);
      coinGrad.addColorStop(0.6, `rgba(${C_MAIN},  0.38)`);
      coinGrad.addColorStop(1,   `rgba(${C_DARK},  0.28)`);
      ctx.fillStyle = coinGrad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${C_MAIN}, 0.35)`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.fillStyle    = `rgba(${C_DARK}, 0.75)`;
      ctx.font         = `bold ${Math.round(coinR * 1.05).toString()}px Inter, sans-serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("€", cx, cy + 1);
    }

    for (let i = collectAnimations.length - 1; i >= 0; i--) {
      const anim = collectAnimations[i];
      const cx   = anim.x * CELL_SIZE + CELL_SIZE / 2;
      const cy   = anim.y * CELL_SIZE + CELL_SIZE / 2;
      const t    = anim.frame / 22;
      const r    = CELL_SIZE * 0.28 + t * CELL_SIZE * 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${C_LIGHT}, ${(0.45 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth   = 2.5 * (1 - t);
      ctx.stroke();
      if (t < 0.35) {
        const fl = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
        fl.addColorStop(0, `rgba(${C_LIGHT}, ${(0.28 * (1 - t / 0.35)).toFixed(3)})`);
        fl.addColorStop(1, `rgba(${C_LIGHT}, 0)`);
        ctx.fillStyle = fl;
        ctx.fill();
      }
      anim.frame++;
      if (anim.frame > 22) collectAnimations.splice(i, 1);
    }
  }

  useEffect(() => {
    if (!interactive) return;
    function onKey(e: KeyboardEvent) {
      const dir = KEY_MAP[e.key];
      if (dir) { e.preventDefault(); playerDirRef.current = dir; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interactive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx   = canvas.getContext("2d");
    if (!ctx) return;
    const speed = interactive ? INTERACTIVE_SPD : SNAKE_SPEED;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      initGame(canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    function loop(ts: number) {
      if (!canvas || !ctx) return;
      if (ts - lastMoveRef.current > speed) {
        moveSnake();
        lastMoveRef.current = ts;
      }
      drawFrame(ctx, canvas.width, canvas.height, ts);
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initGame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}
