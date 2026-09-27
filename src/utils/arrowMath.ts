import { Point, ArrowElement } from '../types/tactical';

/**
 * 战术攻防标图标注计算与几何算法工具库
 */

// 计算两点距离
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// 计算两点角度（弧度）
export function angle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

// 旋转点
export function rotatePoint(p: Point, center: Point, rad: number): Point {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

// 贝塞尔曲线插值取样
export function getBezierPoints(points: Point[], samples = 30): Point[] {
  if (points.length < 3) return points;
  const res: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    res.push(computeBezierPoint(points, t));
  }
  return res;
}

function computeBezierPoint(points: Point[], t: number): Point {
  let pts = [...points];
  while (pts.length > 1) {
    const nextPts: Point[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      nextPts.push({
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      });
    }
    pts = nextPts;
  }
  return pts[0];
}

/**
 * 绘制进攻主突箭头 (Assault Wedge Arrow)
 * 标准军标攻击箭头：尾部微收、身躯随曲线平滑延展、头部向两侧张开呈锐利矛头
 */
export function drawAssaultArrow(
  ctx: CanvasRenderingContext2D,
  rawPoints: Point[],
  color: string,
  strokeWidth: number,
  opacity: number,
  label?: string
) {
  if (rawPoints.length < 2) return;
  const pts = rawPoints.length > 2 ? getBezierPoints(rawPoints, 35) : rawPoints;
  const totalPts = pts.length;
  const tip = pts[totalPts - 1];
  const prev = pts[Math.max(0, totalPts - 3)];
  const headAngle = Math.atan2(tip.y - prev.y, tip.x - prev.x);

  const headLength = Math.max(34, strokeWidth * 3.5);
  const headWidth = Math.max(28, strokeWidth * 2.8);
  const neckWidth = Math.max(14, strokeWidth * 1.4);
  const tailWidth = Math.max(10, strokeWidth * 1.1);

  // 沿中轴线构建左侧和右侧轮廓点
  const leftSide: Point[] = [];
  const rightSide: Point[] = [];

  for (let i = 0; i < totalPts - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const segAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const progress = i / (totalPts - 1);
    // 从尾部到颈部渐变宽度
    const curWidth = tailWidth + (neckWidth - tailWidth) * progress;

    const normal = segAngle + Math.PI / 2;
    leftSide.push({
      x: p1.x + Math.cos(normal) * (curWidth / 2),
      y: p1.y + Math.sin(normal) * (curWidth / 2),
    });
    rightSide.unshift({
      x: p1.x - Math.cos(normal) * (curWidth / 2),
      y: p1.y - Math.sin(normal) * (curWidth / 2),
    });
  }

  // 箭头部翼端点
  const neckPoint: Point = {
    x: tip.x - Math.cos(headAngle) * headLength,
    y: tip.y - Math.sin(headAngle) * headLength,
  };

  const wingNormal = headAngle + Math.PI / 2;
  const leftWing: Point = {
    x: neckPoint.x + Math.cos(wingNormal) * headWidth,
    y: neckPoint.y + Math.sin(wingNormal) * headWidth,
  };
  const rightWing: Point = {
    x: neckPoint.x - Math.cos(wingNormal) * headWidth,
    y: neckPoint.y - Math.sin(wingNormal) * headWidth,
  };

  // 头部凹槽折点
  const innerNotch: Point = {
    x: tip.x - Math.cos(headAngle) * (headLength * 0.7),
    y: tip.y - Math.sin(headAngle) * (headLength * 0.7),
  };

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = Math.max(1.5, strokeWidth * 0.2);

  ctx.beginPath();
  // 尾部连线
  if (leftSide.length > 0) {
    ctx.moveTo(leftSide[0].x, leftSide[0].y);
    for (let i = 1; i < leftSide.length; i++) {
      ctx.lineTo(leftSide[i].x, leftSide[i].y);
    }
  }

  // 连到左翼
  ctx.lineTo(leftWing.x, leftWing.y);
  // 连到尖端
  ctx.lineTo(tip.x, tip.y);
  // 连到右翼
  ctx.lineTo(rightWing.x, rightWing.y);

  // 连回右侧身躯
  if (rightSide.length > 0) {
    for (let i = 0; i < rightSide.length; i++) {
      ctx.lineTo(rightSide[i].x, rightSide[i].y);
    }
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 内部战术推进高亮线
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1, strokeWidth * 0.25);
  ctx.setLineDash([6, 6]);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < totalPts - 1; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.lineTo(innerNotch.x, innerNotch.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 战术说明文字
  if (label) {
    const midIdx = Math.floor(pts.length / 2);
    const midPoint = pts[midIdx];
    drawTacticalLabel(ctx, label, midPoint.x, midPoint.y - 14, color);
  }

  ctx.restore();
}

/**
 * 绘制防御坚守抗击阵地线 (Defensive Obstacle Line)
 * 标绘正面防线，并在受敌侧绘制密集的刺状锯齿防御标
 */
export function drawDefenseLine(
  ctx: CanvasRenderingContext2D,
  rawPoints: Point[],
  color: string,
  strokeWidth: number,
  opacity: number,
  label?: string
) {
  if (rawPoints.length < 2) return;
  const pts = rawPoints.length > 2 ? getBezierPoints(rawPoints, 30) : rawPoints;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth * 1.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. 绘制主体防线
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();

  // 2. 沿防线生成朝向威胁方向的防御阵地齿标 (军标防守标)
  const toothLength = Math.max(14, strokeWidth * 2.2);
  const stepDist = Math.max(22, strokeWidth * 2.6);

  let accumulatedDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const segLen = distance(p1, p2);
    const segAng = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const toothAngle = segAng + Math.PI / 2;

    while (accumulatedDist < segLen) {
      const t = accumulatedDist / segLen;
      const baseX = p1.x + (p2.x - p1.x) * t;
      const baseY = p1.y + (p2.y - p1.y) * t;

      // 绘制防御半圆堡垒或三角齿标
      const tipX = baseX + Math.cos(toothAngle) * toothLength;
      const tipY = baseY + Math.sin(toothAngle) * toothLength;

      ctx.beginPath();
      ctx.lineWidth = Math.max(2, strokeWidth * 0.8);
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // 在末端点缀抗击阻绝十字线
      const crossAng = toothAngle + Math.PI / 2;
      const crossW = 6;
      ctx.beginPath();
      ctx.moveTo(tipX - Math.cos(crossAng) * crossW, tipY - Math.sin(crossAng) * crossW);
      ctx.lineTo(tipX + Math.cos(crossAng) * crossW, tipY + Math.sin(crossAng) * crossW);
      ctx.stroke();

      accumulatedDist += stepDist;
    }
    accumulatedDist -= segLen;
  }

  if (label) {
    const midIdx = Math.floor(pts.length / 2);
    drawTacticalLabel(ctx, label, pts[midIdx].x, pts[midIdx].y - 20, color);
  }

  ctx.restore();
}

