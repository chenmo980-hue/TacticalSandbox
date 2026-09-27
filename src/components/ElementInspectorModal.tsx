import React from 'react';
import {
  TacticalElement,
  UnitElement,
  ArrowElement,
  Faction,
  Branch,
  Echelon,
  UnitStatus,
  TacticalLayer,
} from '../types/tactical';
import {
  FACTION_CONFIG,
  BRANCH_CONFIG,
  ECHELON_CONFIG,
  STATUS_CONFIG,
} from '../utils/militarySymbols';
import { X, Trash2, Shield, Crosshair, TrendingUp, Layers } from 'lucide-react';

interface ElementInspectorModalProps {
  element: TacticalElement | null;
  layers: TacticalLayer[];
  onUpdate: (element: TacticalElement) => void;
  onDelete: (elementId: string) => void;
  onClose: () => void;
  onSetDeployTemplate?: (template: any) => void;
}

export const ElementInspectorModal: React.FC<ElementInspectorModalProps> = ({
  element,
  layers,
  onUpdate,
  onDelete,
  onClose,
  onSetDeployTemplate,
}) => {
  if (!element) return null;

  return (
    <div className="fixed bottom-12 right-4 w-96 max-h-[80vh] bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl z-40 flex flex-col overflow-hidden text-neutral-200">
      {/* 标题 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2">
          {element.type === 'unit' ? (
            <Shield className="w-4 h-4 text-sky-400" />
          ) : (
            <TrendingUp className="w-4 h-4 text-amber-400" />
          )}
          <h3 className="font-bold text-sm text-neutral-100">
            {element.type === 'unit' ? '军标部队属性配置' : '战术攻防标号属性'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(element.id)}
            title="删除标号"
            className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 所属阶段图层 */}
        <div>
          <label className="text-neutral-400 block mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            所属推演阶段 / 图层
          </label>
          <select
            value={element.layerId}
            onChange={(e) => onUpdate({ ...element, layerId: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.phaseCode} - {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* 1. 部队类型 (Unit) 属性表单 */}
        {element.type === 'unit' && (
          <UnitForm
            unit={element}
            onUpdate={onUpdate as (u: UnitElement) => void}
            onSetDeployTemplate={onSetDeployTemplate}
          />
        )}

        {/* 2. 战术箭头 (Arrow) 属性表单 */}
        {element.type === 'arrow' && (
          <ArrowForm arrow={element} onUpdate={onUpdate as (a: ArrowElement) => void} />
        )}
      </div>
    </div>
  );
};

// 部队属性子表单
const UnitForm: React.FC<{
  unit: UnitElement;
  onUpdate: (u: UnitElement) => void;
  onSetDeployTemplate?: (template: any) => void;
}> = ({ unit, onUpdate, onSetDeployTemplate }) => {
  return (
    <>
      {/* 阵营选择 */}
      <div>
        <label className="text-neutral-400 block mb-1">阵营归属 (Faction)</label>
        <div className="grid grid-cols-2 gap-2">
          {(['blue', 'red', 'green', 'yellow'] as Faction[]).map((f) => {
            const cfg = FACTION_CONFIG[f];
            const isSel = unit.faction === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onUpdate({ ...unit, faction: f })}
                className={`px-2.5 py-1.5 rounded border text-left flex items-center gap-2 cursor-pointer transition-all ${
                  isSel
                    ? 'border-sky-500 bg-sky-500/20 text-white font-medium'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.stroke }} />
                <span>{cfg.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 编制规模 (Echelon) */}
      <div>
        <label className="text-neutral-400 block mb-1">编制规模级别 (Echelon)</label>
        <select
          value={unit.echelon}
          onChange={(e) => onUpdate({ ...unit, echelon: e.target.value as Echelon })}
          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
        >
          {Object.entries(ECHELON_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              {v.symbol} - {v.label} (级别 {v.level})
            </option>
          ))}
        </select>
      </div>

      {/* 兵种选择 (Branch) */}
      <div>
        <label className="text-neutral-400 block mb-1">兵种专业 (Branch)</label>
        <select
          value={unit.branch}
          onChange={(e) => onUpdate({ ...unit, branch: e.target.value as Branch })}
          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
        >
          {Object.entries(BRANCH_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              [{v.code}] {v.label} - {v.desc}
            </option>
          ))}
        </select>
      </div>

      {/* 部队番号与呼号 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-neutral-400 block mb-1">部队战术番号</label>
          <input
            type="text"
            value={unit.name}
            onChange={(e) => onUpdate({ ...unit, name: e.target.value })}
            placeholder="如：合成第1旅装甲1营"
            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label className="text-neutral-400 block mb-1">无线电呼号</label>
          <input
            type="text"
            value={unit.callsign}
            onChange={(e) => onUpdate({ ...unit, callsign: e.target.value })}
            placeholder="如：铁骑-01"
            className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* 兵力装备明细 */}
      <div>
        <label className="text-neutral-400 block mb-1">兵力与主战装备明细</label>
        <input
          type="text"
          value={unit.strength}
          onChange={(e) => onUpdate({ ...unit, strength: e.target.value })}
          placeholder="如：420人 / 31辆99A主战坦克"
          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* 战备态势 (Status) */}
      <div>
        <label className="text-neutral-400 block mb-1">战备行动态势 (Tactical Status)</label>
        <select
          value={unit.status}
          onChange={(e) => onUpdate({ ...unit, status: e.target.value as UnitStatus })}
          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>
              ● {v.label}
            </option>
          ))}
        </select>
      </div>

      {/* 战斗力指数 */}
      <div>
        <div className="flex justify-between text-neutral-400 mb-1">
          <span>当前战斗力指数</span>
          <span className="font-mono text-sky-400 font-bold">{unit.combatPower}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={unit.combatPower}
          onChange={(e) => onUpdate({ ...unit, combatPower: parseInt(e.target.value) })}
          className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
        />
      </div>

      {/* 标符大小比例 */}
      <div>
        <div className="flex justify-between text-neutral-400 mb-1">
          <span>标符缩放倍率</span>
          <span className="font-mono text-neutral-300">{(unit.scale || 1).toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.6"
          max="2.0"
          step="0.1"
          value={unit.scale || 1}
          onChange={(e) => onUpdate({ ...unit, scale: parseFloat(e.target.value) })}
          className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
        />
      </div>

      {/* 设为部署模版按钮 */}
      {onSetDeployTemplate && (
        <button
          type="button"
          onClick={() => {
            onSetDeployTemplate({
              faction: unit.faction,
              branch: unit.branch,
              echelon: unit.echelon,
              name: unit.name,
              callsign: unit.callsign,
              strength: unit.strength,
              combatPower: unit.combatPower,
              status: unit.status,
              scale: unit.scale || 1,
              autoIncrement: false,
              counter: 1,
            });
          }}
          className="w-full mt-2 py-2 px-3 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          title="将当前配置同步为后续连续部署模版"
        >
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>🎯 锁定为此配置并连续部署同款 (不重置)</span>
        </button>
      )}
    </>
  );
};

// 战术箭头属性子表单
const ArrowForm: React.FC<{
  arrow: ArrowElement;
  onUpdate: (a: ArrowElement) => void;
}> = ({ arrow, onUpdate }) => {
  const PRESET_COLORS = [
    '#38bdf8', // 友军蓝
    '#f43f5e', // 敌军红
    '#f97316', // 橙黄突击
    '#eab308', // 火力打击金
    '#22c55e', // 集结绿
    '#a855f7', // 空降紫
    '#06b6d4', // 支援青
  ];

  return (
    <>
      {/* 战术说明文字 */}
      <div>
        <label className="text-neutral-400 block mb-1">战术意图标注文字</label>
        <input
          type="text"
          value={arrow.label || ''}
          onChange={(e) => onUpdate({ ...arrow, label: e.target.value })}
          placeholder="如：第二阶段主攻方向"
          className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* 颜色选择 */}
      <div>
        <label className="text-neutral-400 block mb-1">战术标线配色</label>
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdate({ ...arrow, color: c })}
              className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-transform ${
                arrow.color === c ? 'scale-110 border-white' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* 线宽与箭头体量 */}
      <div>
        <div className="flex justify-between text-neutral-400 mb-1">
          <span>箭头/标线宽度</span>
          <span className="font-mono text-neutral-300">{arrow.strokeWidth} px</span>
        </div>
        <input
          type="range"
          min="4"
          max="24"
          step="1"
          value={arrow.strokeWidth}
          onChange={(e) => onUpdate({ ...arrow, strokeWidth: parseInt(e.target.value) })}
          className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
        />
      </div>

      {/* 透明度 */}
      <div>
        <div className="flex justify-between text-neutral-400 mb-1">
          <span>标号不透明度</span>
          <span className="font-mono text-neutral-300">{Math.round(arrow.opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="1.0"
          step="0.05"
          value={arrow.opacity}
          onChange={(e) => onUpdate({ ...arrow, opacity: parseFloat(e.target.value) })}
          className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
        />
      </div>

      {/* 打击圈半径 */}
      {arrow.arrowType === 'fire_strike' && (
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>火力覆盖半径</span>
            <span className="font-mono text-rose-400 font-bold">{arrow.radius || 60} px</span>
          </div>
          <input
            type="range"
            min="30"
            max="200"
            step="5"
            value={arrow.radius || 60}
            onChange={(e) => onUpdate({ ...arrow, radius: parseInt(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
          />
        </div>
      )}
    </>
  );
};
