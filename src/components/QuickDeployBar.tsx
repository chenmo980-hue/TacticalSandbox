import React from 'react';
import {
  UnitDeployTemplate,
  Faction,
  Branch,
  Echelon,
  UnitStatus,
} from '../types/tactical';
import {
  FACTION_CONFIG,
  BRANCH_CONFIG,
  ECHELON_CONFIG,
  STATUS_CONFIG,
} from '../utils/militarySymbols';
import { Shield, Sparkles, Check, Lock } from 'lucide-react';

interface QuickDeployBarProps {
  deployTemplate: UnitDeployTemplate;
  onUpdateTemplate: (template: UnitDeployTemplate) => void;
  onOpenSymbolLibrary: () => void;
  onFinishDeploy: () => void;
}

export const QuickDeployBar: React.FC<QuickDeployBarProps> = ({
  deployTemplate,
  onUpdateTemplate,
  onOpenSymbolLibrary,
  onFinishDeploy,
}) => {
  return (
    <div className="absolute top-2 left-3 right-3 z-30 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/90 rounded-xl shadow-2xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs select-none animate-in fade-in slide-in-from-top-2 duration-200">
      {/* 1. 左侧：当前连续部署状态提示与阵营选择 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/40 text-sky-400 font-bold font-mono text-[11px]">
          <Lock className="w-3.5 h-3.5 text-sky-400" />
          <span>连续部署锁定中</span>
        </div>

        {/* 阵营快捷切换 */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {(['blue', 'red', 'green', 'yellow'] as Faction[]).map((f) => {
            const cfg = FACTION_CONFIG[f];
            const isSel = deployTemplate.faction === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onUpdateTemplate({ ...deployTemplate, faction: f })}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSel
                    ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cfg.stroke }}
                />
                <span>{cfg.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* 编制级别快捷切换 */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {(['squad', 'platoon', 'company', 'battalion', 'regiment', 'brigade', 'division'] as Echelon[]).map((e) => {
            const cfg = ECHELON_CONFIG[e];
            const isSel = deployTemplate.echelon === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() => onUpdateTemplate({ ...deployTemplate, echelon: e })}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  isSel
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 中间：常用兵种与部队名称 */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={deployTemplate.branch}
          onChange={(e) =>
            onUpdateTemplate({ ...deployTemplate, branch: e.target.value as Branch })
          }
          className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500 text-xs"
        >
          {Object.entries(BRANCH_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              [{v.code}] {v.label}
            </option>
          ))}
        </select>

        {/* 部队番号与呼号 */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={deployTemplate.name}
            onChange={(e) => onUpdateTemplate({ ...deployTemplate, name: e.target.value })}
            placeholder="番号，如：装甲第1营"
            className="w-28 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-sky-500"
          />

          <input
            type="text"
            value={deployTemplate.callsign || ''}
            onChange={(e) => onUpdateTemplate({ ...deployTemplate, callsign: e.target.value })}
            placeholder="呼号，如：铁骑-01"
            className="w-24 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-sky-500 hidden sm:block"
          />

          <input
            type="text"
            value={deployTemplate.strength}
            onChange={(e) => onUpdateTemplate({ ...deployTemplate, strength: e.target.value })}
            placeholder="兵力，如：380人 / 31辆99A"
            className="w-32 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-sky-500"
          />

          {/* 行动战备态势 */}
          <select
            value={deployTemplate.status}
            onChange={(e) =>
              onUpdateTemplate({ ...deployTemplate, status: e.target.value as UnitStatus })
            }
            className="px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500 text-xs hidden lg:block"
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                ● {v.label}
              </option>
            ))}
          </select>
        </div>

        {/* 自动编号选项 */}
        <label className="flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer pl-1">
          <input
            type="checkbox"
            checked={deployTemplate.autoIncrement}
            onChange={(e) =>
              onUpdateTemplate({ ...deployTemplate, autoIncrement: e.target.checked })
            }
            className="accent-sky-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span>递增编号(#1,#2)</span>
        </label>
      </div>

      {/* 3. 右侧：军标库按钮与退出部署按键 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSymbolLibrary}
          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 flex items-center gap-1 text-xs cursor-pointer"
          title="选择作战预设军标或配置自定义图标"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>预设库</span>
        </button>

        <button
          onClick={onFinishDeploy}
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 text-xs cursor-pointer shadow-sm shadow-emerald-600/30"
          title="结束连续部署模式，返回选择编辑状态"
        >
          <Check className="w-3.5 h-3.5" />
          <span>完成部署 (Esc)</span>
        </button>
      </div>
    </div>
  );
};
