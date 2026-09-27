import React, { useEffect, useState } from 'react';
import {
  TacticalLayer,
  TacticalCompareConfig,
} from '../types/tactical';
import {
  ArrowLeftRight,
  Sliders,
  SplitSquareVertical,
  Activity,
  Layers,
  X,
  Compass,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface TacticalCompareBarProps {
  layers: TacticalLayer[];
  compareConfig: TacticalCompareConfig;
  onChangeConfig: (newConfig: TacticalCompareConfig) => void;
  onExitCompare: () => void;
  elementCountA: number;
  elementCountB: number;
}

export const TacticalCompareBar: React.FC<TacticalCompareBarProps> = ({
  layers,
  compareConfig,
  onChangeConfig,
  onExitCompare,
  elementCountA,
  elementCountB,
}) => {
  const layerA = layers.find((l) => l.id === compareConfig.layerAId) || layers[0];
  const layerB =
    layers.find((l) => l.id === compareConfig.layerBId) ||
    layers[Math.min(1, layers.length - 1)];

  // 闪烁模式计时器
  const [blinkPhase, setBlinkPhase] = useState<'A' | 'B'>('A');

  useEffect(() => {
    if (compareConfig.mode !== 'blink') return;
    const timer = setInterval(() => {
      setBlinkPhase((prev) => (prev === 'A' ? 'B' : 'A'));
    }, 850);
    return () => clearInterval(timer);
  }, [compareConfig.mode]);

  // 快速交换 A / B 角色
  const handleSwap = () => {
    onChangeConfig({
      ...compareConfig,
      layerAId: compareConfig.layerBId,
      layerBId: compareConfig.layerAId,
      sliderValue: 100 - compareConfig.sliderValue,
    });
  };

  // 计算当前透明度标签
  const opacityA =
    compareConfig.mode === 'curtain'
      ? `${100 - compareConfig.sliderValue}% 屏宽`
      : compareConfig.blendStyle === 'overlay'
      ? '基准 (100%)'
      : `${Math.round(100 - compareConfig.sliderValue)}%`;

  const opacityB =
    compareConfig.mode === 'curtain'
      ? `${compareConfig.sliderValue}% 屏宽`
      : `${Math.round(compareConfig.sliderValue)}%`;

  return (
    <div className="absolute top-2.5 left-4 right-4 z-40 bg-neutral-900/95 backdrop-blur-md border border-sky-500/40 rounded-xl shadow-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs select-none animate-in fade-in slide-in-from-top-3 duration-250 ring-1 ring-sky-500/20">
      {/* 1. 左侧：对比模式徽标与图层选择器 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/40 text-sky-400 font-bold font-mono">
          <Layers className="w-4 h-4 text-sky-400" />
          <span>态势阶段对比</span>
        </div>

        {/* 图层 A 选择器 */}
        <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layerA?.color || '#38bdf8' }} />
          <span className="text-neutral-400 font-medium">基准A:</span>
          <select
            value={compareConfig.layerAId}
            onChange={(e) =>
              onChangeConfig({ ...compareConfig, layerAId: e.target.value })
            }
            className="bg-transparent text-neutral-200 font-semibold focus:outline-none cursor-pointer text-xs"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id} className="bg-neutral-900 text-neutral-200">
                {l.phaseCode} - {l.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
            {elementCountA}标号
          </span>
        </div>

        {/* 交换按键 */}
        <button
          type="button"
          onClick={handleSwap}
          className="p-1 rounded bg-neutral-800 hover:bg-sky-600 text-neutral-300 hover:text-white transition-all cursor-pointer border border-neutral-700 hover:border-sky-500"
          title="互换对比基准 A 与对比阶段 B"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        {/* 图层 B 选择器 */}
        <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layerB?.color || '#f97316' }} />
          <span className="text-neutral-400 font-medium">对比B:</span>
          <select
            value={compareConfig.layerBId}
            onChange={(e) =>
              onChangeConfig({ ...compareConfig, layerBId: e.target.value })
            }
            className="bg-transparent text-neutral-200 font-semibold focus:outline-none cursor-pointer text-xs"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id} className="bg-neutral-900 text-neutral-200">
                {l.phaseCode} - {l.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
            {elementCountB}标号
          </span>
        </div>
      </div>

      {/* 2. 中间：对比模式切换与滑动条 */}
      <div className="flex items-center gap-3 flex-1 max-w-xl mx-2">
        {/* 对比模式切换 */}
        <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          <button
            type="button"
            onClick={() => onChangeConfig({ ...compareConfig, mode: 'crossfade' })}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              compareConfig.mode === 'crossfade'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="通过透明度滑动条连续平滑叠放两个战术阶段"
          >
            <Sliders className="w-3 h-3" />
            <span>叠放对比</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig({ ...compareConfig, mode: 'curtain' })}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              compareConfig.mode === 'curtain'
                ? 'bg-sky-600 text-white shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="左右分屏卷帘对比：滑动分界线对比两侧态势"
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>卷帘分屏</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeConfig({ ...compareConfig, mode: 'blink' })}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
              compareConfig.mode === 'blink'
                ? 'bg-amber-500 text-neutral-950 shadow-sm font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="A/B 阶段定时交替闪烁，利用人眼视觉暂留瞬间捕获兵力机动差异"
          >
            <Activity className="w-3 h-3" />
            <span>交替闪烁</span>
          </button>
        </div>

        {/* 核心滑动控制条 */}
        {compareConfig.mode !== 'blink' ? (
          <div className="flex items-center gap-2 flex-1">
            <span
              className="text-[11px] font-mono cursor-pointer hover:underline text-sky-400 font-bold whitespace-nowrap"
              onClick={() => onChangeConfig({ ...compareConfig, sliderValue: 0 })}
              title="一键切到 100% 阶段A"
            >
              A ({opacityA})
            </span>

            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                value={compareConfig.sliderValue}
                onChange={(e) =>
                  onChangeConfig({ ...compareConfig, sliderValue: parseInt(e.target.value) })
                }
                className="w-full accent-sky-400 h-2 bg-neutral-950 border border-neutral-700 rounded-lg cursor-pointer transition-all"
              />
              {/* 50% 居中叠放对齐点 */}
              <div
                className="absolute left-1/2 -top-1 w-1.5 h-4 bg-sky-500/50 rounded pointer-events-none -translate-x-1/2"
                title="50% 居中叠放"
              />
            </div>

            <span
              className="text-[11px] font-mono cursor-pointer hover:underline text-amber-400 font-bold whitespace-nowrap"
              onClick={() => onChangeConfig({ ...compareConfig, sliderValue: 100 })}
              title="一键切到 100% 阶段B"
            >
              B ({opacityB})
            </span>

            {/* 快速 50/50 透视叠放按键 */}
            <button
              type="button"
              onClick={() => onChangeConfig({ ...compareConfig, sliderValue: 50 })}
              className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-all ${
                compareConfig.sliderValue === 50
                  ? 'bg-sky-500 text-white border-sky-400'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
              }`}
              title="将透明度设为 50/50 叠放对齐"
            >
              50/50 叠合
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 justify-center bg-neutral-950/80 px-3 py-1 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400">当前闪烁显示:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-all ${
                blinkPhase === 'A'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              {blinkPhase === 'A' ? `[A] ${layerA?.name}` : `[B] ${layerB?.name}`}
            </span>
          </div>
        )}
      </div>

      {/* 3. 右侧：机动轨迹开关、态势差异面板切换与退出 */}
      <div className="flex items-center gap-2">
        {/* 机动位移轨迹开关 */}
        <button
          type="button"
          onClick={() =>
            onChangeConfig({ ...compareConfig, showTrajectories: !compareConfig.showTrajectories })
          }
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium border cursor-pointer transition-all ${
            compareConfig.showTrajectories
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
              : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-neutral-200'
          }`}
          title="自动识别同番号部队在两阶段间的空间位移，并在沙盘上绘制战术机动箭头"
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden md:inline">机动轨迹</span>
        </button>

        {/* 差异量化分析 */}
        <button
          type="button"
          onClick={() =>
            onChangeConfig({ ...compareConfig, showDeltaSummary: !compareConfig.showDeltaSummary })
          }
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium border cursor-pointer transition-all ${
            compareConfig.showDeltaSummary
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/20'
              : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-neutral-200'
          }`}
          title="展开两阶段兵力增减、战备态势与战力对比报告"
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">差异分析</span>
        </button>

        {/* 退出对比视图 */}
        <button
          type="button"
          onClick={onExitCompare}
          className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 flex items-center gap-1 text-xs cursor-pointer font-medium transition-all"
          title="退出阶段态势对比，返回常规沙盘推演"
        >
          <X className="w-3.5 h-3.5 text-neutral-400" />
          <span>退出 (Esc)</span>
        </button>
      </div>
    </div>
  );
};
