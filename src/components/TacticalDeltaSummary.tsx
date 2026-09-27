import React from 'react';
import {
  TacticalLayer,
  TacticalElement,
  UnitElement,
  ArrowElement,
} from '../types/tactical';
import {
  FACTION_CONFIG,
  BRANCH_CONFIG,
  ECHELON_CONFIG,
  STATUS_CONFIG,
} from '../utils/militarySymbols';
import {
  BarChart3,
  TrendingUp,
  Shield,
  ArrowRight,
  Crosshair,
  CheckCircle2,
  X,
  Copy,
  Check,
  Compass,
} from 'lucide-react';

interface TacticalDeltaSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  layerA: TacticalLayer;
  layerB: TacticalLayer;
  elements: TacticalElement[];
  onFocusUnit?: (x: number, y: number) => void;
}

export const TacticalDeltaSummary: React.FC<TacticalDeltaSummaryProps> = ({
  isOpen,
  onClose,
  layerA,
  layerB,
  elements,
  onFocusUnit,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const elementsA = elements.filter((el) => el.layerId === layerA.id);
  const elementsB = elements.filter((el) => el.layerId === layerB.id);

  const unitsA = elementsA.filter((el): el is UnitElement => el.type === 'unit');
  const unitsB = elementsB.filter((el): el is UnitElement => el.type === 'unit');

  const arrowsA = elementsA.filter((el): el is ArrowElement => el.type === 'arrow');
  const arrowsB = elementsB.filter((el): el is ArrowElement => el.type === 'arrow');

  // 计算综合战力指数
  const totalPowerA = unitsA.reduce((sum, u) => sum + (u.combatPower || 80), 0);
  const totalPowerB = unitsB.reduce((sum, u) => sum + (u.combatPower || 80), 0);
  const powerDelta = totalPowerB - totalPowerA;

  // 匹配两阶段机动部队 (按部队番号或呼号匹配)
  const movedUnits: {
    unitA: UnitElement;
    unitB: UnitElement;
    distPixels: number;
    distKm: number;
  }[] = [];

  const matchedBIds = new Set<string>();

  for (const uA of unitsA) {
    // 匹配算法：优先通过 ID 或完全同名/同呼号
    const match = unitsB.find(
      (uB) =>
        uB.name === uA.name ||
        (uA.callsign && uB.callsign === uA.callsign) ||
        (uA.branch === uB.branch && uA.echelon === uB.echelon && uA.faction === uB.faction)
    );

    if (match) {
      matchedBIds.add(match.id);
      const dx = match.x - uA.x;
      const dy = match.y - uA.y;
      const distPixels = Math.round(Math.hypot(dx, dy));
      // 比例尺估算：1像素约 15米 -> 0.015km
      const distKm = parseFloat(((distPixels * 15) / 1000).toFixed(2));
      movedUnits.push({
        unitA: uA,
        unitB: match,
        distPixels,
        distKm,
      });
    }
  }

  // B阶段新增生力军
  const newUnitsInB = unitsB.filter((uB) => !matchedBIds.has(uB.id));
  // A阶段后续转入后方/撤出单位
  const withdrawnInA = unitsA.filter(
    (uA) => !movedUnits.some((m) => m.unitA.id === uA.id)
  );

  const handleCopyReport = () => {
    const text = `【战策沙盘·战术阶段态势对比报告】
基准阶段：${layerA.phaseCode} - ${layerA.name} (${unitsA.length}支部队 / ${arrowsA.length}条攻防轴线)
对比阶段：${layerB.phaseCode} - ${layerB.name} (${unitsB.length}支部队 / ${arrowsB.length}条攻防轴线)
战力对比：${totalPowerA} -> ${totalPowerB} (${powerDelta >= 0 ? `+${powerDelta}` : powerDelta})
机动部队数量：${movedUnits.length} 支部队发生产业机动部署
新增部署部队：${newUnitsInB.map((u) => u.name).join('、') || '无'}
撤收/防线调整：${withdrawnInA.map((u) => u.name).join('、') || '无'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-18 right-4 bottom-14 w-[420px] max-w-[90vw] bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl z-40 flex flex-col overflow-hidden text-neutral-200 select-none animate-in fade-in slide-in-from-right-4 duration-250">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/70">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm text-neutral-100">
            阶段态势演化与差异量化分析
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyReport}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer flex items-center gap-1 text-[11px]"
            title="复制对比报告文字"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 两阶段对照徽标 */}
      <div className="px-4 py-2.5 bg-neutral-950/40 border-b border-neutral-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layerA.color }} />
          <span className="font-semibold text-sky-400">{layerA.phaseCode}</span>
          <span className="text-neutral-400 truncate max-w-[120px]">{layerA.name}</span>
        </div>

        <ArrowRight className="w-4 h-4 text-neutral-500" />

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layerB.color }} />
          <span className="font-semibold text-amber-400">{layerB.phaseCode}</span>
          <span className="text-neutral-400 truncate max-w-[120px]">{layerB.name}</span>
        </div>
      </div>

      {/* 滚动内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. 核心指标差异卡片 */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="text-[11px] text-neutral-400 mb-0.5">参演部队</div>
            <div className="font-mono text-base font-bold text-neutral-100 flex items-center justify-center gap-1">
              <span>{unitsA.length}</span>
              <span className="text-neutral-500 text-xs">➔</span>
              <span className="text-sky-400">{unitsB.length}</span>
            </div>
            <div
              className={`text-[10px] font-mono mt-0.5 ${
                unitsB.length >= unitsA.length ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {unitsB.length - unitsA.length >= 0
                ? `+${unitsB.length - unitsA.length} 部队`
                : `${unitsB.length - unitsA.length} 部队`}
            </div>
          </div>

          <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="text-[11px] text-neutral-400 mb-0.5">攻防轴线</div>
            <div className="font-mono text-base font-bold text-neutral-100 flex items-center justify-center gap-1">
              <span>{arrowsA.length}</span>
              <span className="text-neutral-500 text-xs">➔</span>
              <span className="text-amber-400">{arrowsB.length}</span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
              主攻/阻击箭头
            </div>
          </div>

          <div className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-lg">
            <div className="text-[11px] text-neutral-400 mb-0.5">综合战力</div>
            <div className="font-mono text-base font-bold text-neutral-100 flex items-center justify-center gap-1">
              <span>{totalPowerA}</span>
              <span className="text-neutral-500 text-xs">➔</span>
              <span className="text-emerald-400">{totalPowerB}</span>
            </div>
            <div
              className={`text-[10px] font-mono mt-0.5 ${
                powerDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {powerDelta >= 0 ? `+${powerDelta} 战力` : `${powerDelta} 战力`}
            </div>
          </div>
        </div>

        {/* 2. 部队空间机动位移表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-neutral-200 text-xs flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>部队空间机动转移 ({movedUnits.length}支)</span>
            </h4>
            <span className="text-[10px] text-neutral-400 font-mono">点击定位</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {movedUnits.length === 0 ? (
              <div className="p-3 bg-neutral-950/40 rounded border border-neutral-800 text-center text-neutral-500 text-xs">
                两阶段间未检测到相同番号部队的空间位置变动
              </div>
            ) : (
              movedUnits.map((item, idx) => {
                const fac = FACTION_CONFIG[item.unitB.faction];
                const ech = ECHELON_CONFIG[item.unitB.echelon];
                const br = BRANCH_CONFIG[item.unitB.branch];
                const statA = STATUS_CONFIG[item.unitA.status];
                const statB = STATUS_CONFIG[item.unitB.status];

                return (
                  <div
                    key={idx}
                    onClick={() => onFocusUnit && onFocusUnit(item.unitB.x, item.unitB.y)}
                    className="p-2 rounded-lg bg-neutral-950/60 border border-neutral-800 hover:border-sky-500/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border flex items-center justify-center font-bold font-mono text-[10px]"
                        style={{
                          borderColor: fac.stroke,
                          backgroundColor: fac.fill,
                          color: fac.stroke,
                        }}
                      >
                        {ech.symbol}
                      </div>

                      <div>
                        <div className="font-semibold text-neutral-200 flex items-center gap-1.5">
                          <span>{item.unitB.name}</span>
                          <span className="text-[10px] text-neutral-400">({br.label})</span>
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <span>{statA.label}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-neutral-500" />
                          <span className="text-amber-300">{statB.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-cyan-400">
                        {item.distKm > 0 ? `+${item.distKm} km` : '原地坚守'}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {item.distPixels > 0 ? `${item.distPixels} px` : '无位移'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. 新增展开投入之生力军 */}
        {newUnitsInB.length > 0 && (
          <div>
            <h4 className="font-semibold text-emerald-400 text-xs mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>对比阶段新增部署生力军 ({newUnitsInB.length}支)</span>
            </h4>
            <div className="space-y-1">
              {newUnitsInB.map((u, i) => (
                <div
                  key={i}
                  onClick={() => onFocusUnit && onFocusUnit(u.x, u.y)}
                  className="p-1.5 rounded bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/50 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-neutral-200 font-medium">{u.name}</span>
                  <span className="text-[10px] font-mono text-emerald-300">
                    {u.strength || '全员齐装满员'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 战术攻防态势演进描述 */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg space-y-1.5">
          <div className="font-semibold text-neutral-300 text-xs flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>态势阶段演进分析评估</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            从【{layerA.phaseCode}】演进至【{layerB.phaseCode}】，参谋席位共部署调整了{' '}
            <span className="text-sky-300 font-semibold">{movedUnits.length}</span> 个重点战术单位，
            新增展开了 <span className="text-amber-300 font-semibold">{arrowsB.length}</span> 支主攻向心突击轴线。
            两阶段叠放对比有助于审定兵力梯次衔接与正面防线纵深防御效能。
          </p>
        </div>
      </div>
    </div>
  );
};
