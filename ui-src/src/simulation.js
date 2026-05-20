// ─── Agent meta: shape, size, home zone ────────────────────────────────────
export const AGENT_META = {
  'tinyagi':          { shape: 'hexagon',  size: 15, zone: 'NEXUS',     label: 'Orchestrator' },
  'market-analyst':   { shape: 'triangle', size: 11, zone: 'DATA',      label: 'Market Analyst' },
  'notion-creator':   { shape: 'circle',   size: 10, zone: 'DOCS',      label: 'Doc Forge' },
  'finance-creator':  { shape: 'diamond',  size: 11, zone: 'FINANCE',   label: 'Finance Core' },
  'business-creator': { shape: 'pentagon', size: 10, zone: 'STRATEGY',  label: 'Strategy Hub' },
  'copywriter':       { shape: 'rhombus',  size: 10, zone: 'CONTENT',   label: 'Content Mill' },
  'publisher':        { shape: 'star',     size: 11, zone: 'PUBLISH',   label: 'Publish Bay' },
  'analytics':        { shape: 'octagon',  size: 10, zone: 'ANALYTICS', label: 'Analytics Grid' },
};

// ─── Zone layout (fractional positions) ────────────────────────────────────
export const ZONE_DEFS = [
  { id: 'NEXUS',     label: 'NEXUS',     xFrac: 0.50, yFrac: 0.50, radius: 52, color: '#00ffff' },
  { id: 'DATA',      label: 'DATA',      xFrac: 0.76, yFrac: 0.24, radius: 42, color: '#00ff88' },
  { id: 'DOCS',      label: 'DOCS',      xFrac: 0.24, yFrac: 0.24, radius: 42, color: '#ff6600' },
  { id: 'FINANCE',   label: 'FINANCE',   xFrac: 0.16, yFrac: 0.60, radius: 40, color: '#ffee00' },
  { id: 'STRATEGY',  label: 'STRATEGY',  xFrac: 0.50, yFrac: 0.16, radius: 38, color: '#aa44ff' },
  { id: 'CONTENT',   label: 'CONTENT',   xFrac: 0.30, yFrac: 0.79, radius: 42, color: '#ff44aa' },
  { id: 'PUBLISH',   label: 'PUBLISH',   xFrac: 0.76, yFrac: 0.76, radius: 42, color: '#00aaff' },
  { id: 'ANALYTICS', label: 'ANALYTICS', xFrac: 0.86, yFrac: 0.50, radius: 40, color: '#44ffaa' },
];

const CONNECTIONS = [
  ['NEXUS', 'DATA'],     ['NEXUS', 'DOCS'],     ['NEXUS', 'STRATEGY'],
  ['NEXUS', 'CONTENT'],  ['NEXUS', 'PUBLISH'],  ['NEXUS', 'ANALYTICS'],
  ['NEXUS', 'FINANCE'],  ['DATA', 'ANALYTICS'], ['CONTENT', 'PUBLISH'],
  ['STRATEGY', 'DOCS'],
];

// ─── Particle ───────────────────────────────────────────────────────────────
export class Particle {
  constructor(fromZone, toZone, color) {
    this.x  = fromZone.x + (Math.random() - 0.5) * 16;
    this.y  = fromZone.y + (Math.random() - 0.5) * 16;
    this.tx = toZone.x   + (Math.random() - 0.5) * 16;
    this.ty = toZone.y   + (Math.random() - 0.5) * 16;
    this.p  = 0;
    this.speed = 0.005 + Math.random() * 0.009;
    this.color = color;
    this.size  = 1.5 + Math.random() * 1.5;
    const mx = (this.x + this.tx) / 2;
    const my = (this.y + this.ty) / 2;
    this.cx = mx + (Math.random() - 0.5) * 70;
    this.cy = my + (Math.random() - 0.5) * 70;
  }

  update() {
    this.p = Math.min(1, this.p + this.speed);
    const t  = this.p;
    const mt = 1 - t;
    this.cx_ = mt * mt * this.x + 2 * mt * t * this.cx + t * t * this.tx;
    this.cy_ = mt * mt * this.y + 2 * mt * t * this.cy + t * t * this.ty;
    return this.p >= 1;
  }