/**
 * 绘制钳形向心合围双箭头 (Pincer / Double Flanking Assault Arrow)
 * 修正两箭头间距：左右两路突击箭头在目标外围形成清晰的向心夹击包围圈，箭头头部保持足够的战术纵深与合围间距，避免重叠挤压
 */
export function drawPincerArrow(
  ctx: CanvasRenderingContext2D,
  rawPoints: Point[],
  color: string,
  strokeWidth: number,
  opacity: number,
  label?: string
) {
  if (rawPoints.length < 2) return;
  const start = rawPoints[0];
  const target = rawPoints[rawPoints.length - 1];
  const dist = distance(start, target);
  const mainAngle = angle(start, target);
  const perpAng = mainAngle + Math.PI / 2;

  // 1. 目标区左右两翼攻击端点间距 (扩大战术夹角与端点间距，确保双矛头不挤压)
  const tipSeparation = Math.max(105, dist * 0.32);
  // 中部两翼横向外展距离
  const bodySpread = Math.max(130, dist * 0.48);

  // 左翼突击轴线控制点 (出击基底 -> 外展包抄点 -> 向心突击矛头)
  const leftFlank: Point = {
    x: start.x + Math.cos(mainAngle) * (dist * 0.5) + Math.cos(perpAng) * bodySpread,
    y: start.y + Math.sin(mainAngle) * (dist * 0.5) + Math.sin(perpAng) * bodySpread,
  };
  const leftTip: Point = {
    x: target.x + Math.cos(perpAng) * (tipSeparation / 2) - Math.cos(mainAngle) * 12,
    y: target.y + Math.sin(perpAng) * (tipSeparation / 2) - Math.sin(mainAngle) * 12,
  };
  // 内倾夹击引导点
  const leftPreTip: Point = {
    x: leftTip.x + Math.cos(mainAngle + Math.PI * 0.35) * 45,
    y: leftTip.y + Math.sin(mainAngle + Math.PI * 0.35) * 45,
  };

  // 右翼突击轴线控制点
  const rightFlank: Point = {
    x: start.x + Math.cos(mainAngle) * (dist * 0.5) - Math.cos(perpAng) * bodySpread,
    y: start.y + Math.sin(mainAngle) * (dist * 0.5) - Math.sin(perpAng) * bodySpread,
  };
  const rightTip: Point = {
    x: target.x - Math.cos(perpAng) * (tipSeparation / 2) - Math.cos(mainAngle) * 12,
    y: target.y - Math.sin(perpAng) * (tipSeparation / 2) - Math.sin(mainAngle) * 12,
  };
  const rightPreTip: Point = {
    x: rightTip.x - Math.cos(mainAngle + Math.PI * 0.35) * 45,
    y: rightTip.y - Math.sin(mainAngle + Math.PI * 0.35) * 45,
  };

  // 分别绘制左钳与右钳进攻箭头
  drawAssaultArrow(ctx, [start, leftFlank, leftPreTip, leftTip], color, strokeWidth * 0.85, opacity);
  drawAssaultArrow(ctx, [start, rightFlank, rightPreTip, rightTip], color, strokeWidth * 0.85, opacity);

  // 在两箭头合围中心绘制受敌合围靶心虚线圈
  ctx.save();
  ctx.globalAlpha = opacity * 0.6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(target.x, target.y, tipSeparation * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (label) {
    drawTacticalLabel(ctx, label, target.x, target.y - tipSeparation * 0.5 - 14, color);
  }
}

/**
 * 绘制迂回支援/穿插虚线箭头 (Flank / Support Arrow)
 */
export function drawSupportArrow(
  ctx: CanvasRenderingContext2D,
  rawPoints: Point[],
  color: string,
  strokeWidth: number,
  opacity: number,
  dashed = true,
  label?: string
) {
  if (rawPoints.length < 2) return;
  const pts = rawPoints.length > 2 ? getBezierPoints(rawPoints, 30) : rawPoints;
  const tip = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 3)];
  const headAng = Math.atan2(tip.y - prev.y, tip.x - prev.x);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth * 1.2;
  if (dashed) {
    ctx.setLineDash([10, 8]);
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // 绘制箭头尖端
  const arrowSize = Math.max(20, strokeWidth * 3.2);
  const leftWing = {
    x: tip.x - Math.cos(headAng - Math.PI / 6) * arrowSize,
    y: tip.y - Math.sin(headAng - Math.PI / 6) * arrowSize,
  };
  const rightWing = {
    x: tip.x - Math.cos(headAng + Math.PI / 6) * arrowSize,
    y: tip.y - Math.sin(headAng + Math.PI / 6) * arrowSize,
  };

  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(leftWing.x, leftWing.y);
  ctx.lineTo(rightWing.x, rightWing.y);
  ctx.closePath();
  ctx.fill();

  if (label) {
    const midIdx = Math.floor(pts.length / 2);
    drawTacticalLabel(ctx, label, pts[midIdx].x, pts[midIdx].y - 16, color);
  }

  ctx.restore();
}

