import React, { useState } from 'react';
import {
  CollabStaff,
  StaffRole,
  TacticalLogMessage,
} from '../types/tactical';
import {
  X,
  Users,
  Send,
  MessageSquare,
  Shield,
  Radio,
  Copy,
  Check,
} from 'lucide-react';

interface CollabSyncPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaff: CollabStaff;
  onUpdateStaff: (staff: CollabStaff) => void;
  onlineStaffs: CollabStaff[];
  logMessages: TacticalLogMessage[];
  onSendOrder: (text: string, type: 'order' | 'intel' | 'strike') => void;
  onTriggerLaserPing: () => void;
}

const ROLE_CONFIG: Record<
  StaffRole,
  { label: string; color: string; badgeClass: string; desc: string }
> = {
  commander: {
    label: '作战指挥长',
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    desc: '全权决策、下达总体作战意图与推演阶段转换命令',
  },
  operations: {
    label: '作战参谋',
    color: '#38bdf8',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    desc: '标绘地面进攻与迂回穿插箭头、部署装甲机步部队',
  },
  firepower: {
    label: '火力协同参谋',
    color: '#ef4444',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    desc: '标绘炮火覆盖圈、远火压制区与空袭近距离支援',
  },
  intelligence: {
    label: '侦察情报参谋',
    color: '#22c55e',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    desc: '标绘敌方设防阵地、地下工事与电磁干扰走廊',
  },
};

export const CollabSyncPanel: React.FC<CollabSyncPanelProps> = ({
  isOpen,
  onClose,
  currentStaff,
  onUpdateStaff,
  onlineStaffs,
  logMessages,
  onSendOrder,
  onTriggerLaserPing,
}) => {
  const [inputText, setInputText] = useState('');
  const [orderType, setOrderType] = useState<'order' | 'intel' | 'strike'>('order');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendOrder(inputText.trim(), orderType);
    setInputText('');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-neutral-200">
        {/* 顶部标题 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-100">
                  多端实时同步协同席位
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  信道在线 (0ms 延迟同步)
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                支持指挥长与作战、火力、情报参谋多端实时标绘互见、协同复盘与指令交互
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

        {/* 主体两栏 */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800 text-xs">
          {/* 左侧：我的席位设置与在线参谋 */}
          <div className="p-4 space-y-4">
            {/* 我的参谋席位 */}
            <div className="bg-neutral-950/60 p-3.5 rounded-lg border border-neutral-800">
              <h4 className="font-semibold text-neutral-200 text-xs mb-3 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-sky-400" />
                当前操作参谋席位
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-neutral-400 block mb-1">参谋代号 / 姓名</label>
                  <input
                    type="text"
                    value={currentStaff.name}
                    onChange={(e) => onUpdateStaff({ ...currentStaff, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">参谋专业职能分工</label>
                  <div className="space-y-1.5">
                    {(Object.keys(ROLE_CONFIG) as StaffRole[]).map((role) => {
                      const r = ROLE_CONFIG[role];
                      const isSel = currentStaff.role === role;
                      return (
                        <div
                          key={role}
                          onClick={() =>
                            onUpdateStaff({
                              ...currentStaff,
                              role,
                              color: r.color,
                            })
                          }
                          className={`p-2 rounded border cursor-pointer transition-all ${
                            isSel
                              ? 'border-sky-500 bg-sky-500/10 text-white'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="font-medium flex items-center justify-between">
                            <span style={{ color: r.color }}>{r.label}</span>
                            {isSel && <span className="text-[10px] text-sky-400">当前</span>}
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{r.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 在线协同参谋席位列表 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-neutral-200 text-xs flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  已接入在线席位 ({onlineStaffs.length})
                </span>
                <button
                  onClick={handleCopyLink}
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? '已复制邀请' : '复制推演链接'}
                </button>
              </div>

              <div className="space-y-1.5">
                {onlineStaffs.map((staff) => {
                  const r = ROLE_CONFIG[staff.role] || ROLE_CONFIG.operations;
                  return (
                    <div
                      key={staff.id}
                      className="p-2 rounded bg-neutral-950/40 border border-neutral-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: staff.color }}
                        />
                        <span className="font-medium text-neutral-200">{staff.name}</span>
                        {staff.id === currentStaff.id && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                            (本机)
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${r.badgeClass}`}>
                        {r.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 快速广播协同激光笔 */}
            <button
              onClick={onTriggerLaserPing}
              className="w-full py-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Radio className="w-3.5 h-3.5" />
              向全体协同大屏广播当前焦点位置
            </button>
          </div>

          {/* 右侧：实时作战协同指令简报流 (Tactical Command Log) */}
          <div className="p-4 md:col-span-2 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h4 className="font-semibold text-neutral-200 text-xs">
                  推演态势通报与参谋作战简令记录
                </h4>
              </div>
              <span className="text-[10px] text-neutral-400">
                支持同步下达口令、破障通报与打击指令
              </span>
            </div>

            {/* 消息滚动流 */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {logMessages.map((msg) => {
                const r = ROLE_CONFIG[msg.role] || ROLE_CONFIG.operations;
                return (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded bg-neutral-950/70 border border-neutral-800/80 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${r.badgeClass}`}>
                          {r.label}
                        </span>
                        <span className="font-semibold text-neutral-200">{msg.staffName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">{msg.timestamp}</span>
                    </div>
                    <p className="text-neutral-300 text-xs pl-1 leading-relaxed">{msg.text}</p>
                  </div>
                );
              })}
            </div>

            {/* 输入发送栏 */}
            <form onSubmit={handleSend} className="mt-3 pt-3 border-t border-neutral-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 text-[11px]">指令类别:</span>
                {(['order', 'intel', 'strike'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1 cursor-pointer text-[11px]">
                    <input
                      type="radio"
                      name="orderType"
                      checked={orderType === t}
                      onChange={() => setOrderType(t)}
                      className="accent-sky-500"
                    />
                    <span className="text-neutral-300">
                      {t === 'order' ? '作战命令' : t === 'intel' ? '侦察敌情' : '火力打击协调'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="输入态势通报或战术指令，如：各机步连注意，左翼隘口发现敌伏击哨，炮兵团实施两发试射覆盖！"
                  className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-neutral-100 placeholder:text-neutral-400 text-xs focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  通报全员
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
