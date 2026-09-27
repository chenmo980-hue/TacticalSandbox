import React, { useState } from 'react';
import {
  Terminal,
  Code2,
  Layers,
  Video,
  Share2,
  Copy,
  Check,
  X,
  BookOpen,
} from 'lucide-react';

interface ApiDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocModal: React.FC<ApiDocModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'ws' | 'arrows' | 'recorder' | 'symbol'>(
    'schema'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-neutral-200">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-bold text-base text-neutral-100">
                战策沙盘系统 API 开发者集成指南与接口文档
              </h3>
              <p className="text-xs text-neutral-400">
                面向指挥指控(C2)系统、三维GIS平台、军事模拟器与协同复盘系统的数据集成规范
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

        {/* 导航标签栏 */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-neutral-800 bg-neutral-950/40 text-xs overflow-x-auto">
          {[
            { id: 'schema', label: '战术数据模型 (Tactical Schema)', icon: Code2 },
            { id: 'arrows', label: '攻防态势箭头算法 API', icon: Layers },
            { id: 'symbol', label: '军标体系与兵种拓展', icon: BookOpen },
            { id: 'ws', label: '多端实时协同通信协议', icon: Share2 },
            { id: 'recorder', label: '推演录像与无头视频导出', icon: Video },
          ].map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* 文档内容区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-neutral-300">
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-neutral-100 mb-1">
                  1. 战术沙盘状态顶层结构 (TacticalState)
                </h4>
                <p className="text-neutral-400 text-xs mb-2">
                  支持与军标态势 GIS 数据库标准 JSON / GeoJSON 无缝转换。
                </p>
                <CodeBlock
                  code={`interface TacticalState {
  version: "2.4.0";
  scenarioName: string;      // 演练方案名称，例如："联合突击与纵深破障演习"
  drillCode: string;         // 作战代号，例如："DRILL-ALPHA-2026"
  classification: string;    // 密级说明，例如："内部推演·作战密级"
  layers: TacticalLayer[];   // 多阶段分层数组 (Phase 0, 1, 2...)
  elements: TacticalElement[];// 兵力标符与攻防箭头数组
  activeLayerId: string;     // 当前选定编辑的阶段图层 ID
  mapConfig: TacticalMapConfig;// 底图类型、亮度和战术坐标网参数
  notes: string;             // 参谋长解说词与战术作战指引
  updatedAt: number;         // 纳秒级最新变更时间戳
}`}
                  copyKey="schema1"
                  onCopy={copyCode}
                  isCopied={copiedKey === 'schema1'}
                />
              </div>

              <div>
                <h4 className="font-bold text-sm text-neutral-100 mb-1">
                  2. 兵力标符数据结构 (UnitElement)
                </h4>
                <CodeBlock
                  code={`interface UnitElement {
  id: string;
  type: "unit";
  layerId: string;           // 绑定至具体演练阶段
  x: number;                 // 战术沙盘世界坐标 X (米/像素)
  y: number;                 // 战术沙盘世界坐标 Y (米/像素)
  faction: "blue" | "red" | "green" | "yellow"; // 友军/敌军/中立/未明
  echelon: "squad" | "platoon" | "company" | "battalion" | "regiment" | "brigade" | "division" | "corps";
  branch: "infantry" | "armor" | "mech_infantry" | "artillery" | "air_defense" | "aviation" | "recon" | "engineer" | "signals" | "specops" | "hq" | "drone";
  name: string;              // 部队战术番号，如："合成第1装甲旅"
  callsign: string;          // 电台呼号，如："铁骑-01"
  strength: string;          // 兵力装备明细，如："480人 / 42辆99A主战坦克"
  combatPower: number;       // 战斗力指数 (0 - 100%)
  status: "ready" | "marching" | "engaged" | "defending" | "assault" | "damaged" | "rest";
  scale?: number;            // 军标缩放倍率 (0.6 - 2.0)
}`}
                  copyKey="schema2"
                  onCopy={copyCode}
                  isCopied={copiedKey === 'schema2'}
                />
              </div>
            </div>
          )}

          {activeTab === 'arrows' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-neutral-100 mb-1">
                  攻防态势箭头几何拓扑与绘制调用算法
                </h4>
                <p className="text-neutral-400 text-xs mb-2">
                  战策沙盘内置专有的军标动态贝塞尔箭头拓扑算法，能够根据参谋指定的 2~N
                  个控制点，自动计算出具有渐变腰部、展开双翼和锐角矛头的立体战术箭头。
                </p>
                <CodeBlock
                  code={`import { drawAssaultArrow, drawDefenseLine, drawPincerArrow } from './arrowMath';

// 1. 进攻主突宽体箭头 (Assault Arrow)
drawAssaultArrow(
  ctx,
  points,        // [{x: 200, y: 300}, {x: 450, y: 350}, {x: 600, y: 200}]
  "#38bdf8",     // 战术颜色 (HEX / RGBA)
  10,            // 基础线宽 (px)
  0.9,           // 透明度 (0 - 1)
  "第二阶段主攻方向" // 战术意图徽标文字 (可选)
);

// 2. 正面防御抗击阻绝阵地线 (Defense Line)
drawDefenseLine(
  ctx,
  points,
  "#f43f5e",     // 红色防御标
  8,
  0.95,
  "红军前沿抗击主阵地"
);

// 3. 钳形向心突击双箭头 (Pincer Assault)
drawPincerArrow(
  ctx,
  [startPoint, controlPoint, targetPoint],
  "#f97316",
  8,
  0.95,
  "两翼向心分割合围"
);`}
                  copyKey="arrows1"
                  onCopy={copyCode}
                  isCopied={copiedKey === 'arrows1'}
                />
              </div>
            </div>
          )}

          {activeTab === 'symbol' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-neutral-100 mb-1">
                  APP-6 / 我军标符扩展接口
                </h4>
                <p className="text-neutral-400 text-xs mb-2">
                  支持通过挂载新的兵种代码与矢量渲染器扩充新型作战力量（例如：高超音速突防营、蜂群巡飞弹连）。
                </p>
                <CodeBlock
                  code={`// 注册自定义兵力兵种符号
export function registerCustomBranchSymbol(
  code: string,
  meta: { label: string; desc: string },
  renderFn: (ctx: CanvasRenderingContext2D, w: number, h: number, color: string) => void
) {
  // 注入全局战术军标注册表
  GLOBAL_BRANCH_REGISTRY[code] = { meta, render: renderFn };
}

// 示例：注册 "高超声速突防单位"
registerCustomBranchSymbol('hypersonic', { label: '高超突防', desc: '乘波体临近空间突防' }, (ctx, w, h, color) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, h * 0.2);
  ctx.lineTo(w * 0.4, 0);
  ctx.lineTo(-w * 0.4, -h * 0.2);
  ctx.stroke();
});`}
                  copyKey="symbol1"
                  onCopy={copyCode}
                  isCopied={copiedKey === 'symbol1'}
                />
              </div>
            </div>
          )}

          {activeTab === 'ws' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-neutral-100 mb-1">
                  多端同步 WebSocket / 广播总线通讯规范
                </h4>
                <p className="text-neutral-400 text-xs mb-2">
                  支持多名参谋在内网指挥车、作战指挥大屏、移动指挥手持终端之间毫秒级同步推演状态。
                </p>
                <CodeBlock
                  code={`// 协同通信事件格式
type CollabEvent =
  | { type: "STATE_SYNC"; state: TacticalState; senderId: string }
  | { type: "ELEMENT_ADD"; element: TacticalElement; senderId: string }
  | { type: "ELEMENT_UPDATE"; element: TacticalElement; senderId: string }
  | { type: "CURSOR_MOVE"; staff: CollabStaff }
  | { type: "TACTICAL_ORDER"; message: TacticalLogMessage }
  | { type: "PING"; x: number; y: number; label: string; staffName: string };

// 监听推演指令与态势变更
const channel = new BroadcastChannel('tactical_command_collab_bus');
channel.onmessage = (event) => {
  if (event.data.type === 'TACTICAL_ORDER') {
    playTacticalAudioCue();
    displayOrderBanner(event.data.message);
  }
};`}
                  copyKey="ws1"
                  onCopy={copyCode}
                  isCopied={copiedKey === 'ws1'}
                />
              </div>
            </div>
          )}

          {activeTab === 'recorder' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-neutral-100 mb-1">
                  推演实录与录像文件导出流水线 API
                </h4>
                <p className="text-neutral-400 text-xs mb-2">
                  基于 HTML5 Canvas.captureStream(30) 与 MediaRecorder API，直接将推演全程渲染流编码为高画质 .webm / .mp4 视频文件。
                </p>
                <CodeBlock
                  code={`import { TacticalRecorder, downloadRecordedVideo } from './recorder';

const recorder = new TacticalRecorder();

// 1. 开始录制
recorder.start(canvasElement, (secondsElapsed) => {
  console.log(\`推演录制中: \${secondsElapsed} 秒\`);
});

// 2. 结束录制并导出视频文件
const videoBlob = await recorder.stop();
downloadRecordedVideo(videoBlob, "第三阶段两翼合围战术推演");`}
                  copyKey="rec1"
                  onCopy={copyCode}
                  isCopied={copiedKey === 'rec1'}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs cursor-pointer"
          >
            返回推演沙盘
          </button>
        </div>
      </div>
    </div>
  );
};

const CodeBlock: React.FC<{
  code: string;
  copyKey: string;
  onCopy: (key: string, code: string) => void;
  isCopied: boolean;
}> = ({ code, copyKey, onCopy, isCopied }) => {
  return (
    <div className="relative group">
      <button
        onClick={() => onCopy(copyKey, code)}
        className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
      >
        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        <span>{isCopied ? '已复制' : '复制'}</span>
      </button>
      <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
};
