import React, { useState, useEffect } from 'react';
import {
  Faction,
  Branch,
  Echelon,
  UnitStatus,
  UnitDeployTemplate,
} from '../types/tactical';
import {
  FACTION_CONFIG,
  BRANCH_CONFIG,
  ECHELON_CONFIG,
  STATUS_CONFIG,
} from '../utils/militarySymbols';
import { X, Sparkles, Plus, Upload, Check } from 'lucide-react';

interface CustomSymbolModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplate?: UnitDeployTemplate;
  onSetDeployTemplate: (template: Partial<UnitDeployTemplate>) => void;
}

export const CustomSymbolModal: React.FC<CustomSymbolModalProps> = ({
  isOpen,
  onClose,
  currentTemplate,
  onSetDeployTemplate,
}) => {
  const [faction, setFaction] = useState<Faction>(currentTemplate?.faction || 'blue');
  const [branch, setBranch] = useState<Branch>(currentTemplate?.branch || 'armor');
  const [echelon, setEchelon] = useState<Echelon>(currentTemplate?.echelon || 'brigade');
  const [name, setName] = useState(currentTemplate?.name || '合成第1装甲旅');
  const [callsign, setCallsign] = useState(currentTemplate?.callsign || '铁骑-01');
  const [strength, setStrength] = useState(currentTemplate?.strength || '480人 / 42辆99A');
  const [combatPower, setCombatPower] = useState(currentTemplate?.combatPower ?? 95);
  const [status, setStatus] = useState<UnitStatus>(currentTemplate?.status || 'ready');
  const [customIconUrl, setCustomIconUrl] = useState<string | undefined>(currentTemplate?.customIconUrl);

  // 当打开弹窗或当前模版更新时，深度同步保持用户选中的选项，不重置回默认
  useEffect(() => {
    if (isOpen && currentTemplate) {
      setFaction(currentTemplate.faction);
      setBranch(currentTemplate.branch);
      setEchelon(currentTemplate.echelon);
      setName(currentTemplate.name);
      setCallsign(currentTemplate.callsign);
      setStrength(currentTemplate.strength);
      setCombatPower(currentTemplate.combatPower);
      setStatus(currentTemplate.status);
      setCustomIconUrl(currentTemplate.customIconUrl);
    }
  }, [isOpen, currentTemplate]);

  if (!isOpen) return null;

  // 经典战术编制预设
  const PRESET_UNITS = [
    {
      faction: 'blue' as Faction,
      branch: 'armor' as Branch,
      echelon: 'brigade' as Echelon,
      name: '第82集团军合成第1旅',
      callsign: '铁骑-首长',
      strength: '4200人 · 120辆主战坦克',
      combatPower: 98,
      status: 'ready' as UnitStatus,
    },
    {
      faction: 'blue' as Faction,
      branch: 'mech_infantry' as Branch,
      echelon: 'battalion' as Echelon,
      name: '装步第3装甲突击营',
      callsign: '尖刀-03',
      strength: '450人 · 36辆步战车',
      combatPower: 92,
      status: 'marching' as UnitStatus,
    },
    {
      faction: 'blue' as Faction,
      branch: 'artillery' as Branch,
      echelon: 'regiment' as Echelon,
      name: '远程箱式火箭炮兵团',
      callsign: '雷霆-09',
      strength: '24门370mm远程火炮',
      combatPower: 100,
      status: 'ready' as UnitStatus,
    },
    {
      faction: 'blue' as Faction,
      branch: 'aviation' as Branch,
      echelon: 'regiment' as Echelon,
      name: '陆航第2突击直升机团',
      callsign: '天隼-02',
      strength: '32架武装突击直升机',
      combatPower: 90,
      status: 'assault' as UnitStatus,
    },
    {
      faction: 'blue' as Faction,
      branch: 'drone' as Branch,
      echelon: 'battalion' as Echelon,
      name: '察打一体无人机特种大队',
      callsign: '幽灵-UAV',
      strength: '48套巡飞弹与蜂群系统',
      combatPower: 94,
      status: 'ready' as UnitStatus,
    },
    {
      faction: 'red' as Faction,
      branch: 'hq' as Branch,
      echelon: 'division' as Echelon,
      name: '敌第7机步师战术指控中心',
      callsign: '红隼-HQ',
      strength: '地下坑道设伏指挥部',
      combatPower: 88,
      status: 'defending' as UnitStatus,
    },
    {
      faction: 'red' as Faction,
      branch: 'air_defense' as Branch,
      echelon: 'regiment' as Echelon,
      name: '敌联合防空反导第4团',
      callsign: '天幕-04',
      strength: '8组地空导弹连 · 密集阵',
      combatPower: 85,
      status: 'defending' as UnitStatus,
    },
    {
      faction: 'red' as Faction,
      branch: 'infantry' as Branch,
      echelon: 'regiment' as Echelon,
      name: '敌坚守防御第14步兵团',
      callsign: '碉堡-14',
      strength: '800人 · 钢筋混凝土工事群',
      combatPower: 75,
      status: 'engaged' as UnitStatus,
    },
  ];

  const handleApplyPreset = (p: typeof PRESET_UNITS[0]) => {
    setFaction(p.faction);
    setBranch(p.branch);
    setEchelon(p.echelon);
    setName(p.name);
    setCallsign(p.callsign);
    setStrength(p.strength);
    setCombatPower(p.combatPower);
    setStatus(p.status);

    // 关键修复：点击选用即时将选定的兵力参数锁定为当前部署模版，并进入连续部署，绝对不重置为默认！
    onSetDeployTemplate({
      faction: p.faction,
      branch: p.branch,
      echelon: p.echelon,
      name: p.name,
      callsign: p.callsign,
      strength: p.strength,
      combatPower: p.combatPower,
      status: p.status,
      scale: 1,
      autoIncrement: false,
    });
    onClose();
  };

  const handleDeploy = () => {
    onSetDeployTemplate({
      faction,
      branch,
      echelon,
      name,
      callsign,
      strength,
      combatPower,
      status,
      customIconUrl,
      scale: 1,
      autoIncrement: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-neutral-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-neutral-100">
                战术军标库与兵力模版配置
              </h3>
              <p className="text-xs text-neutral-400">
                配置您要部署的兵种、阵营、编制规模与番号，保存后在沙盘上将保持该配置连续部署
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* 左侧：快捷军标部队预设库 */}
          <div>
            <h4 className="font-semibold text-neutral-200 text-sm mb-3">
              作战预设军标库 (点击快速填入)
            </h4>
            <div className="space-y-2">
              {PRESET_UNITS.map((p, idx) => {
                const fac = FACTION_CONFIG[p.faction];
                const ech = ECHELON_CONFIG[p.echelon];
                const br = BRANCH_CONFIG[p.branch];

                return (
                  <div
                    key={idx}
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded border flex items-center justify-center font-bold font-mono text-xs"
                        style={{
                          borderColor: fac.stroke,
                          backgroundColor: fac.fill,
                          color: fac.stroke,
                        }}
                      >
                        {ech.symbol}
                      </div>
                      <div>
                        <div className="font-medium text-neutral-100 text-xs flex items-center gap-1.5">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-neutral-400">({br.label})</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{p.strength}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-neutral-800 group-hover:bg-sky-600 group-hover:text-white text-[11px] text-neutral-300 transition-colors"
                    >
                      选用
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧：自定义军标生成器 */}
          <div className="space-y-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
            <h4 className="font-semibold text-neutral-200 text-sm">自定义兵力参数</h4>

            {/* 阵营选择 */}
            <div>
              <label className="text-neutral-400 block mb-1">阵营归属</label>
              <div className="grid grid-cols-2 gap-2">
                {(['blue', 'red', 'green', 'yellow'] as Faction[]).map((f) => {
                  const cfg = FACTION_CONFIG[f];
                  const isSel = faction === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFaction(f)}
                      className={`px-2.5 py-1.5 rounded border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        isSel
                          ? 'border-sky-500 bg-sky-500/20 text-white font-medium'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
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
            </div>

            {/* 编制级别 */}
            <div>
              <label className="text-neutral-400 block mb-1">编制规模级别</label>
              <select
                value={echelon}
                onChange={(e) => setEchelon(e.target.value as Echelon)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
              >
                {Object.entries(ECHELON_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.symbol} - {v.label} (级别 {v.level})
                  </option>
                ))}
              </select>
            </div>

            {/* 兵种专业 */}
            <div>
              <label className="text-neutral-400 block mb-1">兵种专业类别</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value as Branch)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
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
                <label className="text-neutral-400 block mb-1">战术番号</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">无线电呼号</label>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* 兵力装备 */}
            <div>
              <label className="text-neutral-400 block mb-1">兵力规模与主战装备明细</label>
              <input
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* 战备行动状态 */}
            <div>
              <label className="text-neutral-400 block mb-1">行动战备态势</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UnitStatus)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    ● {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/70 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleDeploy}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20"
          >
            <Check className="w-4 h-4" />
            保存此配置并进入连续部署 (保持选中不重置)
          </button>
        </div>
      </div>
    </div>
  );
};
