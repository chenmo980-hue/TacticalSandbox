import { MapPresetType, TacticalMapConfig } from '../types/tactical';

export interface MapPresetInfo {
  id: MapPresetType;
  name: string;
  category: string;
  description: string;
  badge: string;
}

export const MAP_PRESETS: MapPresetInfo[] = [
  {
    id: 'satellite_tactical',
    name: '遥感卫星战术地貌',
    category: '真实卫星',
    description: '高精卫星遥感地形，标示主要水系渡口、主要机动公路干道与战略高地。',
    badge: '实战侦察',
  },
  {
    id: 'topographic_sand',
    name: '军标等高线地形图',
    category: '军用测绘',
    description: '标准1:25,000军用等高线沙盘，包含山地高程注记、林地与战术机动通路。',
    badge: '作战指挥',
  },
  {
    id: 'radar_night_grid',
    name: '指挥大屏夜视雷达网',
    category: '态势感知',
    description: '暗夜战术雷达网格背景，配备方位角测距环、MGRS坐标系与雷达扫描线。',
    badge: '联合指挥',
  },
  {
    id: 'coastal_defense',
    name: '海空联合岛礁演习场',
    category: '两栖登陆',
    description: '涵盖主要海岸线、登陆滩头(Alpha/Bravo)、深水航道与外围防御列岛。',
    badge: '抢滩登陆',
  },
  {
    id: 'desert_mountain',
    name: '荒漠峡谷阻击战区',
    category: '山地穿插',
    description: '戈壁荒漠干涸河床、隘口咽喉与峡谷通道，适合装甲纵深穿插与设伏。',
    badge: '纵深突破',
  },
  {
    id: 'custom_image',
    name: '本地文件导入底图',
    category: '本地文件',
    description: '上传您本地的高精作战地图文件、无人机正射影像或手绘战术扫描图。',
    badge: '本地文件',
  },
  {
    id: 'online_map_plugin',
    name: '在线地图/外部链接导入插件',
    category: '在线插件',
    description: '嵌入 Google Maps 谷歌卫星/地形图、百度地图样式、或导入您自己在线绘制的谷歌地图链接。',
    badge: '在线导入',
  },
];

export interface OnlineMapOption {
  id: string;
  name: string;
  provider: 'google' | 'baidu' | 'osm' | 'custom';
  defaultUrl: string;
  desc: string;
}

export const PRESET_ONLINE_MAPS: OnlineMapOption[] = [
  {
    id: 'google_satellite',
    name: 'Google Maps 谷歌全球遥感卫星图',
    provider: 'google',
    defaultUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=2400&q=85',
    desc: '超高分辨率全球真实卫星遥感底图，清晰呈现山川、平原与战略要道',
  },
  {
    id: 'google_terrain',
    name: 'Google Maps 谷歌战术地形高程图',
    provider: 'google',
    defaultUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85',
    desc: '包含自然地形等高起伏与水系地貌特征的战术地图',
  },
  {
    id: 'baidu_style',
    name: '百度/高德深色夜视电子态势图',
    provider: 'baidu',
    defaultUrl: 'https://images.unsplash.com/photo-1508873696983-2df570464756?auto=format&fit=crop&w=2400&q=85',
    desc: '极高对比度暗色夜战电子地图，道路主干网与行政区划边界清晰',
  },
  {
    id: 'osm_standard',
    name: 'OpenStreetMap 开放地理测绘图',
    provider: 'osm',
    defaultUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=2400&q=85',
    desc: '全球开源测绘地理信息底图，标准比例尺与地名标注体系',
  },
];

/**
 * 在 Canvas 绘制高精矢量战术底图
 */
