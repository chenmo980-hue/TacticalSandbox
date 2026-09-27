import React, { useRef, useState, useMemo } from 'react';
import {
  TacticalMapConfig,
  BaseMapAdapterConfig,
  OnlineMapProvider,
} from '../types/tactical';
import { MAP_PRESETS, PRESET_ONLINE_MAPS } from '../utils/mapPresets';
import {
  parseMapInputUrl,
  loadSafeMapImage,
  buildBaiduStaticMapUrl,
} from '../utils/mapUrlParser';
import {
  X,
  Upload,
  Sliders,
  Grid,
  Globe,
  Check,
  Link,
  Layers,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cpu,
  BookmarkCheck,
  CheckCircle2,
} from 'lucide-react';

interface MapSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapConfig: TacticalMapConfig;
  onUpdateConfig: (config: TacticalMapConfig) => void;
  onImageUploaded: (img: HTMLImageElement, fileDataUrl: string) => void;
}

export const MapSettingsModal: React.FC<MapSettingsModalProps> = ({
  isOpen,
  onClose,
  mapConfig,
  onUpdateConfig,
  onImageUploaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'adapter' | 'local' | 'presets'>('adapter');

  // 当前输入的外部地图链接
  const [inputUrl, setInputUrl] = useState(
    mapConfig.onlineMapUrl ||
      mapConfig.adapterConfig?.url ||
      'https://www.google.com/maps/d/u/1/viewer?mid=1NZygQ5FhCvHG3ZH6Ddk3lbzAwnJum8M&ll=13.863474469778598%2C44.721136458351225&z=9'
  );

  // 适配器模式选择：智能模式 | iframe 交互模式 | 安全加载器快照模式
  const [adapterMode, setAdapterMode] = useState<'auto' | 'iframe_embed' | 'safe_loader_snapshot'>(
    mapConfig.adapterConfig?.adapterMode || 'auto'
  );

  // 诊断与加载状态
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    mapConfig.adapterConfig?.status === 'ready'
      ? 'success'
      : mapConfig.adapterConfig?.status === 'error'
      ? 'error'
      : mapConfig.adapterConfig?.status === 'loading'
      ? 'loading'
      : 'idle'
  );
  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    message: string;
    details?: string;
    corsSafe?: boolean;
    dimensions?: { width: number; height: number };
    resolvedType?: string;
  }>({
    message: mapConfig.onlineMapUrl ? '当前已有持久化底图链接' : '',
  });

  // 实时解析 URL 属性
  const parsedMeta = useMemo(() => {
    return parseMapInputUrl(inputUrl);
  }, [inputUrl]);

  if (!isOpen) return null;

  // 1. 本地图片文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onImageUploaded(img, dataUrl);
        onUpdateConfig({
          ...mapConfig,
          preset: 'custom_image',
          mapLayerType: 'canvas_image',
          customImageUrl: dataUrl,
          customImageWidth: img.width,
          customImageHeight: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // 2. 触发底图适配器载入 (通过 iframe 或 安全加载器)
  const handleApplyAdapter = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setLoadStatus('error');
      setDiagnosticInfo({ message: '请输入有效的地图或快照图片链接' });
      return;
    }

    setLoadStatus('loading');
    setDiagnosticInfo({ message: '适配器正在解析底图源协议并建立安全加载通道...' });

    const parsed = parseMapInputUrl(trimmed);
    const targetMode = adapterMode === 'auto' ? parsed.recommendedMode : adapterMode;

    // A. 采用 iframe 交互嵌入模式 (针对 Google My Maps / 谷歌自绘地图 / 在线 Web 地图)
    if (targetMode === 'iframe_embed' || parsed.type === 'google_my_maps') {
      const embedTarget = parsed.embedUrl || trimmed;
      const adapterCfg: BaseMapAdapterConfig = {
        adapterMode: 'iframe_embed',
        sourceType: parsed.type === 'google_my_maps' ? 'google_my_maps' : 'custom_url',
        url: trimmed,
        embedUrl: embedTarget,
        corsMode: 'anonymous',
        status: 'ready',
        lastVerifiedAt: Date.now(),
      };

      onUpdateConfig({
        ...mapConfig,
        preset: 'online_map_plugin',
        mapLayerType: 'iframe_webmap',
        embedMapUrl: embedTarget,
        onlineMapUrl: trimmed,
        onlineMapType: 'custom_url',
        adapterConfig: adapterCfg,
      });

      setLoadStatus('success');
      setDiagnosticInfo({
        message: '✓ 已成功通过【iframe 交互适配器】载入 Google My Maps 谷歌自绘地图！',
        details: '外部地图已转换为高精交互图层，序列化配置已自动存入 mapConfig 并持久化保存。',
        resolvedType: parsed.title,
      });
      return;
    }

    // B. 采用安全加载器 (Safe Loader) 导入静态快照链接 (如百度地图静态图、谷歌静态快照、遥感底图)
    const result = await loadSafeMapImage(trimmed);

    if (result.success && result.img) {
      onImageUploaded(result.img, trimmed);
      const adapterCfg: BaseMapAdapterConfig = {
        adapterMode: 'safe_loader_snapshot',
        sourceType: parsed.type === 'baidu_static' ? 'baidu_static' : parsed.type === 'google_static' ? 'google_static' : 'custom_url',
        url: trimmed,
        snapshotUrl: trimmed,
        corsMode: result.corsSafe ? 'anonymous' : 'no-cors',
        status: 'ready',
        lastVerifiedAt: Date.now(),
      };

      onUpdateConfig({
        ...mapConfig,
        preset: 'online_map_plugin',
        mapLayerType: 'canvas_image',
        onlineMapType: 'custom_url',
        onlineMapUrl: trimmed,
        customImageUrl: trimmed,
        customImageWidth: result.width,
        customImageHeight: result.height,
        adapterConfig: adapterCfg,
      });

      setLoadStatus('success');
      setDiagnosticInfo({
        message: '✓ 已通过【安全加载器 (Safe Loader)】成功解码静态底图快照！',
        details: `分辨率: ${result.width} × ${result.height} px | 跨域通道: ${result.corsSafe ? 'CORS 完整支持' : '自适应降级兼容'}`,
        corsSafe: result.corsSafe,
        dimensions: { width: result.width, height: result.height },
        resolvedType: parsed.title,
      });
    } else {
      // 若静态图片解析失败，但用户指定了 auto，自动尝试作为 iframe 嵌入模式进行弹性恢复
      if (adapterMode === 'auto') {
        const embedTarget = parsed.embedUrl || trimmed;
        const adapterCfg: BaseMapAdapterConfig = {
          adapterMode: 'iframe_embed',
          sourceType: 'custom_url',
          url: trimmed,
          embedUrl: embedTarget,
          corsMode: 'anonymous',
          status: 'ready',
          lastVerifiedAt: Date.now(),
        };

        onUpdateConfig({
          ...mapConfig,
          preset: 'online_map_plugin',
          mapLayerType: 'iframe_webmap',
          embedMapUrl: embedTarget,
          onlineMapUrl: trimmed,
          onlineMapType: 'custom_url',
          adapterConfig: adapterCfg,
        });

        setLoadStatus('success');
        setDiagnosticInfo({
          message: '✓ 静态图片解析受到阻拦，已自动切换为【iframe 交互适配器】兼容载入！',
          details: '底图链接已持久化写入推演方案中。',
          resolvedType: '交互式网页底图',
        });
      } else {
        setLoadStatus('error');
        setDiagnosticInfo({
          message: result.error || '底图加载失败，请检查链接是否有效。',
        });
      }
    }
  };

  // 预设样例快速载入
  const loadPresetSample = (url: string, mode: 'auto' | 'iframe_embed' | 'safe_loader_snapshot') => {
    setInputUrl(url);
    setAdapterMode(mode);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-neutral-200">
        {/* 顶部标头 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-sky-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-100">
                  通用底图插件适配器 (BaseMap Plugin Adapter)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                  v2.5 持久化引擎
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                支持通过 iframe 交互层或安全加载器 (Safe Loader) 导入谷歌自绘地图、百度静态快照与外部遥感底图
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

        {/* 顶部标签切换 */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-neutral-800 bg-neutral-950/40 text-xs">
          <button
            onClick={() => setActiveTab('adapter')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              activeTab === 'adapter'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>通用第三方底图插件适配器</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>本地作战图文件上传</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>内置战术地貌预设</span>
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'adapter' && (
            <div className="space-y-4">
              {/* 核心适配器卡片 */}
              <div className="bg-neutral-950/80 p-4 rounded-xl border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-sky-400" />
                    <h4 className="font-semibold text-neutral-200 text-sm">
                      第三方地图 / 快照链接适配载入
                    </h4>
                  </div>
                  {/* 持久化状态徽章 */}
                  {mapConfig.onlineMapUrl && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>已持久化保存 (刷新后永久生效)</span>
                    </div>
                  )}
                </div>

                {/* URL 输入框 */}
                <div className="space-y-1.5">
                  <label className="text-neutral-400 block text-[11px]">
                    输入外部地图在线链接 (Google My Maps / 百度地图静态快照 / Google Static Maps / 遥感底图 URL)
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      setLoadStatus('idle');
                    }}
                    placeholder="例如：https://www.google.com/maps/d/u/1/viewer?mid=... 或 https://api.map.baidu.com/staticimage/v2?..."
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-neutral-100 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                {/* 适配通道选择器 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdapterMode('auto')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      adapterMode === 'auto'
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-medium flex items-center gap-1.5 text-neutral-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>智能自适应 (推荐)</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      自动检测类型并匹配最优加载通道
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdapterMode('iframe_embed')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      adapterMode === 'iframe_embed'
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-medium flex items-center gap-1.5 text-neutral-200">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>iframe 交互嵌入模式</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      适用于 Google My Maps 等交互网页
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdapterMode('safe_loader_snapshot')}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      adapterMode === 'safe_loader_snapshot'
                        ? 'border-sky-500 bg-sky-500/15 text-white'
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="font-medium flex items-center gap-1.5 text-neutral-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>安全加载器快照模式</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      双阶段 CORS 容错静态快照通道
                    </p>
                  </button>
                </div>

                {/* 提交按钮与诊断 */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-neutral-400">
                    识别类型:{' '}
                    <span className="text-neutral-200 font-medium">
                      {parsedMeta.title}
                    </span>
                  </div>
                  <button
                    onClick={handleApplyAdapter}
                    disabled={loadStatus === 'loading' || !inputUrl.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20"
                  >
                    {loadStatus === 'loading' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>验证并载入底图</span>
                  </button>
                </div>

                {/* 诊断输出面板 */}
                {loadStatus === 'success' && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-400">
                      <Check className="w-4 h-4" />
                      <span>{diagnosticInfo.message}</span>
                    </div>
                    {diagnosticInfo.details && (
                      <p className="text-[11px] text-neutral-300 pl-5">
                        {diagnosticInfo.details}
                      </p>
                    )}
                  </div>
                )}

                {loadStatus === 'error' && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-relaxed">
                      {diagnosticInfo.message}
                    </div>
                  </div>
                )}
              </div>

              {/* 快速样例生成器 */}
              <div className="bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    常见第三方地图适配模板与样例 (点击快速载入)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Google My Maps 样例 */}
                  <div
                    onClick={() =>
                      loadPresetSample(
                        'https://www.google.com/maps/d/u/1/viewer?mid=1NZygQ5FhCvHG3ZH6Ddk3lbzAwnJum8M&ll=13.863474469778598%2C44.721136458351225&z=9',
                        'iframe_embed'
                      )
                    }
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 cursor-pointer flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-200">Google My Maps (谷歌自绘地图)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400">
                          iframe 嵌入
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                        亚丁湾/也门战略要道自绘地图项目，包含自定义图层与标绘边界
                      </p>
                    </div>
                    <span className="text-[10px] text-sky-400 mt-2">点击填入并测试 →</span>
                  </div>

                  {/* 百度地图静态快照样例 */}
                  <div
                    onClick={() =>
                      loadPresetSample(
                        buildBaiduStaticMapUrl({
                          center: '116.403874,39.914889',
                          zoom: 12,
                          width: 1024,
                          height: 768,
                          traffic: false,
                        }),
                        'safe_loader_snapshot'
                      )
                    }
                    className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 cursor-pointer flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-200">百度地图 (静态电子态势快照)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                          安全加载器
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2">
                        调用百度地图 Static API 生成高清态势快照，支持直接作为位图平移缩放
                      </p>
                    </div>
                    <span className="text-[10px] text-sky-400 mt-2">点击填入并测试 →</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 本地上传 */}
          {activeTab === 'local' && (
            <div>
              <h4 className="font-semibold text-neutral-200 text-sm mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                导入本地作战底图 (卫星遥感 / 航拍图 / 扫描图)
              </h4>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-700 hover:border-sky-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-neutral-950/50 hover:bg-neutral-950/80 transition-all text-center"
              >
                <Upload className="w-10 h-10 text-neutral-400" />
                <div className="font-medium text-neutral-200 text-sm">
                  点击选择或将作战底图文件拖放到此处
                </div>
                <p className="text-neutral-400 text-xs">
                  支持 PNG, JPG, WebP 格式，建议分辨率 1920×1080 或更高
                </p>
                {mapConfig.customImageUrl && mapConfig.preset === 'custom_image' && (
                  <div className="mt-2 text-emerald-400 flex items-center gap-1 font-medium text-xs">
                    <Check className="w-4 h-4" />
                    已载入本地作战底图文件
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* 预设地貌 */}
          {activeTab === 'presets' && (
            <div>
              <h4 className="font-semibold text-neutral-200 text-sm mb-2.5">
                内置专业战术沙盘地貌库
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MAP_PRESETS.filter((p) => p.id !== 'custom_image' && p.id !== 'online_map_plugin').map(
                  (preset) => {
                    const isSelected = mapConfig.preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() =>
                          onUpdateConfig({
                            ...mapConfig,
                            preset: preset.id,
                            mapLayerType: 'canvas_image',
                          })
                        }
                        className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500 shadow-md shadow-sky-500/10'
                            : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-100 text-xs">{preset.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-neutral-400 text-[11px] mt-1 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-sky-400 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            已应用
                          </div>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* 视觉与栅格显示参数 */}
          <div>
            <h4 className="font-semibold text-neutral-200 text-sm mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              底图增强与战术网格
            </h4>
            <div className="space-y-4 bg-neutral-950/50 p-4 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-sky-400" />
                  <div>
                    <span className="font-medium text-neutral-200">MGRS 战术方格坐标网</span>
                    <p className="text-[10px] text-neutral-400">显示方格网与公里刻度读数</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={mapConfig.gridVisible}
                  onChange={(e) =>
                    onUpdateConfig({ ...mapConfig, gridVisible: e.target.checked })
                  }
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>底图亮度 (Brightness)</span>
                  <span className="font-mono text-neutral-300">{mapConfig.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  step="5"
                  value={mapConfig.brightness}
                  onChange={(e) =>
                    onUpdateConfig({ ...mapConfig, brightness: parseInt(e.target.value) })
                  }
                  className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>底图对比度 (Contrast)</span>
                  <span className="font-mono text-neutral-300">{mapConfig.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={mapConfig.contrast}
                  onChange={(e) =>
                    onUpdateConfig({ ...mapConfig, contrast: parseInt(e.target.value) })
                  }
                  className="w-full accent-sky-500 h-1.5 bg-neutral-700 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/70 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs cursor-pointer shadow-md shadow-sky-600/20"
          >
            完成设定并返回沙盘
          </button>
        </div>
      </div>
    </div>
  );
};
