import React, { useState } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Sliders,
  Play,
} from 'lucide-react';
import { TacticalLayer, TacticalState } from '../types/tactical';

interface LayerManagerProps {
  tacticalState: TacticalState;
  onUpdateState: (newState: TacticalState) => void;
  isOpen: boolean;
  onClose: () => void;
  onEnterCompare?: (layerAId?: string, layerBId?: string) => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  tacticalState,
  onUpdateState,
  isOpen,
  onClose,
  onEnterCompare,
}) => {
  const [newLayerName, setNewLayerName] = useState('');
  const [newPhaseCode, setNewPhaseCode] = useState('阶段四');

  if (!isOpen) return null;

  const { layers, elements, activeLayerId } = tacticalState;

  // 切换可见性
  const toggleVisibility = (layerId: string) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l));
    onUpdateState({ ...tacticalState, layers: updated });
  };

  // 切换锁定
  const toggleLock = (layerId: string) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l));
    onUpdateState({ ...tacticalState, layers: updated });
  };

  // 调整透明度
  const handleOpacityChange = (layerId: string, opacity: number) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, opacity } : l));
    onUpdateState({ ...tacticalState, layers: updated });
  };

  // 设为当前工作图层
  const setActiveLayer = (layerId: string) => {
    onUpdateState({ ...tacticalState, activeLayerId: layerId });
  };

  // 单阶段独显推演模式 (只显示这一个阶段)
  const soloLayer = (layerId: string) => {
    const updated = layers.map((l) => ({ ...l, visible: l.id === layerId }));
    onUpdateState({ ...tacticalState, layers: updated, activeLayerId: layerId });
  };

  // 全显所有阶段
  const showAllLayers = () => {
    const updated = layers.map((l) => ({ ...l, visible: true }));
    onUpdateState({ ...tacticalState, layers: updated });
  };

  // 添加新阶段图层
  const handleAddLayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLayerName.trim()) return;

    const colors = ['#38bdf8', '#f97316', '#ef4444', '#10b981', '#a855f7', '#eab308'];
    const newLayer: TacticalLayer = {
      id: `layer-${Date.now()}`,
      name: newLayerName.trim(),
      phaseCode: newPhaseCode,
      visible: true,
      locked: false,
      opacity: 1,
      color: colors[layers.length % colors.length],
    };

    onUpdateState({
      ...tacticalState,
      layers: [...layers, newLayer],
      activeLayerId: newLayer.id,
    });
    setNewLayerName('');
  };

  // 删除图层
  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) return;
    const filteredLayers = layers.filter((l) => l.id !== layerId);
    const filteredElements = elements.filter((el) => el.layerId !== layerId);
    const newActiveId = activeLayerId === layerId ? filteredLayers[0].id : activeLayerId;

    onUpdateState({
      ...tacticalState,
      layers: filteredLayers,
      elements: filteredElements,
      activeLayerId: newActiveId,
    });
  };

  // 调整图层顺序
  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layers.length) return;
    const newLayers = [...layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[targetIndex];
    newLayers[targetIndex] = temp;
    onUpdateState({ ...tacticalState, layers: newLayers });
  };

  return (
    <aside className="fixed top-16 right-4 w-96 max-h-[85vh] bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-xl shadow-2xl z-40 flex flex-col overflow-hidden text-neutral-200">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h2 className="font-bold text-sm text-neutral-100">推演阶段与图层管理</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono">
            {layers.length} 个阶段
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={showAllLayers}
            className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
          >
            全部显示
          </button>
          <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 快捷进入阶段态势对比 */}
      {onEnterCompare && layers.length >= 2 && (
        <div className="px-3 pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => {
              onEnterCompare(layers[0]?.id, layers[1]?.id);
              onClose();
            }}
            className="w-full py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>进入阶段态势对比 (叠放不同阶段对比差异)</span>
          </button>
        </div>
      )}

      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {layers.map((layer, index) => {
          const elCount = elements.filter((el) => el.layerId === layer.id).length;
          const isActive = layer.id === activeLayerId;

          return (
            <div
              key={layer.id}
              className={`p-3 rounded-lg border transition-all ${
                isActive
                  ? 'bg-neutral-800/90 border-sky-500/60 shadow-sm shadow-sky-500/10'
                  : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  onClick={() => setActiveLayer(layer.id)}
                  className="flex items-center gap-2 flex-1 cursor-pointer select-none"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: layer.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs text-neutral-100 truncate">{layer.name}</span>
                      {isActive && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/30 text-sky-300 font-mono">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                      <span>{layer.phaseCode}</span>
                      <span>·</span>
                      <span>{elCount} 个态势标符</span>
                    </div>
                  </div>
                </div>

                {/* 快捷操作按键 */}
                <div className="flex items-center gap-1">
                  {onEnterCompare && layers.length >= 2 && (
                    <button
                      onClick={() => {
                        const otherLayer = layers.find((l) => l.id !== layer.id);
                        onEnterCompare(layer.id, otherLayer?.id);
                        onClose();
                      }}
                      title="以此阶段为基准进入态势叠放对比"
                      className="p-1 rounded text-neutral-400 hover:text-sky-400 hover:bg-neutral-700 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => soloLayer(layer.id)}
                    title="单阶段独显推演 (仅展示此阶段)"
                    className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-700 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => toggleVisibility(layer.id)}
                    title={layer.visible ? '隐藏此图层' : '显示此图层'}
                    className={`p-1 rounded cursor-pointer ${
                      layer.visible ? 'text-neutral-300 hover:text-white' : 'text-neutral-500'
                    }`}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toggleLock(layer.id)}
                    title={layer.locked ? '已锁定 (防止误触)' : '已解锁'}
                    className={`p-1 rounded cursor-pointer ${
                      layer.locked ? 'text-amber-400' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex flex-col">
                    <button
                      disabled={index === 0}
                      onClick={() => moveLayer(index, 'up')}
                      className="text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={index === layers.length - 1}
                      onClick={() => moveLayer(index, 'down')}
                      className="text-neutral-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {layers.length > 1 && (
                    <button
                      onClick={() => handleDeleteLayer(layer.id)}
                      title="删除此阶段"
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-700 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 透明度滑块 */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-400">
                <Sliders className="w-3 h-3 text-neutral-400" />
                <span>阶段透明度:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={layer.opacity}
                  onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                  className="flex-1 accent-sky-500 h-1 bg-neutral-700 rounded cursor-pointer"
                />
                <span className="font-mono w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 新增阶段图层表单 */}
      <form onSubmit={handleAddLayer} className="p-3 border-t border-neutral-800 bg-neutral-950/70">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="输入阶段名称，如：纵深穿插与合围"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            新建
          </button>
        </div>
      </form>
    </aside>
  );
};