/**
 * 绘制火力打击覆盖圈 / 空袭目标区 (Fire Strike Reticle)
 */
export function drawFireStrike(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  color: string,
  strokeWidth: number,
  opacity: number,
  label?: string
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  const rad = Math.max(25, radius);

  // 半透明打击红区
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity * 0.25;
  ctx.beginPath();
  ctx.arc(center.x, center.y, rad, 0, Math.PI * 2);
  ctx.fill();

  // 外圈与内圈
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth * 0.8;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, rad, 0, Math.PI * 2);
  ctx.stroke();

  // 内部同心圆
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, rad * 0.45, 0, Math.PI * 2);
  ctx.stroke();

  // 准星十字刻度
  const ext = rad * 1.35;
  ctx.beginPath();
  ctx.moveTo(center.x - ext, center.y);
  ctx.lineTo(center.x + ext, center.y);
  ctx.moveTo(center.x, center.y - ext);
  ctx.lineTo(center.x, center.y + ext);
  ctx.stroke();

  // 中心击中点
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    drawTacticalLabel(ctx, label, center.x, center.y + rad + 18, color);
  }

  ctx.restore();
}

/**
 * 绘制集结/设伏地域多边形 (Assembly Zone)
 */
export function drawAssemblyZone(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  strokeWidth: number,
  opacity: number,
  label?: string
) {
  if (points.length < 3) return;

  ctx.save();
  ctx.globalAlpha = opacity * 0.2;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();

  // 战术虚线外框
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.setLineDash([12, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 计算中心
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= points.length;
  cy /= points.length;

  if (label) {
    drawTacticalLabel(ctx, label, cx, cy, color);
  }

  ctx.restore();
}

/**
 * 绘制战术标注标签徽标
 */
export function drawTacticalLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  accentColor: string
) {
  ctx.font = '600 12px "Noto Sans SC", sans-serif';
  const metrics = ctx.measureText(text);
  const paddingX = 8;
  const paddingY = 4;
  const boxW = metrics.width + paddingX * 2;
  const boxH = 20;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 20, 0.88)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.rect(x - boxW / 2, y - boxH / 2, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * 点到线段的最短几何距离
 */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

/**
 * 射线法检测点是否在多边形内部
 */
export function isInsidePolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;
    const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 高精战术标号命中检测（完美支持钳形双箭头、贝塞尔主突箭头、防线齿标、打击圈、多边形和文字标签）
 */
export function isPointHittingArrow(worldPos: Point, el: ArrowElement): boolean {
  if (!el.points || el.points.length === 0) return false;

  // 1. 优先抓取控制点手柄（22px 舒适抓取半径）
  for (const pt of el.points) {
    if (Math.hypot(worldPos.x - pt.x, worldPos.y - pt.y) <= 22) {
      return true;
    }
  }

  // 2. 战术文字标注命中检测 (文字框周边 30px 半径均可抓取)
  if (el.label) {
    let lx = 0;
    let ly = 0;
    if (el.arrowType === 'fire_strike') {
      lx = el.points[0].x;
      ly = el.points[0].y - (el.radius || 60) - 18;
    } else if (el.arrowType === 'pincer' && el.points.length >= 2) {
      const target = el.points[el.points.length - 1];
      const dist = distance(el.points[0], target);
      const tipSeparation = Math.max(105, dist * 0.32);
      lx = target.x;
      ly = target.y - tipSeparation * 0.5 - 14;
    } else if (el.arrowType === 'assembly_zone') {
      for (const p of el.points) {
        lx += p.x;
        ly += p.y;
      }
      lx /= el.points.length;
      ly /= el.points.length;
    } else {
      const midIdx = Math.floor(el.points.length / 2);
      const mp = el.points[midIdx];
      lx = mp.x;
      ly = mp.y - 18;
    }

    if (Math.abs(worldPos.x - lx) <= 75 && Math.abs(worldPos.y - ly) <= 22) {
      return true;
    }
  }

  // 3. 火力压制打击圈 (圆形覆盖区)
  if (el.arrowType === 'fire_strike') {
    const r = el.radius || 70;
    if (Math.hypot(worldPos.x - el.points[0].x, worldPos.y - el.points[0].y) <= r + 18) {
      return true;
    }
    return false;
  }

  // 4. 集结地域多边形 (多边形内部或边界附近)
  if (el.arrowType === 'assembly_zone') {
    if (el.points.length >= 3 && isInsidePolygon(worldPos, el.points)) {
      return true;
    }
    for (let i = 0; i < el.points.length; i++) {
      const p1 = el.points[i];
      const p2 = el.points[(i + 1) % el.points.length];
      if (distToSegment(worldPos, p1, p2) <= 25) {
        return true;
      }
    }
    return false;
  }

  // 5. 钳形向心合围双箭头（精确测试左翼包抄箭头、右翼包抄箭头、合围靶心与合围包络多边形）
  if (el.arrowType === 'pincer') {
    if (el.points.length < 2) return false;
    const start = el.points[0];
    const target = el.points[el.points.length - 1];
    const dist = distance(start, target);
    const mainAngle = angle(start, target);
    const perpAng = mainAngle + Math.PI / 2;

    const tipSeparation = Math.max(105, dist * 0.32);
    const bodySpread = Math.max(130, dist * 0.48);

    const leftFlank: Point = {
      x: start.x + Math.cos(mainAngle) * (dist * 0.5) + Math.cos(perpAng) * bodySpread,
      y: start.y + Math.sin(mainAngle) * (dist * 0.5) + Math.sin(perpAng) * bodySpread,
    };
    const leftTip: Point = {
      x: target.x + Math.cos(perpAng) * (tipSeparation / 2) - Math.cos(mainAngle) * 12,
      y: target.y + Math.sin(perpAng) * (tipSeparation / 2) - Math.sin(mainAngle) * 12,
    };
    const leftPreTip: Point = {
      x: leftTip.x + Math.cos(mainAngle + Math.PI * 0.35) * 45,
      y: leftTip.y + Math.sin(mainAngle + Math.PI * 0.35) * 45,
    };

    const rightFlank: Point = {
      x: start.x + Math.cos(mainAngle) * (dist * 0.5) - Math.cos(perpAng) * bodySpread,
      y: start.y + Math.sin(mainAngle) * (dist * 0.5) - Math.sin(perpAng) * bodySpread,
    };
    const rightTip: Point = {
      x: target.x - Math.cos(perpAng) * (tipSeparation / 2) - Math.cos(mainAngle) * 12,
      y: target.y - Math.sin(perpAng) * (tipSeparation / 2) - Math.sin(mainAngle) * 12,
    };
    const rightPreTip: Point = {
      x: rightTip.x - Math.cos(mainAngle + Math.PI * 0.35) * 45,
      y: rightTip.y - Math.sin(mainAngle + Math.PI * 0.35) * 45,
    };

    // 检查左钳突击贝塞尔曲线
    const leftCurve = getBezierPoints([start, leftFlank, leftPreTip, leftTip], 20);
    for (let i = 0; i < leftCurve.length - 1; i++) {
      if (distToSegment(worldPos, leftCurve[i], leftCurve[i + 1]) <= 38) {
        return true;
      }
    }

    // 检查右钳突击贝塞尔曲线
    const rightCurve = getBezierPoints([start, rightFlank, rightPreTip, rightTip], 20);
    for (let i = 0; i < rightCurve.length - 1; i++) {
      if (distToSegment(worldPos, rightCurve[i], rightCurve[i + 1]) <= 38) {
        return true;
      }
    }

    // 检查合围靶心虚线圈与末端
    if (Math.hypot(worldPos.x - target.x, worldPos.y - target.y) <= tipSeparation * 0.55) {
      return true;
    }

    // 检查合围战术包络内部
    const envelope = [start, leftFlank, leftTip, target, rightTip, rightFlank];
    if (isInsidePolygon(worldPos, envelope)) {
      return true;
    }

    return false;
  }

  // 6. 进攻主突宽体箭头、防御阵地线与支援虚线箭头（沿贝塞尔插值曲线全覆盖检测）
  const pts = el.points.length > 2 ? getBezierPoints(el.points, 25) : el.points;
  const tolerance = Math.max(el.strokeWidth * 2.8, 32);

  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(worldPos, pts[i], pts[i + 1]) <= tolerance) {
      return true;
    }
  }

  return false;
}

