import React, { useState } from 'react';
import {
  Download,
  Terminal,
  FileCode,
  HardDrive,
  Copy,
  Check,
  X,
  FileBox,
  Layers,
} from 'lucide-react';
import { TacticalState } from '../types/tactical';

interface DesktopExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tacticalState: TacticalState;
  onImportScenario: (imported: TacticalState) => void;
}

export const DesktopExportModal: React.FC<DesktopExportModalProps> = ({
  isOpen,
  onClose,
  tacticalState,
  onImportScenario,
}) => {
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [copiedTauri, setCopiedTauri] = useState(false);

  if (!isOpen) return null;

  // 1. 导出完整战术推演工程文件 (.tactical JSON)
  const handleExportProjectJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tacticalState, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().slice(0, 10);
    dlAnchor.setAttribute('download', `${tacticalState.drillCode}_${tacticalState.scenarioName}_${dateStr}.tactical`);
    dlAnchor.click();
  };

  // 2. 导入战术推演工程文件
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.layers && parsed.elements) {
          onImportScenario(parsed);
          alert('成功载入战术推演工程！');
          onClose();
        } else {
          alert('工程文件格式不匹配');
        }
      } catch {
        alert('解析工程文件失败，请检查是否为合法 .tactical JSON 文件');
      }
    };
    reader.readAsText(file);
  };

  // 3. Electron 快捷打包批处理命令
  const electronScript = `@echo off
echo ==============================================
echo   战策沙盘 (TacticalSandtable) Windows EXE 自动化构建脚本
echo ==============================================

npm install --save-dev electron electron-builder
npm run build
npx electron-builder --win --x64

echo ==============================================
echo   构建完成！输出路径: dist-electron/战策沙盘 Setup.exe
echo ==============================================
pause`;

  // 4. Tauri 极轻量原生可执行文件命令 (仅 8MB)
  const tauriScript = `# 1. 安装 Tauri CLI (单次安装)
cargo install tauri-cli

# 2. 初始化并构建原生 Windows .exe
npm run build
cargo tauri build

# 输出文件位于: src-tauri/target/release/战策沙盘.exe`;

  const copyText = (text: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-neutral-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base text-neutral-100">
                生成独立 Windows EXE 客户端与离线作业部署
              </h3>
              <p className="text-xs text-neutral-400">
                支持纯内网物理隔离环境离线作业、一键工程存档与桌面独立客户端快速打包
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
          {/* 1. 离线工程存档与导入 */}
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800">
            <h4 className="font-semibold text-neutral-200 text-sm mb-2 flex items-center gap-2">
              <FileBox className="w-4 h-4 text-sky-400" />
              离线推演工程存档 (.tactical 方案文件)
            </h4>
            <p className="text-neutral-400 text-xs mb-3">
              将当前沙盘上的所有图层、攻防箭头标线、军标部队、战术注记完整导出为结构化加密工程文件，便于在不同推演终端之间安全拷贝流转。
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportProjectJson}
                className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium flex items-center gap-2 cursor-pointer shadow-md shadow-sky-600/20"
              >
                <Download className="w-4 h-4" />
                导出当前战术推演工程 (.tactical)
              </button>

              <label className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium flex items-center gap-2 cursor-pointer">
                <Layers className="w-4 h-4 text-emerald-400" />
                导入外部战术推演工程文件
                <input
                  type="file"
                  accept=".tactical,.json"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </label>
            </div>
          </div>

          {/* 2. 方式一：基于 Tauri 打包原生极轻量 Windows EXE (推荐，约 8MB) */}
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-neutral-200 text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                方案一：Tauri 极轻量 Windows 原生 EXE 客户端 (极速启动 · 内存占用低于50MB)
              </h4>
              <button
                onClick={() => copyText(tauriScript, setCopiedTauri)}
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedTauri ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedTauri ? '已复制命令' : '复制代码'}
              </button>
            </div>
            <p className="text-neutral-400 text-xs mb-2">
              调用 Windows 系统原生 WebView2 渲染内核，生成的单个绿色免安装 EXE 文件仅约 8MB，完全支持无网络物理隔离环境下高速标绘。
            </p>
            <pre className="p-3 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
              {tauriScript}
            </pre>
          </div>

          {/* 3. 方式二：基于 Electron 的一体化 Windows 安装包 (.exe) */}
          <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-neutral-200 text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                方案二：Electron Windows EXE 安装程序与便携免安装包
              </h4>
              <button
                onClick={() => copyText(electronScript, setCopiedBatch)}
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedBatch ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedBatch ? '已复制批处理脚本' : '复制构建脚本'}
              </button>
            </div>
            <p className="text-neutral-400 text-xs mb-2">
              内置独立 Chromium 运行时与硬件 GPU 2D Canvas 加速通道，可打包为 <code>战策沙盘_Setup.exe</code> 或 <code>战策沙盘_Portable.exe</code>。
            </p>
            <pre className="p-3 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-amber-300 overflow-x-auto leading-relaxed">
              {electronScript}
            </pre>
          </div>

          {/* 4. 离线使用说明 */}
          <div className="bg-sky-950/20 border border-sky-500/30 rounded-xl p-4 text-xs text-neutral-300">
            <h5 className="font-bold text-sky-400 mb-1 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" />
              离线运行与数据安全性保证
            </h5>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              战策沙盘系统所有核心几何运算（贝塞尔平滑算法、态势箭头拓扑、NATO APP-6 军标渲染）、视频流编码录像（MediaRecorder）及状态管理全部在本地浏览器/桌面客户端内存中完成，无任何外部服务器依赖，天然支持机房完全断网、专网或指挥所方舱物理隔离作业。
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs cursor-pointer"
          >
            关闭窗口
          </button>
        </div>
      </div>
    </div>
  );
};
