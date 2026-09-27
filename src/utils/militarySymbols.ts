import { UnitElement, Faction, Branch, Echelon, UnitStatus } from '../types/tactical';

export const FACTION_CONFIG: Record<Faction, { label: string; stroke: string; fill: string; text: string; bgBadge: string }> = {
  blue: {
    label: '友军 (Blue Force)',
    stroke: '#38bdf8',
    fill: 'rgba(14, 165, 233, 0.22)',
    text: '#38bdf8',
    bgBadge: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  },
  red: {
    label: '敌军 (OpFor / Red)',
    stroke: '#f43f5e',
    fill: 'rgba(244, 63, 94, 0.22)',
    text: '#fb7185',
    bgBadge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  green: {
    label: '中立 (Neutral)',
    stroke: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.22)',
    text: '#4ade80',
    bgBadge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  yellow: {
    label: '未明 (Unknown)',
    stroke: '#eab308',
    fill: 'rgba(234, 179, 8, 0.22)',
    text: '#facc15',
    bgBadge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
};

export const ECHELON_CONFIG: Record<Echelon, { label: string; symbol: string; level: number }> = {
  squad: { label: '班', symbol: '●', level: 1 },
  platoon: { label: '排', symbol: '●●', level: 2 },
  company: { label: '连', symbol: '●●●', level: 3 },
  battalion: { label: '营', symbol: 'Ⅰ', level: 4 },
  regiment: { label: '团', symbol: 'Ⅱ', level: 5 },
  brigade: { label: '旅', symbol: 'X', level: 6 },
  division: { label: '师', symbol: 'XX', level: 7 },
  corps: { label: '军', symbol: 'XXX', level: 8 },
  army: { label: '集团军', symbol: 'XXXX', level: 9 },
};

export const BRANCH_CONFIG: Record<Branch, { label: string; code: string; desc: string }> = {
  infantry: { label: '步兵', code: 'INF', desc: '轻型战备步兵、摩托化步兵' },
  armor: { label: '装甲兵', code: 'ARM', desc: '主战坦克、重型装甲突击群' },
  mech_infantry: { label: '机械化步兵', code: 'MECH', desc: '履带式/轮式装甲步战突击群' },
  artillery: { label: '炮兵', code: 'ART', desc: '压制身管火炮、远程火箭炮兵' },
  air_defense: { label: '防空兵', code: 'AD', desc: '防空地空导弹、自行高炮' },
  aviation: { label: '陆军航空兵', code: 'AVN', desc: '武装直升机、战术空中突击群' },
  recon: { label: '侦察部队', code: 'REC', desc: '前沿武力侦察、战术技术侦查' },
  engineer: { label: '工程兵', code: 'ENG', desc: '扫雷破障、架桥筑垒' },
  signals: { label: '通信/电子战', code: 'SIG', desc: '野战通信、强电磁压制对抗' },
  specops: { label: '特种作战', code: 'SOF', desc: '特种渗透、敌后破袭引导' },
  hq: { label: '战术指挥所', code: 'HQ', desc: '基本指挥所、前进指挥组' },
  naval: { label: '海军陆战队', code: 'MAR', desc: '两栖合成装甲、抢滩登陆突击' },
  drone: { label: '无人机/蜂群', code: 'UAV', desc: '侦察察打一体机、巡飞弹蜂群' },
  logistics: { label: '综合保障', code: 'LOG', desc: '弹药补给、野战战伤救护' },
};

export const STATUS_CONFIG: Record<UnitStatus, { label: string; color: string }> = {
  ready: { label: '战备集结', color: '#38bdf8' },
  marching: { label: '快速机动', color: '#818cf8' },
  engaged: { label: '激烈交战', color: '#f43f5e' },
  defending: { label: '坚守阵地', color: '#10b981' },
  assault: { label: '正面突击', color: '#f97316' },
  damaged: { label: '战损减员', color: '#ef4444' },
  rest: { label: '隐蔽休整', color: '#94a3b8' },
};

/**
 * 绘制标准APP-6军事战术标符
 */
export function drawMilitaryUnit(
  ctx: CanvasRenderingContext2D,
  unit: UnitElement,
  isSelected = false
) {
  const { x, y, faction, branch, echelon, name, strength, combatPower, scale = 1, customIconUrl } = unit;
  const cfg = FACTION_CONFIG[faction] || FACTION_CONFIG.blue;
  const ech = ECHELON_CONFIG[echelon] || ECHELON_CONFIG.battalion;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const w = 48;
  const h = 32;

  // 1. 如果选中，绘制高亮光环
  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-w / 2 - 8, -h / 2 - 18, w + 16, h + 36);
    ctx.setLineDash([]);
  }

  // 2. 绘制阵营框体 (Faction Frame)
  ctx.fillStyle = cfg.fill;
  ctx.strokeStyle = cfg.stroke;
  ctx.lineWidth = 2.5;

  if (faction === 'red') {
    // 敌军：菱形 (Diamond)
    const dw = w * 1.05;
    const dh = h * 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -dh / 2);
    ctx.lineTo(dw / 2, 0);
    ctx.lineTo(0, dh / 2);
    ctx.lineTo(-dw / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (faction === 'green') {
    // 中立：正方形 (Square)
    const sz = Math.min(w, h) * 1.08;
    ctx.beginPath();
    ctx.rect(-sz / 2, -sz / 2, sz, sz);
    ctx.fill();
    ctx.stroke();
  } else {
    // 蓝军/友军：标准矩形框 (Rectangle)
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
  }

  // 如果是指挥所HQ，向左下延展指挥旗杆
  if (branch === 'hq') {
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2 + 18);
    ctx.lineWidth = 3;
    ctx.strokeStyle = cfg.stroke;
    ctx.stroke();
  }

  // 3. 绘制内嵌兵种符号 (Branch Icon)
  if (customIconUrl) {
    // 预留自定义图标绘制
  } else {
    drawBranchIconInside(ctx, branch, cfg.stroke, w, h);
  }

  // 4. 绘制顶部编制规模 (Echelon Symbol)
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = cfg.stroke;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(ech.symbol, 0, -h / 2 - 3);

  // 5. 绘制战术部队名称 (Unit Designation)
  ctx.font = '600 11px "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // 绘制文字阴影衬底确保在任意底图上清晰
  const labelY = h / 2 + 4;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(name || BRANCH_CONFIG[branch].label, 0, labelY);

  // 兵力详情与战力条
  if (strength) {
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(strength, 0, labelY + 14);
  }
  ctx.restore();

  // 6. 战斗力进度指示条 (Health / Combat Readiness Bar)
  const barW = w * 0.9;
  const barH = 3;
  const barY = -h / 2 - 14;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(-barW / 2, barY, barW, barH);

  let cpColor = '#22c55e';
  if (combatPower < 40) cpColor = '#ef4444';
  else if (combatPower < 75) cpColor = '#eab308';

  ctx.fillStyle = cpColor;
  ctx.fillRect(-barW / 2, barY, barW * (combatPower / 100), barH);

  ctx.restore();
}

