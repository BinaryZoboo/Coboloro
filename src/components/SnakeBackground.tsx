import { useCallback, useEffect, useRef } from "react";
const CELL_SIZE = 60;
const SNAKE_SPEED = 150; // ms per move
const COIN_COUNT = 3;
const SNAKE_INITIAL_LENGTH = 5;
interface Point {
  x: number;
  y: number;
}
type Direction = "up" | "down" | "left" | "right";
const DIRECTIONS: Record<Direction, Point> = {
  up: {
    x: 0,
    y: -1,
  },
  down: {
    x: 0,
    y: 1,
  },
  left: {
    x: -1,
    y: 0,
  },
  right: {
    x: 1,
    y: 0,
  },
};
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
export function SnakeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    snake: Point[];
    direction: Direction;
    coins: Point[];
    cols: number;
    rows: number;
    coinPulse: number;
    collectAnimations: {
      x: number;
      y: number;
      frame: number;
    }[];
  }>({
    snake: [],
    direction: "right",
    coins: [],
    cols: 0,
    rows: 0,
    coinPulse: 0,
    collectAnimations: [],
  });
  const animFrameRef = useRef<number>(0);
  const lastMoveRef = useRef<number>(0);
  const initGame = useCallback((width: number, height: number) => {
    const cols = Math.floor(width / CELL_SIZE);
    const rows = Math.floor(height / CELL_SIZE);
    const state = stateRef.current;
    state.cols = cols;
    state.rows = rows;
    // Start snake in the middle-left area
    const startX = Math.floor(cols / 4);
    const startY = Math.floor(rows / 2);
    state.snake = [];
    for (let i = SNAKE_INITIAL_LENGTH - 1; i >= 0; i--) {
      state.snake.push({
        x: startX - i,
        y: startY,
      });
    }
    state.direction = "right";
    state.coins = [];
    state.collectAnimations = [];
    // Place initial coins
    for (let i = 0; i < COIN_COUNT; i++) {
      spawnCoin();
    }
  }, []);
  function spawnCoin() {
    const state = stateRef.current;
    const { cols, rows, snake, coins } = state;
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(Math.random() * (cols - 2)) + 1;
      const y = Math.floor(Math.random() * (rows - 2)) + 1;
      const occupied =
        snake.some((s) => s.x === x && s.y === y) ||
        coins.some((c) => c.x === x && c.y === y);
      if (!occupied) {
        coins.push({
          x,
          y,
        });
        return;
      }
      attempts++;
    }
  }
  function chooseDirection() {
    const state = stateRef.current;
    const { snake, coins, direction, cols, rows } = state;
    const head = snake[snake.length - 1];
    // Find nearest coin
    let nearestCoin: Point | null = null;
    let nearestDist = Infinity;
    for (const coin of coins) {
      const dist = Math.abs(coin.x - head.x) + Math.abs(coin.y - head.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestCoin = coin;
      }
    }
    const possibleDirs: Direction[] = (
      ["up", "down", "left", "right"] as Direction[]
    ).filter((d) => d !== OPPOSITE[direction]);
    // Check which directions are safe (no wall, no self)
    const safeDirs = possibleDirs.filter((d) => {
      const delta = DIRECTIONS[d];
      const nx = head.x + delta.x;
      const ny = head.y + delta.y;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return false;
      if (snake.some((s) => s.x === nx && s.y === ny)) return false;
      return true;
    });
    if (safeDirs.length === 0) {
      // Trapped — just go forward (will reset)
      return direction;
    }
    if (nearestCoin) {
      // Score each safe direction by how much closer it gets to the coin
      const scored = safeDirs.map((d) => {
        const delta = DIRECTIONS[d];
        const nx = head.x + delta.x;
        const ny = head.y + delta.y;
        const dist =
          Math.abs(nearestCoin.x - nx) + Math.abs(nearestCoin.y - ny);
        return {
          dir: d,
          dist,
        };
      });
      scored.sort((a, b) => a.dist - b.dist);
      // Add slight randomness so it doesn't look robotic
      if (scored.length > 1 && Math.random() < 0.15) {
        return scored[1].dir;
      }
      return scored[0].dir;
    }
    // No coins — random safe direction
    return safeDirs[Math.floor(Math.random() * safeDirs.length)];
  }
  function moveSnake() {
    const state = stateRef.current;
    const { snake, cols, rows } = state;
    state.direction = chooseDirection();
    const delta = DIRECTIONS[state.direction];
    const head = snake[snake.length - 1];
    const newHead = {
      x: head.x + delta.x,
      y: head.y + delta.y,
    };
    // Wall collision or self collision — reset
    if (
      newHead.x < 0 ||
      newHead.x >= cols ||
      newHead.y < 0 ||
      newHead.y >= rows ||
      snake.some((s) => s.x === newHead.x && s.y === newHead.y)
    ) {
      const canvas = canvasRef.current;
      if (canvas) initGame(canvas.width, canvas.height);
      return;
    }
    snake.push(newHead);
    // Check coin collection
    const coinIdx = state.coins.findIndex(
      (c) => c.x === newHead.x && c.y === newHead.y,
    );
    if (coinIdx !== -1) {
      // Collect — add animation, don't remove tail (snake grows)
      state.collectAnimations.push({
        x: newHead.x,
        y: newHead.y,
        frame: 0,
      });
      state.coins.splice(coinIdx, 1);
      spawnCoin();
    } else {
      snake.shift(); // Remove tail
    }
    // Cap snake length
    if (snake.length > 20) {
      snake.shift();
    }
  }
  function drawFrame(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timestamp: number,
  ) {
    const state = stateRef.current;
    state.coinPulse = (Math.sin(timestamp / 400) + 1) / 2;
    ctx.clearRect(0, 0, width, height);
    // Draw snake body
    const { snake, coins, collectAnimations, coinPulse } = state;
    // Snake trail glow
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const progress = i / snake.length;
      const alpha = 0.03 + progress * 0.08;
      const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
      const glowRadius = CELL_SIZE * 0.8;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glow.addColorStop(0, `rgba(201, 168, 76, ${alpha.toString()})`);
      glow.addColorStop(1, "rgba(201, 168, 76, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(
        cx - glowRadius,
        cy - glowRadius,
        glowRadius * 2,
        glowRadius * 2,
      );
    }
    // Snake segments
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      const progress = i / snake.length;
      const isHead = i === snake.length - 1;
      const alpha = 0.12 + progress * 0.25;
      const size = isHead
        ? CELL_SIZE * 0.55
        : CELL_SIZE * (0.3 + progress * 0.15);
      const cx = seg.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = seg.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      if (isHead) {
        // Head — brighter gold
        const headGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
        headGrad.addColorStop(
          0,
          `rgba(232, 212, 139, ${(alpha + 0.15).toString()})`,
        );
        headGrad.addColorStop(1, `rgba(201, 168, 76, ${alpha.toString()})`);
        ctx.fillStyle = headGrad;
      } else {
        ctx.fillStyle = `rgba(201, 168, 76, ${alpha.toString()})`;
      }
      ctx.fill();
      // Connecting segments
      if (i > 0) {
        const prev = snake[i - 1];
        const pcx = prev.x * CELL_SIZE + CELL_SIZE / 2;
        const pcy = prev.y * CELL_SIZE + CELL_SIZE / 2;
        const connAlpha = 0.06 + progress * 0.12;
        const connWidth = CELL_SIZE * (0.15 + progress * 0.1);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(201, 168, 76, ${connAlpha.toString()})`;
        ctx.lineWidth = connWidth;
        ctx.lineCap = "round";
        ctx.moveTo(pcx, pcy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    }
    // Draw coins
    for (const coin of coins) {
      const cx = coin.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = coin.y * CELL_SIZE + CELL_SIZE / 2;
      const pulseScale = 1 + coinPulse * 0.12;
      const coinRadius = CELL_SIZE * 0.22 * pulseScale;
      const glowAlpha = 0.08 + coinPulse * 0.06;
      // Coin glow
      const coinGlow = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        CELL_SIZE * 0.6,
      );
      coinGlow.addColorStop(0, `rgba(201, 168, 76, ${glowAlpha.toString()})`);
      coinGlow.addColorStop(1, "rgba(201, 168, 76, 0)");
      ctx.fillStyle = coinGlow;
      ctx.fillRect(
        cx - CELL_SIZE,
        cy - CELL_SIZE,
        CELL_SIZE * 2,
        CELL_SIZE * 2,
      );
      // Coin circle
      ctx.beginPath();
      ctx.arc(cx, cy, coinRadius, 0, Math.PI * 2);
      const coinGrad = ctx.createRadialGradient(
        cx - 2,
        cy - 2,
        0,
        cx,
        cy,
        coinRadius,
      );
      coinGrad.addColorStop(0, `rgba(232, 212, 139, 0.5)`);
      coinGrad.addColorStop(0.7, `rgba(201, 168, 76, 0.35)`);
      coinGrad.addColorStop(1, `rgba(160, 133, 53, 0.25)`);
      ctx.fillStyle = coinGrad;
      ctx.fill();
      // Coin border
      ctx.strokeStyle = `rgba(201, 168, 76, 0.3)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // € symbol
      ctx.fillStyle = `rgba(201, 168, 76, 0.5)`;
      ctx.font = `bold ${Math.round(coinRadius * 1.1).toString()}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("€", cx, cy + 1);
    }
    // Collection burst animations
    for (let i = collectAnimations.length - 1; i >= 0; i--) {
      const anim = collectAnimations[i];
      const cx = anim.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = anim.y * CELL_SIZE + CELL_SIZE / 2;
      const progress = anim.frame / 20;
      const radius = CELL_SIZE * 0.3 + progress * CELL_SIZE * 0.8;
      const alpha = 0.4 * (1 - progress);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(232, 212, 139, ${alpha.toString()})`;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.stroke();
      // Inner flash
      if (progress < 0.3) {
        const flashGlow = ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          radius * 0.5,
        );
        flashGlow.addColorStop(
          0,
          `rgba(232, 212, 139, ${(0.3 * (1 - progress / 0.3)).toString()})`,
        );
        flashGlow.addColorStop(1, "rgba(232, 212, 139, 0)");
        ctx.fillStyle = flashGlow;
        ctx.fill();
      }
      anim.frame++;
      if (anim.frame > 20) {
        collectAnimations.splice(i, 1);
      }
    }
  }
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initGame(canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);
    function loop(timestamp: number) {
      if (!canvas || !ctx) return;
      // Move snake at fixed interval
      if (timestamp - lastMoveRef.current > SNAKE_SPEED) {
        moveSnake();
        lastMoveRef.current = timestamp;
      }
      drawFrame(ctx, canvas.width, canvas.height, timestamp);
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
      style={{
        opacity: 0.7,
      }}
      aria-hidden="true"
    />
  );
}
