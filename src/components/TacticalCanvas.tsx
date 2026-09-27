import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  TacticalState,
  TacticalElement,
  UnitElement,
  ArrowElement,
  Point,
  CollabStaff,
  UnitDeployTemplate,
  TacticalCompareConfig,
  TacticalLayer,
} from '../types/tactical';
import { drawTacticalMapBackground } from '../utils/mapPresets';
import { drawMilitaryUnit } from '../utils/militarySymbols';
import {
  drawAssaultArrow,
  drawDefenseLine,
  drawPincerArrow,
  drawSupportArrow,
  drawFireStrike,
  drawAssemblyZone,
  isPointHittingArrow,
} from '../utils/arrowMath';
import { ActiveTool } from './TacticalToolbar';

interface TacticalCanvasProps {
  tacticalState: TacticalState;
  activeTool: ActiveTool;
  deployTemplate: UnitDeployTemplate;
  onUnitDeployed?: (newCount: number) => void;
  onElementSelect: (element: TacticalElement | null) => void;
  selectedElementId: string | null;
  onElementUpdate: (element: TacticalElement) => void;
  onElementAdd: (element: TacticalElement) => void;
  onCursorMove?: (x: number, y: number) => void;
  onPing?: (x: number, y: number) => void;
  otherStaffs?: CollabStaff[];
  customImageElement?: HTMLImageElement | null;
  canvasRefOut?: (canvas: HTMLCanvasElement | null) => void;
  compareConfig?: TacticalCompareConfig;
  onChangeCompareSlider?: (value: number) => void;
}

interface ActivePing {
  x: number;
  y: number;
  label: string;
  staffName: string;
  color: string;
  createdAt: number;
}

