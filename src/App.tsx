import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TacticalState,
  TacticalElement,
  UnitDeployTemplate,
  CollabStaff,
  TacticalLogMessage,
} from './types/tactical';
import { DEFAULT_TACTICAL_STATE } from './utils/initialScenario';
import { TacticalCanvas } from './components/TacticalCanvas';
import { TacticalToolbar, ActiveTool } from './components/TacticalToolbar';
import { LayerManager } from './components/LayerManager';
import { ElementInspectorModal } from './components/ElementInspectorModal';
import { MapSettingsModal } from './components/MapSettingsModal';
import { CustomSymbolModal } from './components/CustomSymbolModal';
import { QuickDeployBar } from './components/QuickDeployBar';
import { CollabSyncPanel } from './components/CollabSyncPanel';
import { DesktopExportModal } from './components/DesktopExportModal';
import { ApiDocModal } from './components/ApiDocModal';
import {
  TacticalRecorder,
  downloadRecordedVideo,
  exportTacticalSnapshot,
} from './utils/recorder';
import { TacticalCollabManager } from './utils/collabSync';
import { loadSafeMapImage, parseMapInputUrl } from './utils/mapUrlParser';

export default function App() {
  // 1. 推演核心状态与自动保存恢复 (整合底图插件适配器与第三方地图持久化引擎)
  const [tacticalState, setTacticalState] = useState<TacticalState>(() => {
    let baseState = DEFAULT_TACTICAL_STATE;
    try {
      const saved = localStorage.getItem('tactical_sandtable_save_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.layers && parsed.elements) {
          baseState = parsed;
        }
      }
    } catch {
      // 降级使用初始推演
    }

    // 独立检查底图持久化存储，确保即使方案刷新或重载，第三方地图配置/链接永久不失效
    try {
      const persistedMapConfig = localStorage.getItem('tactical_sandtable_persisted_map_config');
      if (persistedMapConfig) {
        const parsedMapConfig = JSON.parse(persistedMapConfig);
        if (parsedMapConfig && (parsedMapConfig.onlineMapUrl || parsedMapConfig.preset === 'online_map_plugin')) {
          baseState = {
            ...baseState,
            mapConfig: {
              ...baseState.mapConfig,
              ...parsedMapConfig,
            },
          };
        }
      }
    } catch {
      // ignore
    }

    return baseState;
  });

  // 历史快照栈 (用于撤销 Ctrl+Z / 重做 Ctrl+Y)
  const [history, setHistory] = useState<TacticalState[]>([tacticalState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');

  // 当前激活的工具
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  // 当前选中的标号 ID
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // 兵力部署模版 (持久保持状态，连续点击部署时不重置)
  const [deployTemplate, setDeployTemplate] = useState<UnitDeployTemplate>(() => {
    try {
      const saved = localStorage.getItem('tactical_sandtable_deploy_template');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      faction: 'blue',
      branch: 'armor',
      echelon: 'battalion',
      name: '合成第1装甲营',
      callsign: '铁骑-01',
      strength: '380人 / 31辆99A',
      combatPower: 95,
      status: 'ready',
      scale: 1,
      autoIncrement: false,
      counter: 1,
    };
  });

  const handleUpdateDeployTemplate = (
    tmpl: UnitDeployTemplate | ((prev: UnitDeployTemplate) => UnitDeployTemplate)
  ) => {
    setDeployTemplate((prev) => {
      const next = typeof tmpl === 'function' ? tmpl(prev) : tmpl;
      try {
        localStorage.setItem('tactical_sandtable_deploy_template', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 模态窗口开关
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isDesktopExportOpen, setIsDesktopExportOpen] = useState(false);
  const [isApiDocOpen, setIsApiDocOpen] = useState(false);
  const [isSymbolLibraryOpen, setIsSymbolLibraryOpen] = useState(false);

  // 录像机状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<TacticalRecorder>(new TacticalRecorder());
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  // 用户上传或在线载入的底图 DOM Image
  const [customImageElement, setCustomImageElement] = useState<HTMLImageElement | null>(null);

  // 自动从持久化保存的 mapConfig 中恢复第三方在线地图 (iframe 交互层或安全加载器快照)
  useEffect(() => {
    const config = tacticalState.mapConfig;
    const url = config.onlineMapUrl || config.customImageUrl;

    // A. 如果是 iframe 交互底图模式 (如 Google My Maps 谷歌自绘地图)，确保 embedMapUrl 存在
    if (config.preset === 'online_map_plugin' && config.mapLayerType === 'iframe_webmap') {
      if (!config.embedMapUrl && url) {
        const parsed = parseMapInputUrl(url);
        if (parsed.embedUrl) {
          setTacticalState((prev) => ({
            ...prev,
            mapConfig: {
              ...prev.mapConfig,
              embedMapUrl: parsed.embedUrl,
            },
          }));
        }
      }
      return;
    }

    // B. 如果是静态快照 / 位图模式，通过安全加载器 (Safe Loader) 恢复位图
    if (
      url &&
      (config.preset === 'online_map_plugin' || config.preset === 'custom_image') &&
      config.mapLayerType !== 'iframe_webmap'
    ) {
      let active = true;
      loadSafeMapImage(url).then((result) => {
        if (active && result.success && result.img) {
          setCustomImageElement(result.img);
        }
      });
      return () => {
        active = false;
      };
    }
  }, [
    tacticalState.mapConfig.preset,
    tacticalState.mapConfig.mapLayerType,
    tacticalState.mapConfig.onlineMapUrl,
    tacticalState.mapConfig.customImageUrl,
    tacticalState.mapConfig.embedMapUrl,
  ]);

  // 2. 多端实时协同状态
  const [currentStaff, setCurrentStaff] = useState<CollabStaff>({
    id: `staff-${Math.random().toString(36).slice(2, 7)}`,
    name: '作战参谋-张',
    role: 'operations',
    color: '#38bdf8',
    lastActive: Date.now(),
  });

  const [onlineStaffs, setOnlineStaffs] = useState<CollabStaff[]>([currentStaff]);
  const [logMessages, setLogMessages] = useState<TacticalLogMessage[]>([
    {
      id: 'log-1',
      timestamp: '09:00:15',
      staffName: '指挥长',
      role: 'commander',
      text: '全军按联合演习推演方案展开，各参谋席位做好协同标绘准备！',
      type: 'order',
    },
    {
      id: 'log-2',
      timestamp: '09:01:40',
      staffName: '火力参谋',
      role: 'firepower',
      text: '已在1号高地与渡口区域标定炮火压制圈，第一波次远火覆盖准备就绪。',
      type: 'strike',
    },
  ]);

  const collabManagerRef = useRef<TacticalCollabManager | null>(null);

  // 3. 状态快照变更并推入历史栈
  const pushState = useCallback(
    (newState: TacticalState) => {
      setAutoSaveStatus('saving');
      setTacticalState(newState);

      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newState];
      });
      setHistoryIndex((prev) => prev + 1);

      // 自动保存至本地 LocalStorage
      try {
        localStorage.setItem('tactical_sandtable_save_v2', JSON.stringify(newState));
        // 关键：对 mapConfig 进行独立序列化持久化，确保第三方外部底图链接与插件配置刷新后永久不丢失
        if (newState.mapConfig) {
          localStorage.setItem('tactical_sandtable_persisted_map_config', JSON.stringify(newState.mapConfig));
        }
        setTimeout(() => setAutoSaveStatus('saved'), 350);
      } catch {
        // ignore
      }

      // 广播状态更新给多端协同席位
      if (collabManagerRef.current) {
        collabManagerRef.current.broadcast({
          type: 'STATE_SYNC',
          state: newState,
          senderId: currentStaff.id,
        });
      }
    },
    [historyIndex, currentStaff.id]
  );

  // 撤销
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevState = history[prevIdx];
      setHistoryIndex(prevIdx);
      setTacticalState(prevState);
      setSelectedElementId(null);
    }
  };

  // 重做
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextState = history[nextIdx];
      setHistoryIndex(nextIdx);
      setTacticalState(nextState);
      setSelectedElementId(null);
    }
  };

  // 初始化协同总线
  useEffect(() => {
    const manager = new TacticalCollabManager(currentStaff, (event) => {
      if (event.type === 'STATE_SYNC') {
        if (event.senderId !== currentStaff.id) {
          setTacticalState(event.state);
        }
      } else if (event.type === 'TACTICAL_ORDER') {
        setLogMessages((prev) => [event.message, ...prev]);
      } else if (event.type === 'STAFF_JOIN' || event.type === 'CURSOR_MOVE') {
        setOnlineStaffs(Array.from(manager.activeStaffs.values()));
      } else if (event.type === 'STAFF_LEAVE') {
        setOnlineStaffs(Array.from(manager.activeStaffs.values()));
      }
    });

    collabManagerRef.current = manager;
    return () => manager.destroy();
  }, []);

  // 全局键盘快捷键响应 (符合军事参谋指挥作业习惯)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool({ type: 'draw_arrow', arrowType: 'assault' });
      } else if (e.key.toLowerCase() === 'd') {
        setActiveTool({ type: 'draw_arrow', arrowType: 'defense_line' });
      } else if (e.key.toLowerCase() === 'u') {
        setActiveTool('place_unit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, historyIndex, history]);

  // 添加新标绘元素
  const handleAddElement = (element: TacticalElement) => {
    const updated: TacticalState = {
      ...tacticalState,
      elements: [...tacticalState.elements, element],
      updatedAt: Date.now(),
    };
    pushState(updated);
  };

  // 更新标绘元素属性
  const handleUpdateElement = (updatedElement: TacticalElement) => {
    const updated: TacticalState = {
      ...tacticalState,
      elements: tacticalState.elements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      ),
      updatedAt: Date.now(),
    };
    pushState(updated);
  };

  // 删除标绘元素
  const handleDeleteElement = (elementId: string) => {
    const updated: TacticalState = {
      ...tacticalState,
      elements: tacticalState.elements.filter((el) => el.id !== elementId),
      updatedAt: Date.now(),
    };
    setSelectedElementId(null);
    pushState(updated);
  };

  // 清空当前图层标绘
  const handleClearCurrentLayer = () => {
    const updated: TacticalState = {
      ...tacticalState,
      elements: tacticalState.elements.filter((el) => el.layerId !== tacticalState.activeLayerId),
      updatedAt: Date.now(),
    };
    setSelectedElementId(null);
    pushState(updated);
  };

  // 重置为初始演习态势方案
  const handleResetToDefault = () => {
    if (confirm('确认重置沙盘态势为初始预设演习方案？当前未保存的标注将被覆盖。')) {
      setSelectedElementId(null);
      pushState(DEFAULT_TACTICAL_STATE);
    }
  };

  // 开始录像
  const handleStartRecording = () => {
    if (!canvasElementRef.current) return;
    setRecordingSeconds(0);
    recorderRef.current.start(canvasElementRef.current, (sec) => {
      setRecordingSeconds(sec);
    });
    setIsRecording(true);
  };

  // 停止录像并导出
  const handleStopRecording = async () => {
    try {
      const blob = await recorderRef.current.stop();
      setIsRecording(false);
      downloadRecordedVideo(blob, `${tacticalState.drillCode}_${tacticalState.scenarioName}`);
    } catch (err) {
      console.error('Failed to export video:', err);
      setIsRecording(false);
    }
  };

  // 导出战术高清图片
  const handleExportSnapshot = () => {
    if (!canvasElementRef.current) return;
    exportTacticalSnapshot(
      canvasElementRef.current,
      tacticalState.scenarioName,
      tacticalState.drillCode,
      tacticalState.classification
    );
  };

  // 选中的元素对象
  const selectedElement =
    tacticalState.elements.find((el) => el.id === selectedElementId) || null;

  const currentLayer =
    tacticalState.layers.find((l) => l.id === tacticalState.activeLayerId) ||
    tacticalState.layers[0];

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* 1. 顶部战术作战工具栏 */}
      <TacticalToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearConfirm={handleClearCurrentLayer}
        onResetScenario={handleResetToDefault}
        onExportSnapshot={handleExportSnapshot}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenMapSettings={() => setIsMapSettingsOpen(true)}
        onOpenCollab={() => setIsCollabOpen(true)}
        onOpenDesktopExport={() => setIsDesktopExportOpen(true)}
        onOpenApiDoc={() => setIsApiDocOpen(true)}
        onOpenSymbolLibrary={() => setIsSymbolLibraryOpen(true)}
        activeLayerName={currentLayer ? `${currentLayer.phaseCode} · ${currentLayer.name}` : ''}
        autoSaveStatus={autoSaveStatus}
      />

      {/* 2. 主体战术推演沙盘区域 */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {/* 当处于部署兵力模式时，顶部浮动展示连续部署配置条 (保持状态不重置) */}
        {activeTool === 'place_unit' && (
          <QuickDeployBar
            deployTemplate={deployTemplate}
            onUpdateTemplate={handleUpdateDeployTemplate}
            onOpenSymbolLibrary={() => setIsSymbolLibraryOpen(true)}
            onFinishDeploy={() => setActiveTool('select')}
          />
        )}

        <TacticalCanvas
          tacticalState={tacticalState}
          activeTool={activeTool}
          deployTemplate={deployTemplate}
          onUnitDeployed={(newCounter) => {
            handleUpdateDeployTemplate((prev) => ({
              ...prev,
              counter: newCounter,
            }));
          }}
          selectedElementId={selectedElementId}
          onElementSelect={(el) => setSelectedElementId(el ? el.id : null)}
          onElementUpdate={handleUpdateElement}
          onElementAdd={handleAddElement}
          onCursorMove={(x, y) => collabManagerRef.current?.broadcastCursor(x, y)}
          onPing={(x, y) => collabManagerRef.current?.broadcastPing(x, y)}
          otherStaffs={onlineStaffs.filter((s) => s.id !== currentStaff.id)}
          customImageElement={customImageElement}
          canvasRefOut={(c) => {
            canvasElementRef.current = c;
          }}
        />

        {/* 选中的标号/军标属性检视器 */}
        {selectedElement && (
          <ElementInspectorModal
            element={selectedElement}
            layers={tacticalState.layers}
            onUpdate={handleUpdateElement}
            onDelete={handleDeleteElement}
            onClose={() => setSelectedElementId(null)}
            onSetDeployTemplate={(tmpl) => {
              handleUpdateDeployTemplate(tmpl);
              setActiveTool('place_unit');
            }}
          />
        )}

        {/* 图层与阶段管理抽屉 */}
        <LayerManager
          tacticalState={tacticalState}
          onUpdateState={pushState}
          isOpen={isLayersOpen}
          onClose={() => setIsLayersOpen(false)}
        />
      </main>

      {/* 3. 作战底图与图片导入配置模态窗口 (支持在线链接导入与Google/Baidu地图插件) */}
      <MapSettingsModal
        isOpen={isMapSettingsOpen}
        onClose={() => setIsMapSettingsOpen(false)}
        mapConfig={tacticalState.mapConfig}
        onUpdateConfig={(cfg) => pushState({ ...tacticalState, mapConfig: cfg })}
        onImageUploaded={(img) => setCustomImageElement(img)}
      />

      {/* 4. 战术军标库与自定义兵力标符模态窗口 */}
      <CustomSymbolModal
        isOpen={isSymbolLibraryOpen}
        onClose={() => setIsSymbolLibraryOpen(false)}
        currentTemplate={deployTemplate}
        onSetDeployTemplate={(tmpl) => {
          const updated: UnitDeployTemplate = {
            ...deployTemplate,
            ...tmpl,
            counter: 1,
          };
          handleUpdateDeployTemplate(updated);
          setActiveTool('place_unit');
        }}
      />

      {/* 5. 多端实时协同与席位通报抽屉 */}
      <CollabSyncPanel
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
        currentStaff={currentStaff}
        onUpdateStaff={(st) => {
          setCurrentStaff(st);
          collabManagerRef.current?.updateCurrentStaff(st);
        }}
        onlineStaffs={onlineStaffs}
        logMessages={logMessages}
        onSendOrder={(text, type) => {
          const nowStr = new Date().toTimeString().slice(0, 8);
          const newMsg: TacticalLogMessage = {
            id: `log-${Date.now()}`,
            timestamp: nowStr,
            staffName: currentStaff.name,
            role: currentStaff.role,
            text,
            type,
          };
          setLogMessages((prev) => [newMsg, ...prev]);
          collabManagerRef.current?.broadcast({
            type: 'TACTICAL_ORDER',
            message: newMsg,
          });
        }}
        onTriggerLaserPing={() => {
          collabManagerRef.current?.broadcastPing(650, 420, '重点突击关口');
        }}
      />

      {/* 6. 生成独立 Windows EXE 客户端与离线部署模态窗口 */}
      <DesktopExportModal
        isOpen={isDesktopExportOpen}
        onClose={() => setIsDesktopExportOpen(false)}
        tacticalState={tacticalState}
        onImportScenario={pushState}
      />

      {/* 7. API 开发者集成指南与接口文档模态窗口 */}
      <ApiDocModal isOpen={isApiDocOpen} onClose={() => setIsApiDocOpen(false)} />
    </div>
  );
}
