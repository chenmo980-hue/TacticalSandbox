import React from 'react';
import {
  MousePointer,
  Hand,
  TrendingUp,
  Shield,
  GitMerge,
  Share2,
  Crosshair,
  Pentagon,
  ShieldAlert,
  Undo2,
  Redo2,
  Trash2,
  Video,
  StopCircle,
  Camera,
  Layers,
  MapPin,
  FolderUp,
  Terminal,
  Download,
  Users,
  CheckCircle2,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { ArrowType } from '../types/tactical';

export type ActiveTool =
  | 'select'
  | 'pan'
  | { type: 'draw_arrow'; arrowType: ArrowType }
  | 'place_unit'
  | 'ping';

interface TacticalToolbarProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearConfirm: () => void;
  onResetScenario: () => void;
  onExportSnapshot: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onOpenLayers: () => void;
  onOpenMapSettings: () => void;
  onOpenCollab: () => void;
  onOpenDesktopExport: () => void;
  onOpenApiDoc: () => void;
  onOpenSymbolLibrary: () => void;
  activeLayerName: string;
  autoSaveStatus: 'saved' | 'saving';
  onToggleCompare?: () => void;
  isCompareActive?: boolean;
}

export const TacticalToolbar: React.FC<TacticalToolbarProps> = ({
  activeTool,
  setActiveTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearConfirm,
  onResetScenario,
  onExportSnapshot,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  onOpenLayers,
  onOpenMapSettings,
  onOpenCollab,
  onOpenDesktopExport,
  onOpenApiDoc,
  onOpenSymbolLibrary,
  activeLayerName,
  autoSaveStatus,
  onToggleCompare,
  isCompareActive = false,
}) => {
  const [showClearMenu, setShowClearMenu] = React.useState(false);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isToolActive = (t: string, arrowType?: ArrowType) => {
    if (typeof activeTool === 'string') return activeTool === t;
    if (activeTool.type === 'draw_arrow') return activeTool.arrowType === arrowType;
    return false;
  };

  return (
    <header className="h-14 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 flex items-center justify-between px-3 z-30 select-none">
      {/* 1. 左侧：标绘系统徽章与当前阶段 */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 font-black tracking-wider">
            战
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-neutral-100 font-sans">战策沙盘</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono">
                C2 态势演练
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <span>当前图层:</span>
              <button
                onClick={onOpenLayers}
                className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Layers className="w-3 h-3" />
                <span className="truncate max-w-[130px]">{activeLayerName}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 自动保存状态 */}
        <div className="hidden xl:flex items-center gap-1 text-[11px] text-neutral-400 pl-2 border-l border-neutral-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{autoSaveStatus === 'saved' ? '已自动保存' : '保存中...'}</span>
        </div>
      </div>

      {/* 2. 中间：战术标绘工具栏 */}
      <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
        <button
          title="选择与编辑标号 (V)"
          onClick={() => setActiveTool('select')}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('select')
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">选择</span>
        </button>

        <button
          title="拖拽漫游地图 (H / 空格拖拽)"
          onClick={() => setActiveTool('pan')}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('pan')
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">平移</span>
        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-0.5" />

        {/* 攻防态势箭头组 */}
        <button
          title="进攻主突箭头 (点击两点或多点形成贝塞尔宽体箭头)"
          onClick={() => setActiveTool({ type: 'draw_arrow', arrowType: 'assault' })}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('draw_arrow', 'assault')
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-sky-400 group-hover:text-white" />
          <span className="hidden md:inline">进攻箭头</span>
        </button>

        <button
          title="防御坚守阵地线 (带威胁抗击锯齿齿标)"
          onClick={() => setActiveTool({ type: 'draw_arrow', arrowType: 'defense_line' })}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('draw_arrow', 'defense_line')
              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">防御阵地</span>
        </button>

        <button
          title="钳形向心合围双箭头"
          onClick={() => setActiveTool({ type: 'draw_arrow', arrowType: 'pincer' })}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('draw_arrow', 'pincer')
              ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">钳形攻势</span>
        </button>

        <button
          title="穿插迂回/支援虚线箭头"
          onClick={() => setActiveTool({ type: 'draw_arrow', arrowType: 'support' })}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('draw_arrow', 'support')
              ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden xl:inline">穿插支援</span>
        </button>

        <button
          title="火力压制打击圈 (空袭/炮火覆盖区)"
          onClick={() => setActiveTool({ type: 'draw_arrow', arrowType: 'fire_strike' })}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('draw_arrow', 'fire_strike')
              ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden xl:inline">火力打击</span>
        </button>

        <button
          title="集结/设伏多边形地域"
          onClick={() => setActiveTool({ type: 'draw_arrow', arrowType: 'assembly_zone' })}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('draw_arrow', 'assembly_zone')
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Pentagon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline">集结地域</span>
        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-0.5" />

        {/* 部署兵力军标 */}
        <button
          title="部署军标部队 (点击沙盘快速部署)"
          onClick={() => setActiveTool('place_unit')}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-all ${
            isToolActive('place_unit')
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
          <span>部署兵力</span>
        </button>

        <button
          title="自定义军标库与图标配置"
          onClick={onOpenSymbolLibrary}
          className="px-2 py-1.5 rounded text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* 战术激光笔/重点标引 */}
        <button
          title="战术激光指示笔 (向全体参谋同步高亮指示)"
          onClick={() => setActiveTool('ping')}
          className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
            isToolActive('ping') ? 'bg-amber-500 text-white' : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* 3. 右侧：态势对比、推演录制、撤销重做、清屏、底图与导出控制 */}
      <div className="flex items-center gap-1.5">
        {/* 阶段态势叠放对比视图按键 */}
        {onToggleCompare && (
          <button
            onClick={onToggleCompare}
            title="阶段态势对比：选择两个图层叠放，通过透明度滑动条对比兵力部署与态势差异"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
              isCompareActive
                ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30 ring-1 ring-sky-300'
                : 'bg-neutral-800/90 text-sky-400 border-sky-500/40 hover:bg-sky-500/20 hover:text-sky-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">态势对比</span>
            {isCompareActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        )}

        {/* 实时推演录像控制 */}
        {isRecording ? (
          <button
            onClick={onStopRecording}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold animate-pulse shadow-md shadow-rose-600/30 cursor-pointer"
          >
            <StopCircle className="w-4 h-4" />
            <span>停止录制 ({formatTimer(recordingSeconds)})</span>
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            title="实时录制推演过程并导出录像视频文件 (.webm)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-rose-500/20 hover:text-rose-300 text-neutral-200 text-xs font-medium border border-neutral-700 hover:border-rose-500/40 cursor-pointer transition-all"
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">推演录像</span>
          </button>
        )}

        {/* 战术高清图导出 */}
        <button
          onClick={onExportSnapshot}
          title="保存为高清战术图片 (PNG)"
          className="p-1.5 rounded text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 cursor-pointer"
        >
          <Camera className="w-4 h-4 text-neutral-300" />
        </button>

        {/* 撤销 / 重做 */}
        <div className="flex items-center bg-neutral-950 rounded border border-neutral-800 p-0.5">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            title="撤销 (Ctrl+Z)"
            className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={!canRedo}
            onClick={onRedo}
            title="重做 (Ctrl+Y)"
            className="p-1 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 清屏菜单 */}
        <div className="relative">
          <button
            onClick={() => setShowClearMenu(!showClearMenu)}
            title="清屏与重置标绘"
            className="p-1.5 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {showClearMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => {
                  onClearConfirm();
                  setShowClearMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空当前图层标绘
              </button>
              <button
                onClick={() => {
                  onResetScenario();
                  setShowClearMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-neutral-300 hover:bg-neutral-800 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                重置为初始推演方案
              </button>
            </div>
          )}
        </div>

        {/* 底图与图层设置 */}
        <button
          onClick={onOpenMapSettings}
          title="更换作战底图 / 导入卫星图"
          className="p-1.5 rounded text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 cursor-pointer"
        >
          <FolderUp className="w-4 h-4 text-sky-400" />
        </button>

        {/* 多端同步协同 */}
        <button
          onClick={onOpenCollab}
          title="多端同步协作与席位管理"
          className="p-1.5 rounded text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 cursor-pointer"
        >
          <Users className="w-4 h-4 text-emerald-400" />
        </button>

        {/* 生成桌面EXE客户端 */}
        <button
          onClick={onOpenDesktopExport}
          title="生成 Windows EXE 桌面独立运行包"
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>导出EXE</span>
        </button>

        {/* API文档 */}
        <button
          onClick={onOpenApiDoc}
          title="查看API开发集成文档"
          className="p-1.5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
        >
          <Terminal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