/**
 * 内部标准兵种简标绘制
 */
function drawBranchIconInside(
  ctx: CanvasRenderingContext2D,
  branch: Branch,
  color: string,
  w: number,
  h: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const iw = w * 0.65;
  const ih = h * 0.65;

  switch (branch) {
    case 'infantry':
      // 步兵：标准对角线交叉 X
      ctx.beginPath();
      ctx.moveTo(-iw / 2, -ih / 2);
      ctx.lineTo(iw / 2, ih / 2);
      ctx.moveTo(iw / 2, -ih / 2);
      ctx.lineTo(-iw / 2, ih / 2);
      ctx.stroke();
      break;

    case 'armor':
      // 装甲：横向椭圆履带
      ctx.beginPath();
      ctx.ellipse(0, 0, iw * 0.45, ih * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'mech_infantry':
      // 机械化步兵：椭圆 + 交叉
      ctx.beginPath();
      ctx.ellipse(0, 0, iw * 0.45, ih * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-iw * 0.3, -ih * 0.25);
      ctx.lineTo(iw * 0.3, ih * 0.25);
      ctx.moveTo(iw * 0.3, -ih * 0.25);
      ctx.lineTo(-iw * 0.3, ih * 0.25);
      ctx.stroke();
      break;

    case 'artillery':
      // 炮兵：中心实心炮弹圆点
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'air_defense':
      // 防空：底部向上圆拱
      ctx.beginPath();
      ctx.arc(0, ih * 0.35, iw * 0.4, Math.PI, 0);
      ctx.stroke();
      break;

    case 'aviation':
      // 陆航：旋转双翼或飞鸟
      ctx.beginPath();
      ctx.moveTo(-iw / 2, 0);
      ctx.quadraticCurveTo(0, -ih * 0.4, iw / 2, 0);
      ctx.quadraticCurveTo(0, ih * 0.4, -iw / 2, 0);
      ctx.stroke();
      break;

    case 'recon':
      // 侦察：单斜线 /
      ctx.beginPath();
      ctx.moveTo(-iw / 2, ih / 2);
      ctx.lineTo(iw / 2, -ih / 2);
      ctx.stroke();
      break;

    case 'engineer':
      // 工兵：桥梁/工字梁
      ctx.beginPath();
      ctx.moveTo(-iw * 0.35, -ih * 0.35);
      ctx.lineTo(iw * 0.35, -ih * 0.35);
      ctx.lineTo(iw * 0.35, ih * 0.35);
      ctx.lineTo(-iw * 0.35, ih * 0.35);
      ctx.moveTo(-iw * 0.35, 0);
      ctx.lineTo(iw * 0.35, 0);
      ctx.stroke();
      break;

    case 'signals':
      // 通信：闪电折线
      ctx.beginPath();
      ctx.moveTo(-iw * 0.25, -ih * 0.4);
      ctx.lineTo(iw * 0.1, -ih * 0.05);
      ctx.lineTo(-iw * 0.1, 0.05);
      ctx.lineTo(iw * 0.25, ih * 0.4);
      ctx.stroke();
      break;

    case 'specops':
      // 特战：匕首
      ctx.beginPath();
      ctx.moveTo(0, -ih * 0.45);
      ctx.lineTo(0, ih * 0.45);
      ctx.moveTo(-iw * 0.2, 0);
      ctx.lineTo(iw * 0.2, 0);
      ctx.stroke();
      break;

    case 'drone':
      // 无人机：三角形前掠翼
      ctx.beginPath();
      ctx.moveTo(0, -ih * 0.35);
      ctx.lineTo(iw * 0.4, ih * 0.3);
      ctx.lineTo(0, ih * 0.1);
      ctx.lineTo(-iw * 0.4, ih * 0.3);
      ctx.closePath();
      ctx.stroke();
      break;

    case 'naval':
      // 海军陆战队：锚形
      ctx.beginPath();
      ctx.arc(0, -ih * 0.2, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -ih * 0.1);
      ctx.lineTo(0, ih * 0.35);
      ctx.moveTo(-iw * 0.35, ih * 0.2);
      ctx.quadraticCurveTo(0, ih * 0.45, iw * 0.35, ih * 0.2);
      ctx.stroke();
      break;

    case 'hq':
      // 指挥部：文字 HQ
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HQ', 0, 0);
      break;

    default:
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
  }

  ctx.restore();
}
