/**
 * FEGlobe · 正交投影经纬仪地球仪
 * 纯 Canvas 实现：经纬网、城市点、大圆航线弧、拖拽旋转、滚轮缩放、点击选城。
 */
(function (global) {
  const D2R = Math.PI / 180;

  function toVec(lat, lng) {
    const la = lat * D2R;
    const lo = lng * D2R;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  }

  /** 球面插值：得到起点到终点之间的大圆路径点 */
  function greatCircle(a, b, steps) {
    const v1 = toVec(a.lat, a.lng);
    const v2 = toVec(b.lat, b.lng);
    const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
    const omega = Math.acos(dot);
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      let x;
      let y;
      let z;
      if (omega < 1e-6) {
        x = v1[0];
        y = v1[1];
        z = v1[2];
      } else {
        const s1 = Math.sin((1 - t) * omega) / Math.sin(omega);
        const s2 = Math.sin(t * omega) / Math.sin(omega);
        x = v1[0] * s1 + v2[0] * s2;
        y = v1[1] * s1 + v2[1] * s2;
        z = v1[2] * s1 + v2[2] * s2;
      }
      const norm = Math.sqrt(x * x + y * y + z * z) || 1;
      points.push([x / norm, y / norm, z / norm]);
    }
    return points;
  }

  class FEGlobe {
    constructor(canvas, options) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = options || {};
      this.rotLng = 105;
      this.rotLat = 20;
      this.zoom = 1;
      this.targetRotLng = null;
      this.targetRotLat = null;
      this.destinations = [];
      this.origin = null;
      this.focus = null;
      this.hover = null;
      this.dragging = false;
      this.moved = false;
      this.arcPhase = 0;
      this.dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.bind();
      this.resize();
      this.loop = this.loop.bind(this);
      this.running = true;
      global.requestAnimationFrame(this.loop);
    }

    bind() {
      const canvas = this.canvas;
      let lastX = 0;
      let lastY = 0;

      canvas.addEventListener('pointerdown', (event) => {
        this.dragging = true;
        this.moved = false;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      });

      canvas.addEventListener('pointermove', (event) => {
        if (this.dragging) {
          const dx = event.clientX - lastX;
          const dy = event.clientY - lastY;
          if (Math.abs(dx) + Math.abs(dy) > 2) this.moved = true;
          lastX = event.clientX;
          lastY = event.clientY;
          this.rotLng = this.rotLng - dx * 0.32 / this.zoom;
          this.rotLat = Math.max(-85, Math.min(85, this.rotLat + dy * 0.28 / this.zoom));
          this.targetRotLng = null;
          this.targetRotLat = null;
        } else {
          this.hover = this.pick(event);
          canvas.style.cursor = this.hover ? 'pointer' : 'grab';
        }
      });

      const endDrag = (event) => {
        if (this.dragging && !this.moved) {
          const picked = this.pick(event);
          if (picked && this.options.onSelect) this.options.onSelect(picked.id);
        }
        this.dragging = false;
      };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', () => {
        this.dragging = false;
      });
      canvas.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault();
          this.zoom = Math.max(0.75, Math.min(3.2, this.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
        },
        { passive: false }
      );
    }

    setData(data) {
      this.origin = data.origin || null;
      this.destinations = data.destinations || [];
      this.focus = data.focus || null;
      this.arcPhase = 0;
      if (this.focus && this.origin) {
        const mid = this.midpoint(this.origin, this.focus);
        this.targetRotLng = mid.lng;
        this.targetRotLat = Math.max(-60, Math.min(60, mid.lat));
      }
    }

    midpoint(a, b) {
      const v1 = toVec(a.lat, a.lng);
      const v2 = toVec(b.lat, b.lng);
      const x = v1[0] + v2[0];
      const y = v1[1] + v2[1];
      const z = v1[2] + v2[2];
      const norm = Math.sqrt(x * x + y * y + z * z) || 1;
      const nx = x / norm;
      const ny = y / norm;
      const nz = z / norm;
      return {
        lat: Math.asin(nz) / D2R,
        lng: Math.atan2(ny, nx) / D2R
      };
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = Math.max(240, rect.width);
      this.height = Math.max(240, rect.height);
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    project(lat, lng) {
      const r = (Math.min(this.width, this.height) / 2) * 0.9 * this.zoom;
      const cx = this.width / 2;
      const cy = this.height / 2;
      const la = lat * D2R;
      const lo = (lng - this.rotLng) * D2R;
      const phi = this.rotLat * D2R;
      const cosLa = Math.cos(la);
      const x = cosLa * Math.sin(lo);
      const y = Math.cos(phi) * Math.sin(la) - Math.sin(phi) * cosLa * Math.cos(lo);
      const z = Math.sin(phi) * Math.sin(la) + Math.cos(phi) * cosLa * Math.cos(lo);
      return { x: cx + x * r, y: cy - y * r, z: z, visible: z > 0, r: r };
    }

    pick(event) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      let best = null;
      let bestDist = 14;
      const pool = this.origin ? this.destinations.concat([this.origin]) : this.destinations;
      pool.forEach((city) => {
        const p = this.project(city.lat, city.lng);
        if (!p.visible) return;
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bestDist) {
          bestDist = d;
          best = city;
        }
      });
      return best;
    }

    loop() {
      if (!this.running) return;
      this.update();
      this.draw();
      global.requestAnimationFrame(this.loop);
    }

    update() {
      if (this.targetRotLng !== null && !this.dragging) {
        let deltaLng = this.targetRotLng - this.rotLng;
        if (deltaLng > 180) deltaLng -= 360;
        if (deltaLng < -180) deltaLng += 360;
        this.rotLng += deltaLng * 0.06;
        this.rotLat += (this.targetRotLat - this.rotLat) * 0.06;
        if (Math.abs(deltaLng) < 0.3 && Math.abs(this.targetRotLat - this.rotLat) < 0.3) {
          this.targetRotLng = null;
          this.targetRotLat = null;
        }
      } else if (!this.dragging && this.options.autoRotate !== false) {
        this.rotLng += 0.06;
      }
      this.arcPhase = (this.arcPhase + 0.006) % 1;
    }

    draw() {
      const ctx = this.ctx;
      const cx = this.width / 2;
      const cy = this.height / 2;
      ctx.clearRect(0, 0, this.width, this.height);

      const r = (Math.min(this.width, this.height) / 2) * 0.9 * this.zoom;
      const gradient = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r);
      gradient.addColorStop(0, '#22405f');
      gradient.addColorStop(0.55, '#132743');
      gradient.addColorStop(1, '#0a1526');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      this.drawGraticule();

      // 目的地城市点
      this.destinations.forEach((city) => {
        const p = this.project(city.lat, city.lng);
        if (!p.visible) return;
        const isHover = this.hover && this.hover.id === city.id;
        const deep = p.z;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isHover ? 3.6 : 2.1, 0, Math.PI * 2);
        ctx.fillStyle = isHover
          ? 'rgba(255, 232, 176, 0.98)'
          : `rgba(214, 226, 240, ${0.25 + deep * 0.5})`;
        ctx.fill();
        if (isHover) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(232, 213, 168, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      this.drawArc();
      ctx.restore();

      // 地球边缘
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(232, 213, 168, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      this.drawMarkers();
    }

    drawGraticule() {
      const ctx = this.ctx;
      ctx.lineWidth = 1;
      // 经线
      for (let lng = -180; lng < 180; lng += 15) {
        const major = lng % 45 === 0;
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = this.project(lat, lng);
          if (!p.visible) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.strokeStyle = major ? 'rgba(150, 180, 210, 0.2)' : 'rgba(150, 180, 210, 0.1)';
        ctx.stroke();
      }
      // 纬线
      for (let lat = -75; lat <= 75; lat += 15) {
        const major = lat === 0;
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 3) {
          const p = this.project(lat, lng);
          if (!p.visible) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.strokeStyle = major ? 'rgba(232, 213, 168, 0.24)' : 'rgba(150, 180, 210, 0.08)';
        ctx.stroke();
      }
    }

    drawArc() {
      if (!this.origin || !this.focus) return;
      const ctx = this.ctx;
      const points = greatCircle(this.origin, this.focus, 96);
      const dist = global.FE_ROUTES
        ? global.FE_ROUTES.distanceKm(this.origin, this.focus)
        : 5000;
      const lift = Math.min(0.32, dist / 24000);

      ctx.save();
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, (Math.min(this.width, this.height) / 2) * 0.9 * this.zoom, 0, Math.PI * 2);
      ctx.clip();

      let started = false;
      for (let i = 0; i < points.length; i += 1) {
        const v = points[i];
        const lat = Math.asin(v[2]) / D2R;
        const lng = Math.atan2(v[1], v[0]) / D2R;
        const p = this.project(lat, lng);
        const t = i / (points.length - 1);
        const bulge = 1 + lift * Math.sin(Math.PI * t);
        const cx = this.width / 2;
        const cy = this.height / 2;
        const x = cx + (p.x - cx) * bulge;
        const y = cy + (p.y - cy) * bulge;
        if (!p.visible) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
      grad.addColorStop(0, 'rgba(232, 213, 168, 0.95)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(1, 'rgba(138, 190, 255, 0.9)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 7]);
      ctx.lineDashOffset = -this.arcPhase * 140;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawMarkers() {
      const ctx = this.ctx;
      const draw = (city, color, radius, label, sub) => {
        const p = this.project(city.lat, city.lng);
        if (!p.visible) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', ', 0.16)').replace('rgb', 'rgba');
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = '600 12px -apple-system, "PingFang SC", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.textAlign = 'left';
        ctx.fillText(label, p.x + radius + 8, p.y + 4);
        if (sub) {
          ctx.font = '10px "SFMono-Regular", ui-monospace, monospace';
          ctx.fillStyle = 'rgba(232, 213, 168, 0.85)';
          ctx.fillText(sub, p.x + radius + 8, p.y + 17);
        }
      };

      if (this.origin) draw(this.origin, 'rgb(232, 213, 168)', 5, this.origin[this.options.labelKey || 'zh'], 'ORIGIN');
      if (this.focus) draw(this.focus, 'rgb(126, 186, 255)', 4.5, this.focus[this.options.labelKey || 'zh'], this.focus.iata || '');
      else if (this.hover) draw(this.hover, 'rgb(126, 186, 255)', 4, this.hover[this.options.labelKey || 'zh'], this.hover.iata || '');
    }
  }

  global.FEGlobe = FEGlobe;
})(window);