export const TacticalCanvas: React.FC<TacticalCanvasProps> = ({
  tacticalState,
  activeTool,
  deployTemplate,
  onUnitDeployed,
  onElementSelect,
  selectedElementId,
  onElementUpdate,
  onElementAdd,
  onCursorMove,
  onPing,
  otherStaffs = [],
  customImageElement,
  canvasRefOut,
  compareConfig,
  onChangeCompareSlider,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 卷帘分屏模式下拖拽分界线状态
  const [isDraggingCurtain, setIsDraggingCurtain] = useState(false);

  // 视图平移与缩放矩阵 (统一控制沙盘画布与背景地图层)
  const [transform, setTransform] = useState<{ x: number; y: number; scale: number }>({
    x: 80,
    y: 40,
    scale: 1,
  });

  // 正在标绘的临时控制点队列
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [hoverWorldPos, setHoverWorldPos] = useState<Point>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });

  // 部队拖拽状态
  const [isDraggingUnit, setIsDraggingUnit] = useState(false);
  const [unitDragOffset, setUnitDragOffset] = useState<Point>({ x: 0, y: 0 });

  // 箭头拖拽与顶点调整状态 (解决箭头无法拖动的缺陷)
  const [isDraggingArrow, setIsDraggingArrow] = useState(false);
  const [draggedControlPointIndex, setDraggedControlPointIndex] = useState<number | null>(null);
  const [dragStartWorldPos, setDragStartWorldPos] = useState<Point>({ x: 0, y: 0 });
  const [draggedArrowInitialPoints, setDraggedArrowInitialPoints] = useState<Point[]>([]);

  const [activePings, setActivePings] = useState<ActivePing[]>([]);

  // 坐标转换：屏幕像素点 -> 战术沙盘世界坐标
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      return {
        x: (screenX - transform.x) / transform.scale,
        y: (screenY - transform.y) / transform.scale,
      };
    },
    [transform]
  );

  // 导出 canvasRef 给录像机
  useEffect(() => {
    if (canvasRefOut) {
      canvasRefOut(canvasRef.current);
    }
  }, [canvasRefOut]);

  // 窗口自适应大小调整
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 鼠标滚轮以光标为中心缩放沙盘 (同时驱动地图与标绘层)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.2), 4.5);

    // 计算缩放后保持光标指向的世界坐标不变
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

    setTransform({
      x: newX,
      y: newY,
      scale: newScale,
    });
  };

  // 检测是否点击到了兵力标符
  const getUnitAtPos = (worldPos: Point): UnitElement | null => {
    const visibleLayerIds = new Set(
      tacticalState.layers.filter((l) => l.visible && !l.locked).map((l) => l.id)
    );

    // 从后往前查找以优先选中上层元素
    for (let i = tacticalState.elements.length - 1; i >= 0; i--) {
      const el = tacticalState.elements[i];
      if (el.type === 'unit' && visibleLayerIds.has(el.layerId)) {
        const dx = Math.abs(worldPos.x - el.x);
        const dy = Math.abs(worldPos.y - el.y);
        if (dx <= 32 * (el.scale || 1) && dy <= 24 * (el.scale || 1)) {
          return el;
        }
      }
    }
    return null;
  };

  // 几何辅助函数：点到线段的垂直距离
  const distToSegment = (p: Point, a: Point, b: Point): number => {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
  };

  // 几何辅助函数：检测点是否在多边形内部
  const isInsidePolygon = (p: Point, poly: Point[]): boolean => {
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
  };

  // 全面精准检测是否点击到了战术标号 (支持钳形双箭头、贝塞尔主突箭头、防线齿标、打击圈、多边形和文字标签)
  const getArrowAtPos = (worldPos: Point): ArrowElement | null => {
    const visibleLayerIds = new Set(
      tacticalState.layers.filter((l) => l.visible && !l.locked).map((l) => l.id)
    );

    for (let i = tacticalState.elements.length - 1; i >= 0; i--) {
      const el = tacticalState.elements[i];
      if (el.type === 'arrow' && visibleLayerIds.has(el.layerId)) {
        if (isPointHittingArrow(worldPos, el)) {
          return el;
        }
      }
    }
    return null;
  };

  // 跟踪空格键状态以支持按住空格拖拽沙盘
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    // 0. 卷帘分屏模式下：点击抓取分屏分界激光线
    if (compareConfig?.isActive && compareConfig.mode === 'curtain' && onChangeCompareSlider && e.button === 0) {
      const splitMapX = (2400 * compareConfig.sliderValue) / 100;
      if (Math.abs(worldPos.x - splitMapX) <= 40 / transform.scale) {
        setIsDraggingCurtain(true);
        return;
      }
    }

    // 1. 中键、右键、选择平移模式、或按住空格拖拽地图 (连同地图底图与全部标绘层整体绝对同步平移)
    if (e.button === 1 || e.button === 2 || activeTool === 'pan' || (e.button === 0 && isSpacePressed)) {
      setIsDraggingMap(true);
      setDragStartPos({ x: screenX - transform.x, y: screenY - transform.y });
      return;
    }

    if (e.button === 0) {
      // 1. 战术激光笔指示
      if (activeTool === 'ping') {
        const ping: ActivePing = {
          x: worldPos.x,
          y: worldPos.y,
          label: '重点协同关注',
          staffName: '指挥长',
          color: '#38bdf8',
          createdAt: Date.now(),
        };
        setActivePings((prev) => [...prev, ping]);
        if (onPing) onPing(worldPos.x, worldPos.y);
        return;
      }

      // 2. 部署兵力军标 (严格保持选定的模版状态与名称，在沙盘上连续部署，绝对不重置为默认！)
      if (activeTool === 'place_unit') {
        let unitName = deployTemplate.name;
        if (deployTemplate.autoIncrement && deployTemplate.counter > 0) {
          unitName = `${deployTemplate.name} #${deployTemplate.counter}`;
        }

        const newUnit: UnitElement = {
          id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'unit',
          layerId: tacticalState.activeLayerId,
          x: Math.round(worldPos.x),
          y: Math.round(worldPos.y),
          rotation: 0,
          scale: deployTemplate.scale || 1,
          faction: deployTemplate.faction,
          branch: deployTemplate.branch,
          echelon: deployTemplate.echelon,
          name: unitName,
          callsign: deployTemplate.callsign,
          strength: deployTemplate.strength,
          combatPower: deployTemplate.combatPower,
          status: deployTemplate.status,
          customIconUrl: deployTemplate.customIconUrl,
          createdAt: Date.now(),
        };

        onElementAdd(newUnit);
        // 关键：不自动打开属性弹窗，保持在 place_unit 状态，方便参谋连续放置多个同类兵力！
        if (deployTemplate.autoIncrement && onUnitDeployed) {
          onUnitDeployed(deployTemplate.counter + 1);
        }
        return;
      }

      // 3. 绘制进攻/防御箭头
      if (typeof activeTool === 'object' && activeTool.type === 'draw_arrow') {
        const newPts = [...drawingPoints, worldPos];
        setDrawingPoints(newPts);

        if (activeTool.arrowType === 'fire_strike') {
          const newArrow: ArrowElement = {
            id: `arrow-${Date.now()}`,
            type: 'arrow',
            arrowType: 'fire_strike',
            layerId: tacticalState.activeLayerId,
            points: [worldPos],
            radius: 70,
            color: '#ef4444',
            strokeWidth: 4,
            opacity: 0.9,
            label: '战术火力覆盖区',
            createdAt: Date.now(),
          };
          onElementAdd(newArrow);
          onElementSelect(newArrow);
          setDrawingPoints([]);
        } else if (activeTool.arrowType === 'pincer' && newPts.length >= 2) {
          const newArrow: ArrowElement = {
            id: `arrow-${Date.now()}`,
            type: 'arrow',
            arrowType: 'pincer',
            layerId: tacticalState.activeLayerId,
            points: newPts,
            color: '#f97316',
            strokeWidth: 8,
            opacity: 0.9,
            label: '钳形合围向心突击',
            createdAt: Date.now(),
          };
          onElementAdd(newArrow);
          onElementSelect(newArrow);
          setDrawingPoints([]);
        }
        return;
      }

      // 4. 选择与拖动模式 (全面支持部队拖拽与各类箭头整体平移 / 控制点微调)
      if (activeTool === 'select') {
        // A. 如果已选中某个箭头，优先检查是否点中了控制点微调顶点，或点中了箭头主体以整体平移
        if (selectedElementId) {
          const currentArrow = tacticalState.elements.find(
            (e) => e.id === selectedElementId && e.type === 'arrow'
          ) as ArrowElement | undefined;

          if (currentArrow) {
            // A1. 优先抓取控制点手柄进行微调（22px 触控容差）
            const ptIdx = currentArrow.points.findIndex(
              (p) => Math.hypot(worldPos.x - p.x, worldPos.y - p.y) <= 22
            );
            if (ptIdx !== -1) {
              setIsDraggingArrow(true);
              setDraggedControlPointIndex(ptIdx);
              setDragStartWorldPos(worldPos);
              setDraggedArrowInitialPoints([...currentArrow.points]);
              return;
            }

            // A2. 点中了当前已选中箭头的任意有效区域（箭身、文字标签、打击圈、合围区等）-> 整体平移拖动！
            // 解决“选择某些箭头图形时，无法拖动”的关键缺陷！
            if (isPointHittingArrow(worldPos, currentArrow)) {
              setIsDraggingArrow(true);
              setDraggedControlPointIndex(null); // 整体平移拖拽当前箭头
              setDragStartWorldPos(worldPos);
              setDraggedArrowInitialPoints([...currentArrow.points]);
              return;
            }
          }
        }

        // B. 检查是否点击了部队标符
        const clickedUnit = getUnitAtPos(worldPos);
        if (clickedUnit) {
          onElementSelect(clickedUnit);
          setIsDraggingUnit(true);
          setUnitDragOffset({
            x: worldPos.x - clickedUnit.x,
            y: worldPos.y - clickedUnit.y,
          });
          return;
        }

        // C. 检查是否点击了其他箭头标号 (点击任意位置均可选中并立即开始整体拖拽平移)
        const clickedArrow = getArrowAtPos(worldPos);
        if (clickedArrow) {
          onElementSelect(clickedArrow);
          setIsDraggingArrow(true);
          setDraggedControlPointIndex(null); // 整体平移拖拽
          setDragStartWorldPos(worldPos);
          setDraggedArrowInitialPoints([...clickedArrow.points]);
          return;
        }

        // D. 点中空白处 -> 取消选择，并自动进入地图平移拖拽模式！
        // 关键体验提升：点空白处拖拽即可随手漫游平移沙盘，地图底图与所有战术标绘完全同步移动，无需频繁切换平移工具！
        onElementSelect(null);
        setIsDraggingMap(true);
        setDragStartPos({ x: screenX - transform.x, y: screenY - transform.y });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);
    setHoverWorldPos(worldPos);

    if (onCursorMove) {
      onCursorMove(worldPos.x, worldPos.y);
    }

    // 地图平移 (驱动沙盘和底层地图同步移动)
    if (isDraggingMap) {
      setTransform((prev) => ({
        ...prev,
        x: screenX - dragStartPos.x,
        y: screenY - dragStartPos.y,
      }));
      return;
    }

    // 拖拽卷帘分屏分割线
    if (isDraggingCurtain && onChangeCompareSlider) {
      const newPct = Math.max(0, Math.min(100, Math.round((worldPos.x / 2400) * 100)));
      onChangeCompareSlider(newPct);
      return;
    }

    // 拖拽移动部队
    if (isDraggingUnit && selectedElementId) {
      const el = tacticalState.elements.find((item) => item.id === selectedElementId);
      if (el && el.type === 'unit') {
        onElementUpdate({
          ...el,
          x: Math.round(worldPos.x - unitDragOffset.x),
          y: Math.round(worldPos.y - unitDragOffset.y),
        });
      }
      return;
    }

    // 拖拽移动战术箭头 (整体平移或单点微调)
    if (isDraggingArrow && selectedElementId) {
      const el = tacticalState.elements.find((item) => item.id === selectedElementId);
      if (el && el.type === 'arrow' && draggedArrowInitialPoints.length > 0) {
        const dx = Math.round(worldPos.x - dragStartWorldPos.x);
        const dy = Math.round(worldPos.y - dragStartWorldPos.y);

        if (draggedControlPointIndex !== null) {
          // 移动单个控制点
          const updatedPts = [...draggedArrowInitialPoints];
          if (updatedPts[draggedControlPointIndex]) {
            updatedPts[draggedControlPointIndex] = {
              x: Math.round(draggedArrowInitialPoints[draggedControlPointIndex].x + dx),
              y: Math.round(draggedArrowInitialPoints[draggedControlPointIndex].y + dy),
            };
            onElementUpdate({
              ...el,
              points: updatedPts,
            });
          }
        } else {
          // 整体平移箭头
          const updatedPts = draggedArrowInitialPoints.map((p) => ({
            x: Math.round(p.x + dx),
            y: Math.round(p.y + dy),
          }));
          onElementUpdate({
            ...el,
            points: updatedPts,
          });
        }
      }
      return;
    }
  };

  const handleMouseUp = () => {
    setIsDraggingMap(false);
    setIsDraggingUnit(false);
    setIsDraggingArrow(false);
    setIsDraggingCurtain(false);
    setDraggedControlPointIndex(null);
  };

  // 双击或右键结束当前箭头绘制
  const handleDoubleClick = () => {
    if (typeof activeTool === 'object' && activeTool.type === 'draw_arrow' && drawingPoints.length >= 2) {
      const colorMap: Record<string, string> = {
        assault: '#38bdf8',
        defense_line: '#f43f5e',
        support: '#06b6d4',
        pincer: '#f97316',
        assembly_zone: '#22c55e',
      };

      const newArrow: ArrowElement = {
        id: `arrow-${Date.now()}`,
        type: 'arrow',
        arrowType: activeTool.arrowType,
        layerId: tacticalState.activeLayerId,
        points: drawingPoints,
        color: colorMap[activeTool.arrowType] || '#38bdf8',
        strokeWidth: activeTool.arrowType === 'defense_line' ? 8 : 10,
        opacity: 0.9,
        dashed: activeTool.arrowType === 'support',
        label:
          activeTool.arrowType === 'assault'
            ? '主攻方向'
            : activeTool.arrowType === 'defense_line'
            ? '正面抗击阵地'
            : activeTool.arrowType === 'assembly_zone'
            ? '集结待命地域'
            : '穿插支援路线',
        createdAt: Date.now(),
      };
      onElementAdd(newArrow);
      onElementSelect(newArrow);
      setDrawingPoints([]);
    }
  };

  // 渲染主循环 (包含战术推演动画)
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 清屏
      ctx.clearRect(0, 0, w, h);

      // 应用平移与缩放矩阵 (沙盘坐标核心，与底层 iframe 容器完全同步)
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // 1. 绘制战术底图沙盘 (2400x1600 超大沙盘空间)
      const mapW = 2400;
      const mapH = 1600;
      drawTacticalMapBackground(ctx, mapW, mapH, tacticalState.mapConfig, customImageElement);

      // 2. 按图层分层绘制战术标绘
      for (const layer of tacticalState.layers) {
        if (!layer.visible) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity;

        const layerElements = tacticalState.elements.filter((el) => el.layerId === layer.id);

        // 先绘制所有箭头与区域线
        for (const el of layerElements) {
          if (el.type === 'arrow') {
            const isSel = el.id === selectedElementId;
            switch (el.arrowType) {
              case 'assault':
                drawAssaultArrow(ctx, el.points, el.color, el.strokeWidth, el.opacity, el.label);
                break;
              case 'defense_line':
                drawDefenseLine(ctx, el.points, el.color, el.strokeWidth, el.opacity, el.label);
                break;
              case 'pincer':
                drawPincerArrow(ctx, el.points, el.color, el.strokeWidth, el.opacity, el.label);
                break;
              case 'support':
                drawSupportArrow(ctx, el.points, el.color, el.strokeWidth, el.opacity, el.dashed, el.label);
                break;
              case 'fire_strike':
                drawFireStrike(ctx, el.points[0], el.radius || 60, el.color, el.strokeWidth, el.opacity, el.label);
                break;
              case 'assembly_zone':
                drawAssemblyZone(ctx, el.points, el.color, el.strokeWidth, el.opacity, el.label);
                break;
            }

            // 若选中箭头，绘制可拖拽控制点手柄
            if (isSel) {
              ctx.save();
              ctx.fillStyle = '#38bdf8';
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              for (const pt of el.points) {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              ctx.restore();
            }
          }
        }

        // 后绘制所有兵力战术标符 (APP-6 标准军标)
        for (const el of layerElements) {
          if (el.type === 'unit') {
            const isSel = el.id === selectedElementId;
            drawMilitaryUnit(ctx, el, isSel);
          }
        }

        ctx.restore();
      }

      // 3. 绘制当前正在标绘的预览辅助线与虚影
      if (drawingPoints.length > 0) {
        ctx.save();
        const previewPts = [...drawingPoints, hoverWorldPos];
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);

        ctx.beginPath();
        ctx.moveTo(previewPts[0].x, previewPts[0].y);
        for (let i = 1; i < previewPts.length; i++) {
          ctx.lineTo(previewPts[i].x, previewPts[i].y);
        }
        ctx.stroke();

        // 绘制控制点圆圈
        ctx.fillStyle = '#38bdf8';
        for (const pt of drawingPoints) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 3.5 部署兵力时的半透明预见虚影 (跟从光标，展示当前所选模版的准确兵种与规模)
      if (activeTool === 'place_unit') {
        ctx.save();
        ctx.globalAlpha = 0.6;
        const ghostUnit: UnitElement = {
          id: 'ghost-preview',
          type: 'unit',
          layerId: tacticalState.activeLayerId,
          x: hoverWorldPos.x,
          y: hoverWorldPos.y,
          rotation: 0,
          scale: deployTemplate.scale || 1,
          faction: deployTemplate.faction,
          branch: deployTemplate.branch,
          echelon: deployTemplate.echelon,
          name: deployTemplate.name,
          callsign: deployTemplate.callsign,
          strength: deployTemplate.strength,
          combatPower: deployTemplate.combatPower,
          status: deployTemplate.status,
          createdAt: 0,
        };
        drawMilitaryUnit(ctx, ghostUnit, false);
        ctx.restore();
      }

      // 4. 绘制多端协同参谋的实时光标
      for (const staff of otherStaffs) {
        if (staff.cursor) {
          ctx.save();
          ctx.translate(staff.cursor.x, staff.cursor.y);
          ctx.fillStyle = staff.color || '#22c55e';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;

          // 绘制战术箭头光标
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 14);
          ctx.lineTo(4, 10);
          ctx.lineTo(9, 14);
          ctx.lineTo(12, 11);
          ctx.lineTo(6, 7);
          ctx.lineTo(12, 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 参谋席位标签
          ctx.font = '600 10px "Noto Sans SC", sans-serif';
          ctx.fillStyle = staff.color || '#22c55e';
          ctx.fillText(`【${staff.name}】`, 14, 16);
          ctx.restore();
        }
      }

      // 5. 绘制战术激光笔指示涟漪动画
      const now = Date.now();
      for (const p of activePings) {
        const elapsed = (now - p.createdAt) / 1000;
        if (elapsed < 3) {
          const r = (elapsed * 55) % 65;
          const alpha = Math.max(0, 1 - elapsed / 3);

          ctx.save();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = 'bold 11px "Noto Sans SC", sans-serif';
          ctx.fillStyle = p.color;
          ctx.textAlign = 'center';
          ctx.fillText(`${p.staffName} · ${p.label}`, p.x, p.y - r - 8);
          ctx.restore();
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    transform,
    tacticalState,
    selectedElementId,
    drawingPoints,
    hoverWorldPos,
    otherStaffs,
    activePings,
    customImageElement,
    activeTool,
    deployTemplate,
  ]);

  // 计算军事MGRS战术方格坐标字符串
  const mgrsCode = `49Q DF ${Math.abs(Math.floor(hoverWorldPos.x * 2.1))
    .toString()
    .padStart(4, '0')} ${Math.abs(Math.floor(hoverWorldPos.y * 1.8))
    .toString()
    .padStart(4, '0')}`;
  const elevation = `+${Math.abs(
    Math.floor((hoverWorldPos.x * 0.3 + hoverWorldPos.y * 0.4) % 380 + 85)
  )}m`;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        if (drawingPoints.length >= 2) {
          handleDoubleClick();
        }
      }}
      className={`relative w-full h-full overflow-hidden select-none bg-neutral-950 ${
        activeTool === 'pan' || isDraggingMap
          ? 'cursor-grab active:cursor-grabbing'
          : isDraggingArrow || isDraggingUnit
          ? 'cursor-grabbing'
          : activeTool === 'place_unit'
          ? 'cursor-crosshair'
          : activeTool === 'select' && (getUnitAtPos(hoverWorldPos) || getArrowAtPos(hoverWorldPos))
          ? 'cursor-grab'
          : activeTool === 'select'
          ? 'cursor-default'
          : 'cursor-crosshair'
      }`}
    >
      {/* 0. 外部在线地图 iframe 底层 (Google My Maps 谷歌自绘地图 / 在线插件)
          核心设计：与 Canvas 沙盘平移/缩放矩阵 (transform.x, transform.y, transform.scale) 100% 绝对刚性同步！
          永久解决“平移只动战术内容、背景地图不动”的错位问题！ */}
      {tacticalState.mapConfig.preset === 'online_map_plugin' &&
        tacticalState.mapConfig.mapLayerType === 'iframe_webmap' &&
        tacticalState.mapConfig.embedMapUrl && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '2400px',
              height: '1600px',
              transformOrigin: '0 0',
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scale})`,
              filter: `brightness(${tacticalState.mapConfig.brightness}%) contrast(${tacticalState.mapConfig.contrast}%)`,
              zIndex: 0,
              pointerEvents: 'none',
              transition: 'none',
            }}
          >
            <iframe
              src={tacticalState.mapConfig.embedMapUrl}
              title="Google My Maps 谷歌自绘地图嵌入层"
              className="w-full h-full border-0 select-none pointer-events-none"
              allowFullScreen
              loading="lazy"
            />
          </div>
        )}

      <canvas ref={canvasRef} className="block w-full h-full relative z-10" />

      {/* 底部军事 HUD 战术态势信息与坐标标尺条 */}
      <footer className="absolute bottom-2 left-3 right-3 h-8 bg-neutral-900/90 backdrop-blur border border-neutral-800 rounded flex items-center justify-between px-3 text-[11px] font-mono text-neutral-300 pointer-events-none select-none z-30">
        <div className="flex items-center gap-4">
          {/* 在线交互地图刚性联动提示 */}
          {tacticalState.mapConfig.preset === 'online_map_plugin' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-sans text-[11px] font-medium">
              <span>🗺️ 底图与战术标绘严格同步平移</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">坐标格网:</span>
            <span className="text-sky-400 font-bold">{mgrsCode}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-neutral-400">测绘高程:</span>
            <span className="text-emerald-400">{elevation}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-neutral-400">坐标:</span>
            <span>
              X: {Math.round(hoverWorldPos.x)} Y: {Math.round(hoverWorldPos.y)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">缩放比:</span>
            <span className="text-amber-400 font-bold">{Math.round(transform.scale * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400">基准比例尺:</span>
            <span className="text-neutral-200">1:25,000</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-800">
            <div className="w-16 h-1.5 bg-neutral-700 relative">
              <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-sky-400" />
            </div>
            <span className="text-[10px] text-neutral-400">1.0 KM</span>
          </div>
        </div>
      </footer>

      {/* 绘图状态提示 */}
      {drawingPoints.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral-900/95 border border-sky-500/50 rounded-full text-xs text-sky-300 flex items-center gap-2 shadow-lg backdrop-blur pointer-events-none animate-pulse z-30">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>正在标绘 (已标 {drawingPoints.length} 个控制点)，双击或右键完成闭合</span>
        </div>
      )}
    </div>
  );
};