  draw(ctx) {
    const a = Math.sin(this.p * Math.PI) * 0.9;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle   = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(this.cx_, this.cy_, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Agent simulation entity ────────────────────────────────────────────────
export class AgentSim {
  constructor(id, color, homeZone) {
    this.id = id;
    this.color = color;
    this.homeZone = homeZone;
    this.x  = homeZone.x + (Math.random() - 0.5) * homeZone.radius * 0.5;
    this.y  = homeZone.y + (Math.random() - 0.5) * homeZone.radius * 0.5;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.status = 'idle';
    this.targetZone   = homeZone;
    this.trail        = [];
    this.phase        = Math.random() * Math.PI * 2;
    this.wanderAngle  = Math.random() * Math.PI * 2;
    this.wanderTimer  = Math.random() * 80;
    this.particleTimer = Math.random() * 40;
  }

  setStatus(status, targetZone) {
    this.status = status;
    this.targetZone = (status === 'working' && targetZone) ? targetZone : this.homeZone;
  }

  update() {
    this.phase += 0.03;
    this.wanderTimer  += 1;
    this.particleTimer += 1;

    const tz   = this.targetZone;
    const dx   = tz.x - this.x;
    const dy   = tz.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.status === 'working') {
      if (dist > tz.radius * 0.45) {
        const speed = Math.min(2.5, dist * 0.04);
        this.vx += (dx / dist) * speed * 0.12;
        this.vy += (dy / dist) * speed * 0.12;
      } else {
        const orbitR = 22 + Math.sin(this.phase * 0.4) * 8;
        const tx = tz.x + Math.cos(this.phase * 0.6) * orbitR;
        const ty = tz.y + Math.sin(this.phase * 0.6) * orbitR;
        this.vx += (tx - this.x) * 0.035;
        this.vy += (ty - this.y) * 0.035;
      }
    } else {
      if (this.wanderTimer > 90 + Math.random() * 80) {
        this.wanderTimer = 0;
        if (dist > tz.radius * 0.75) {
          this.wanderAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
        } else {
          this.wanderAngle += (Math.random() - 0.5) * 1.4;
        }
      }
      this.vx += Math.cos(this.wanderAngle) * 0.018;
      this.vy += Math.sin(this.wanderAngle) * 0.018;
    }

    const damp = this.status === 'working' ? 0.87 : 0.93;
    this.vx *= damp;
    this.vy *= damp;
    this.x  += this.vx;
    this.y  += this.vy;

    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.x - last.x, this.y - last.y) > 3) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 22) this.trail.shift();
    }
  }

  shouldEmitParticle() {
    if (this.status !== 'working') return false;
    if (this.particleTimer > 35 + Math.random() * 30) {
      this.particleTimer = 0;
      return true;
    }
    return false;
  }

  draw(ctx, meta) {
    const pulse = 0.85 + Math.sin(this.phase) * 0.15;
    const size  = (meta?.size || 10) * pulse;
    const col   = this.color;
    const shape = meta?.shape || 'circle';

    // Trail
    if (this.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < this.trail.length; i++) {
        const a = (i / this.trail.length) * 0.4;
        ctx.globalAlpha = a;
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.8;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x,     this.trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Radial glow
    ctx.save();
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size * (this.status === 'working' ? 3.5 : 2.2));
    g.addColorStop(0, col + '40');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shape body
    ctx.save();
    ctx.fillStyle   = col;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth   = 1;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 10;
    ctx.globalAlpha = 1;
    _drawShape(ctx, this.x, this.y, size, shape);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Working orbit ring
    if (this.status === 'working') {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.55 + Math.sin(this.phase * 2.5) * 0.3;
      ctx.shadowColor = col;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, size + 6 + Math.sin(this.phase * 3) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ─── Shape drawing ──────────────────────────────────────────────────────────
function _drawShape(ctx, x, y, r, shape) {
  ctx.beginPath();
  switch (shape) {
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
                : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      break;
    case 'triangle':
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
                : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      break;
    case 'circle':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(x,           y - r);
      ctx.lineTo(x + r * 0.6, y);
      ctx.lineTo(x,           y + r);
      ctx.lineTo(x - r * 0.6, y);
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
                : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      break;
    case 'rhombus':
      ctx.moveTo(x,           y - r);
      ctx.lineTo(x + r * 0.8, y);
      ctx.lineTo(x,           y + r);
      ctx.lineTo(x - r * 0.8, y);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.45;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
                : ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      break;
    case 'octagon':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
                : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      break;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.closePath();
}

// ─── Background ─────────────────────────────────────────────────────────────
export function drawBackground(ctx, w, h, t) {
  ctx.fillStyle = '#04040f';
  ctx.fillRect(0, 0, w, h);

  const spacing = 38;
  ctx.fillStyle = 'rgba(70,70,160,0.045)';
  for (let x = spacing / 2; x < w; x += spacing) {
    for (let y = spacing / 2; y < h; y += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle slow-moving radial light
  const rx = w * 0.5 + Math.cos(t * 0.0003) * w * 0.15;
  const ry = h * 0.5 + Math.sin(t * 0.0004) * h * 0.12;
  const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, Math.max(w, h) * 0.55);
  rg.addColorStop(0, 'rgba(30,30,90,0.18)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
}

// ─── Connections ─────────────────────────────────────────────────────────────
export function drawConnections(ctx, zones, t) {
  const zm = Object.fromEntries(zones.map(z => [z.id, z]));
  ctx.save();
  ctx.setLineDash([3, 8]);
  ctx.lineDashOffset = -(t * 0.012);
  for (const [a, b] of CONNECTIONS) {
    const zA = zm[a]; const zB = zm[b];
    if (!zA || !zB) continue;
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#4455bb';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(zA.x, zA.y);
    ctx.lineTo(zB.x, zB.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Hex zone rendering ───────────────────────────────────────────────────────
function drawHex(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
            : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

export function drawZones(ctx, zones, t) {
  for (const z of zones) {
    const pulse = 0.65 + Math.sin(t * 0.0012 + z.xFrac * 9) * 0.2;

    // Zone area fill
    ctx.save();
    ctx.globalAlpha = 0.05 * pulse;
    ctx.fillStyle   = z.color;
    drawHex(ctx, z.x, z.y, z.radius);
    ctx.fill();
    ctx.restore();

    // Outer border
    ctx.save();
    ctx.globalAlpha = 0.22 * pulse;
    ctx.strokeStyle = z.color;
    ctx.lineWidth   = 1;
    ctx.shadowColor = z.color;
    ctx.shadowBlur  = 10;
    drawHex(ctx, z.x, z.y, z.radius);
    ctx.stroke();
    ctx.restore();

    // Inner hex
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = z.color;
    ctx.lineWidth   = 0.5;
    drawHex(ctx, z.x, z.y, z.radius * 0.55);
    ctx.stroke();
    ctx.restore();

    // Center pip
    ctx.save();
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillStyle   = z.color;
    ctx.shadowColor = z.color;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Zone map builder ─────────────────────────────────────────────────────────
export function buildZones(w, h) {
  return ZONE_DEFS.map(z => ({ ...z, x: z.xFrac * w, y: z.yFrac * h }));
}