export function drawTacticalMapBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: TacticalMapConfig,
  customImageElement?: HTMLImageElement | null
) {
  ctx.save();

  // 0. 如果采用 iframe 交互网页底图模式 (如 Google My Maps 谷歌自绘地图)，画布背景保持透明
  if (config.preset === 'online_map_plugin' && config.mapLayerType === 'iframe_webmap') {
    if (config.gridVisible) {
      renderTacticalGrid(ctx, width, height, config.gridColor || 'rgba(56, 189, 248, 0.15)');
    }
    ctx.restore();
    return;
  }

  // 1. 如果是自定义图片或在线地图插件且已加载图片
  if (
    (config.preset === 'custom_image' || config.preset === 'online_map_plugin') &&
    customImageElement &&
    customImageElement.complete &&
    customImageElement.naturalWidth > 0
  ) {
    ctx.filter = `brightness(${config.brightness}%) contrast(${config.contrast}%)`;
    ctx.drawImage(customImageElement, 0, 0, width, height);
    ctx.filter = 'none';

    // 标示在线底图水印来源
    if (config.preset === 'online_map_plugin' && config.onlineMapUrl) {
      ctx.save();
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(`在线底图源: ${config.onlineMapType === 'custom_url' ? '自绘在线地图链接' : config.onlineMapType || '在线插件'}`, width - 20, height - 16);
      ctx.restore();
    }
  } else if (config.preset === 'online_map_plugin' && (!customImageElement || !customImageElement.complete)) {
    // 在线地图加载中提示与占位网格
    renderOnlineMapPlaceholder(ctx, width, height, config);
  } else {
    // 2. 根据选定的预设程序化渲染高精战术底图
    switch (config.preset) {
      case 'satellite_tactical':
        renderSatelliteMap(ctx, width, height);
        break;
      case 'topographic_sand':
        renderTopographicMap(ctx, width, height);
        break;
      case 'radar_night_grid':
        renderRadarGridMap(ctx, width, height);
        break;
      case 'coastal_defense':
        renderCoastalDefenseMap(ctx, width, height);
        break;
      case 'desert_mountain':
        renderDesertMountainMap(ctx, width, height);
        break;
      default:
        renderSatelliteMap(ctx, width, height);
    }
  }

  // 3. 绘制战术坐标网格 (MGRS / 战术方格网)
  if (config.gridVisible) {
    renderTacticalGrid(ctx, width, height, config.gridColor || 'rgba(56, 189, 248, 0.15)');
  }

  ctx.restore();
}

/**
 * 在线地图加载中时的态势占位图
 */
function renderOnlineMapPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: TacticalMapConfig
) {
  ctx.fillStyle = '#0a1017';
  ctx.fillRect(0, 0, w, h);

  // 绘制雷达同心圆
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 文字提示
  ctx.font = 'bold 15px "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText('【在线地图插件】正在连接外部底图源...', w / 2, h / 2 - 10);

  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(config.onlineMapUrl || '未配置在线地图链接，可在“底图配置”中输入链接', w / 2, h / 2 + 16);
}

/**
 * 遥感卫星地貌
 */
function renderSatelliteMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 深山绿与深暗土色调
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0f1715');
  bgGrad.addColorStop(0.5, '#121d18');
  bgGrad.addColorStop(1, '#0a120f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 地貌山脊丘陵纹理
  ctx.fillStyle = 'rgba(28, 48, 38, 0.45)';
  ctx.beginPath();
  ctx.ellipse(w * 0.35, h * 0.4, w * 0.28, h * 0.22, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(38, 58, 45, 0.4)';
  ctx.beginPath();
  ctx.ellipse(w * 0.72, h * 0.65, w * 0.22, h * 0.18, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // 战术主干河流 (River Obstacle)
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, 0);
  ctx.bezierCurveTo(w * 0.25, h * 0.3, w * 0.4, h * 0.2, w * 0.52, h * 0.55);
  ctx.bezierCurveTo(w * 0.62, h * 0.8, w * 0.85, h * 0.85, w, h * 0.95);
  ctx.stroke();

  // 浅水过渡
  ctx.lineWidth = 20;
  ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 战略机动主干道 (Highway)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 6]);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.75);
  ctx.quadraticCurveTo(w * 0.5, h * 0.6, w, h * 0.25);
  ctx.stroke();
  ctx.setLineDash([]);

  // 战略地物注记
  drawMapMarker(ctx, w * 0.35, h * 0.38, '▲ 241高地 (主峰)', '#38bdf8');
  drawMapMarker(ctx, w * 0.72, h * 0.63, '▲ 108高地 (要冲)', '#38bdf8');
  drawMapMarker(ctx, w * 0.52, h * 0.54, '⚓ 渡口·1号铁桥', '#f59e0b');
  drawMapMarker(ctx, w * 0.18, h * 0.78, '⬢ 蓝军第1集结地域', '#38bdf8');
  drawMapMarker(ctx, w * 0.82, h * 0.28, '⬢ 红军前沿防御支撑点', '#f43f5e');
}

/**
 * 等高线测绘沙盘
 */
function renderTopographicMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 经典沙盘纸米黄/褐底色
  ctx.fillStyle = '#1c1b18';
  ctx.fillRect(0, 0, w, h);

  // 密集等高线
  ctx.strokeStyle = 'rgba(168, 152, 120, 0.28)';
  ctx.lineWidth = 1;

  for (let r = 50; r <= 380; r += 24) {
    ctx.beginPath();
    ctx.ellipse(w * 0.38, h * 0.45, r * 1.2, r * 0.85, 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // 计曲线加粗与高程注记
    if (r % 72 === 0) {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(217, 198, 160, 0.45)';
      ctx.stroke();
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(217, 198, 160, 0.6)';
      ctx.fillText(`${r + 120}m`, w * 0.38 + r * 1.15, h * 0.45);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(168, 152, 120, 0.28)';
    }
  }

  // 右侧副峰等高线
  for (let r = 40; r <= 280; r += 22) {
    ctx.beginPath();
    ctx.ellipse(w * 0.75, h * 0.58, r * 0.95, r * 0.8, -0.4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 鞍部与谷底水系
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.bezierCurveTo(w * 0.52, h * 0.4, w * 0.56, h * 0.6, w * 0.6, h);
  ctx.stroke();

  drawMapMarker(ctx, w * 0.38, h * 0.45, '▲ 鹰嘴岩 488m', '#e2e8f0');
  drawMapMarker(ctx, w * 0.75, h * 0.58, '▲ 狼窝顶 392m', '#e2e8f0');
}

/**
 * 指挥大屏夜视雷达网格
 */
function renderRadarGridMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 深墨深空蓝黑底
  ctx.fillStyle = '#060d14';
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxR = Math.min(w, h) * 0.65;

  // 雷达方位角同心测距环
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)';
  ctx.lineWidth = 1;

  for (let r = 80; r <= maxR; r += 90) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillText(`${(r * 0.2).toFixed(0)} KM`, cx + r - 35, cy - 6);
  }

  // 12等分径向方位线
  for (let deg = 0; deg < 360; deg += 30) {
    const rad = (deg * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
    ctx.stroke();

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.fillText(`${deg}°`, cx + Math.cos(rad) * (maxR + 14), cy + Math.sin(rad) * (maxR + 14));
  }

  // 模拟雷达扫描光带扇区
  const sweepAngle = (Date.now() / 1800) % (Math.PI * 2);
  const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  sweepGrad.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
  sweepGrad.addColorStop(1, 'rgba(14, 165, 233, 0.01)');
  ctx.fillStyle = sweepGrad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, maxR, sweepAngle - 0.4, sweepAngle);
  ctx.closePath();
  ctx.fill();

  drawMapMarker(ctx, cx, cy, '⊕ 联合战区指挥中心 (TOC-01)', '#38bdf8');
}

/**
 * 岛礁两栖演习场
 */
function renderCoastalDefenseMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // 深海暗海蓝
  ctx.fillStyle = '#081726';
  ctx.fillRect(0, 0, w, h);

  // 陆地岛屿
  ctx.fillStyle = '#16281e';
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;

  // 主岛
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.2);
  ctx.bezierCurveTo(w * 0.45, h * 0.15, w * 0.6, h * 0.3, w * 0.65, h * 0.55);
  ctx.bezierCurveTo(w * 0.7, h * 0.8, w * 0.4, h * 0.85, w * 0.25, h * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 浅水区光晕
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 16;
  ctx.stroke();

  // 外围副岛
  ctx.beginPath();
  ctx.ellipse(w * 0.82, h * 0.32, 50, 35, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 滩头着陆场
  drawMapMarker(ctx, w * 0.62, h * 0.45, '★ 抢滩登陆场 ALPHA', '#f59e0b');
  drawMapMarker(ctx, w * 0.48, h * 0.76, '★ 抢滩登陆场 BRAVO', '#f59e0b');
  drawMapMarker(ctx, w * 0.42, h * 0.45, '▲ 核心守备要塞 (红方)', '#f43f5e');
}

/**
 * 荒漠山地阻击区
 */
function renderDesertMountainMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#221b14');
  grad.addColorStop(1, '#15110d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 峡谷干涸河床
  ctx.strokeStyle = '#45382b';
  ctx.lineWidth = 32;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.4);
  ctx.bezierCurveTo(w * 0.3, h * 0.35, w * 0.6, h * 0.65, w, h * 0.6);
  ctx.stroke();

  // 隘口两侧峭壁
  ctx.fillStyle = 'rgba(69, 56, 43, 0.6)';
  ctx.beginPath();
  ctx.ellipse(w * 0.48, h * 0.25, 90, 60, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.52, h * 0.75, 110, 70, 0, 0, Math.PI * 2);
  ctx.fill();

  drawMapMarker(ctx, w * 0.5, h * 0.5, '⨂ 咽喉隘口 (装甲伏击点)', '#ef4444');
}

/**
 * 绘制战术方格坐标网
 */
function renderTacticalGrid(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  const gridSize = 100;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([4, 4]);

  // 纵线
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();

    // 坐标数字 MGRS
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.fillText(`${(x / 10).toFixed(0).padStart(3, '0')}`, x + 4, 14);
  }

  // 横线
  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.fillText(`${(y / 10).toFixed(0).padStart(3, '0')}`, 4, y - 4);
  }

  ctx.restore();
}

function drawMapMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string
) {
  ctx.save();
  ctx.font = '600 11px "Noto Sans SC", sans-serif';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 5;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y);
  ctx.restore();
}
