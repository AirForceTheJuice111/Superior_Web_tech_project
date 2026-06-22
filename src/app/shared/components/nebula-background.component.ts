import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';

/**
 * 全局宇宙星云动态背景层。
 * - 固定在最底层 (fixed inset-0, z-index:-1, pointer-events:none)，不影响任何前景布局/交互。
 * - 三层:深空渐变底 + 缓慢漂移的雾状光团(screen 混合) + canvas 绘制的星尘/闪烁星点。
 * - 仅用 transform/opacity 动画;星尘走单个 canvas(零额外 DOM 节点);rAF 在 Angular zone 外运行。
 * - 尊重 prefers-reduced-motion:降级为静态星空,光团停止漂移。
 */
interface Star {
  x: number;
  y: number;
  r: number;
  a: number;        // base alpha
  amp: number;      // twinkle amplitude
  phase: number;
  speed: number;    // twinkle speed
  dx: number;       // slow drift x
  dy: number;       // slow drift y
  color: string;
}

@Component({
  selector: 'app-nebula-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>
    <canvas #stars class="stars" aria-hidden="true"></canvas>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      overflow: hidden;
      /* 深空底:深蓝 + 紫 + 暗红的柔和叠加,落在近黑之上 */
      background:
        radial-gradient(ellipse at 28% 18%, #16183f 0%, transparent 55%),
        radial-gradient(ellipse at 78% 32%, #2a1140 0%, transparent 52%),
        radial-gradient(ellipse at 62% 88%, #2d0e1d 0%, transparent 55%),
        radial-gradient(ellipse at 12% 78%, #101a3a 0%, transparent 50%),
        linear-gradient(180deg, #080b1e 0%, #05060f 100%);
    }
    .blob {
      position: absolute;
      width: 64vw;
      height: 64vw;
      border-radius: 50%;
      filter: blur(8px);
      mix-blend-mode: screen;
      opacity: 0.55;
      will-change: transform;
    }
    .b1 {
      top: -16vw;
      left: -10vw;
      background: radial-gradient(circle at 50% 50%, rgba(58, 96, 232, 0.55), transparent 66%);
      animation: drift1 42s ease-in-out infinite alternate;
    }
    .b2 {
      top: 8vw;
      right: -14vw;
      background: radial-gradient(circle at 50% 50%, rgba(140, 74, 214, 0.50), transparent 66%);
      animation: drift2 55s ease-in-out infinite alternate;
    }
    .b3 {
      bottom: -20vw;
      left: 22vw;
      width: 70vw;
      height: 70vw;
      background: radial-gradient(circle at 50% 50%, rgba(196, 54, 96, 0.40), transparent 68%);
      animation: drift3 64s ease-in-out infinite alternate;
    }
    .stars {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    @keyframes drift1 {
      0%   { transform: translate3d(0, 0, 0) scale(1); }
      100% { transform: translate3d(8vw, 6vw, 0) scale(1.15); }
    }
    @keyframes drift2 {
      0%   { transform: translate3d(0, 0, 0) scale(1.05); }
      100% { transform: translate3d(-7vw, 9vw, 0) scale(0.92); }
    }
    @keyframes drift3 {
      0%   { transform: translate3d(0, 0, 0) scale(0.95); }
      100% { transform: translate3d(6vw, -7vw, 0) scale(1.18); }
    }
    @media (prefers-reduced-motion: reduce) {
      .blob { animation: none; }
    }
  `]
})
export class NebulaBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stars', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private stars: Star[] = [];
  private rafId = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private last = 0;
  private reduced = false;
  private readonly palette = ['#ffffff', '#bcd0ff', '#d9c2ff', '#ffc8dd', '#cfe3ff'];
  private readonly onResize = () => this.setup();

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.setup();
    window.addEventListener('resize', this.onResize, { passive: true });
    if (!this.reduced) {
      this.zone.runOutsideAngular(() => {
        this.rafId = requestAnimationFrame((t) => this.frame(t));
      });
    } else {
      this.draw(0); // 静态星空
    }
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
    }
  }

  private setup(): void {
    const canvas = this.canvasRef.nativeElement;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = canvas.clientWidth || window.innerWidth;
    this.h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(this.w * this.dpr);
    canvas.height = Math.floor(this.h * this.dpr);
    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    // 星点数量随面积缩放,并设上限,控制性能
    const count = Math.min(170, Math.round((this.w * this.h) / 9000));
    this.stars = Array.from({ length: count }, () => this.makeStar());
    if (this.reduced) {
      this.draw(0);
    }
  }

  private makeStar(): Star {
    const big = Math.random() < 0.14;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      r: big ? 1.3 + Math.random() * 1.3 : 0.4 + Math.random() * 0.9,
      a: 0.25 + Math.random() * 0.5,
      amp: 0.15 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.1,
      dx: (Math.random() - 0.5) * 0.04,
      dy: (Math.random() - 0.5) * 0.04,
      color: this.palette[Math.floor(Math.random() * this.palette.length)]
    };
  }

  private frame(t: number): void {
    const dt = this.last ? (t - this.last) / 1000 : 0;
    this.last = t;
    this.draw(dt);
    this.rafId = requestAnimationFrame((nt) => this.frame(nt));
  }

  private draw(dt: number): void {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, this.w, this.h);
    for (const s of this.stars) {
      if (dt > 0) {
        s.phase += s.speed * dt;
        s.x += s.dx;
        s.y += s.dy;
        if (s.x < -2) s.x = this.w + 2;
        else if (s.x > this.w + 2) s.x = -2;
        if (s.y < -2) s.y = this.h + 2;
        else if (s.y > this.h + 2) s.y = -2;
      }
      const alpha = Math.max(0, Math.min(1, s.a + Math.sin(s.phase) * s.amp));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      if (s.r > 1.2) {
        // 较大的星带柔光
        ctx.shadowBlur = 6;
        ctx.shadowColor = s.color;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
