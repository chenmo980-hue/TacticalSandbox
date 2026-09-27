/**
 * 通用底图插件适配器与链接安全加载器
 * 专门处理 Google My Maps (谷歌我的地图)、Google Static Maps、百度静态地图快照及外部遥感影像
 */

export interface ParsedMapUrlResult {
  isValid: boolean;
  type: 'google_my_maps' | 'google_maps_embed' | 'google_static' | 'baidu_static' | 'web_image' | 'unknown';
  embedUrl?: string;
  imageUrl?: string;
  originalUrl: string;
  title: string;
  description: string;
  recommendedMode: 'iframe_embed' | 'safe_loader_snapshot';
}

export function parseMapInputUrl(inputUrl: string): ParsedMapUrlResult {
  const url = inputUrl.trim();
  if (!url) {
    return {
      isValid: false,
      type: 'unknown',
      originalUrl: url,
      title: '空链接',
      description: '请输入有效的地图或快照图片链接',
      recommendedMode: 'safe_loader_snapshot',
    };
  }

  // 1. Google My Maps (谷歌我的地图 / 自定义绘制地图网页项目)
  // 例如: https://www.google.com/maps/d/u/1/viewer?mid=1NZygQ5FhCvHG3ZH6Ddk3lbzAwnJum8M&ll=13.863474469778598%2C44.721136458351225&z=9
  if (url.includes('google.com/maps/d/')) {
    try {
      const urlObj = new URL(url);
      const mid = urlObj.searchParams.get('mid');
      const ll = urlObj.searchParams.get('ll');
      const z = urlObj.searchParams.get('z');

      if (mid) {
        let embed = `https://www.google.com/maps/d/embed?mid=${encodeURIComponent(mid)}`;
        if (ll) embed += `&ll=${encodeURIComponent(ll)}`;
        if (z) embed += `&z=${encodeURIComponent(z)}`;

        return {
          isValid: true,
          type: 'google_my_maps',
          embedUrl: embed,
          originalUrl: url,
          title: 'Google My Maps 谷歌自绘地图项目',
          description: '检测到 Google My Maps 网页项目！已自动转换为标准嵌入地址，置于底层作为交互式底图显示。',
          recommendedMode: 'iframe_embed',
        };
      }
    } catch {
      const midMatch = url.match(/mid=([a-zA-Z0-9_-]+)/);
      if (midMatch) {
        return {
          isValid: true,
          type: 'google_my_maps',
          embedUrl: `https://www.google.com/maps/d/embed?mid=${midMatch[1]}`,
          originalUrl: url,
          title: 'Google My Maps 谷歌自绘地图项目',
          description: '检测到 Google My Maps 网页项目，已自动转换为嵌入地址。',
          recommendedMode: 'iframe_embed',
        };
      }
    }
  }

  // 2. Google Maps Static API 静态高精快照
  // 包含 maps.googleapis.com/maps/api/staticmap
  if (url.includes('googleapis.com/maps/api/staticmap')) {
    return {
      isValid: true,
      type: 'google_static',
      imageUrl: url,
      originalUrl: url,
      title: 'Google Maps 静态卫星/地形快照',
      description: 'Google Maps 静态图片快照，支持通过安全加载器直接渲染到沙盘画布中。',
      recommendedMode: 'safe_loader_snapshot',
    };
  }

  // 3. 百度地图静态图 API 快照 (Baidu Maps Static Image)
  // 包含 api.map.baidu.com/staticimage
  if (url.includes('api.map.baidu.com/staticimage')) {
    return {
      isValid: true,
      type: 'baidu_static',
      imageUrl: url,
      originalUrl: url,
      title: '百度地图静态电子/卫星态势快照',
      description: '百度地图静态影像快照接口，可直接作为底图位图并支持缩放拖拽。',
      recommendedMode: 'safe_loader_snapshot',
    };
  }

  // 4. 普通 Google Maps 网页嵌入
  if (url.includes('google.com/maps') || url.includes('maps.google.com')) {
    return {
      isValid: true,
      type: 'google_maps_embed',
      embedUrl: url.replace('/viewer', '/embed'),
      originalUrl: url,
      title: 'Google Maps 在线交互地图',
      description: 'Google Maps 在线地图交互式 iframe 嵌入层。',
      recommendedMode: 'iframe_embed',
    };
  }

  // 5. 常见图片格式与图床
  const isImageFile =
    url.match(/\.(png|jpg|jpeg|webp|bmp|svg)(\?.*)?$/i) ||
    url.startsWith('data:image/') ||
    url.includes('unsplash.com') ||
    url.includes('imgur.com') ||
    url.includes('sinaimg.cn') ||
    url.includes('qpic.cn') ||
    url.includes('openstreetmap.org');

  if (isImageFile) {
    return {
      isValid: true,
      type: 'web_image',
      imageUrl: url,
      originalUrl: url,
      title: '高精静态卫星/战术地图图片快照',
      description: '网络静态地图快照，安全加载器将解析尺寸并载入画布。',
      recommendedMode: 'safe_loader_snapshot',
    };
  }

  // 默认：优先尝试安全图片加载器，如果失败则提供 iframe 降级
  return {
    isValid: true,
    type: 'unknown',
    imageUrl: url,
    embedUrl: url,
    originalUrl: url,
    title: '自定义网络地图资源',
    description: '外部地图或快照资源，支持切换 iframe 嵌入模式与安全加载器快照模式。',
    recommendedMode: 'safe_loader_snapshot',
  };
}

/**
 * 安全地图图片加载器 (Safe Loader)
 * 具备双阶段加载容错机制：
 * 阶段 1: 尝试匿名 CORS 模式加载（若成功，画布不被污染，可支持高清导出与录像）
 * 阶段 2: 若目标图床不支持 CORS，自动降级为非跨域模式加载（仍可在沙盘上正常显示和标绘）
 */
export function loadSafeMapImage(
  url: string,
  timeoutMs = 12000
): Promise<{
  success: boolean;
  img?: HTMLImageElement;
  corsSafe: boolean;
  width: number;
  height: number;
  error?: string;
}> {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({
          success: false,
          corsSafe: false,
          width: 0,
          height: 0,
          error: '底图加载超时，请检查网络连接或链接是否可访问。',
        });
      }
    }, timeoutMs);

    // 第一步：尝试 CORS 模式
    const corsImg = new Image();
    corsImg.crossOrigin = 'anonymous';

    corsImg.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          success: true,
          img: corsImg,
          corsSafe: true,
          width: corsImg.naturalWidth || corsImg.width,
          height: corsImg.naturalHeight || corsImg.height,
        });
      }
    };

    corsImg.onerror = () => {
      // 第二步：自动降级尝试无 CORS 限制模式
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            success: true,
            img: fallbackImg,
            corsSafe: false,
            width: fallbackImg.naturalWidth || fallbackImg.width,
            height: fallbackImg.naturalHeight || fallbackImg.height,
          });
        }
      };

      fallbackImg.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({
            success: false,
            corsSafe: false,
            width: 0,
            height: 0,
            error: '无法通过图片解码器读取此链接。如果此链接是网页应用（如 Google My Maps 网页），请切换为【iframe 交互嵌入模式】载入！',
          });
        }
      };

      fallbackImg.src = url;
    };

    corsImg.src = url;
  });
}

/**
 * 快速生成百度地图静态快照链接助手
 */
export function buildBaiduStaticMapUrl(params: {
  center: string; // "经度,纬度" 如 "116.403874,39.914889"
  zoom: number;   // 3 - 19
  width: number;  // px
  height: number; // px
  traffic?: boolean;
}): string {
  const { center, zoom, width, height, traffic } = params;
  return `https://api.map.baidu.com/staticimage/v2?center=${encodeURIComponent(center)}&zoom=${zoom}&width=${width}&height=${height}${traffic ? '&traffic=on' : ''}&dpiType=ph`;
}

/**
 * 快速生成 Google Maps Static API 静态快照链接模板
 */
export function buildGoogleStaticMapUrl(params: {
  center: string;   // "纬度,经度"
  zoom: number;     // 1 - 20
  size: string;     // "1024x768"
  maptype: 'satellite' | 'terrain' | 'roadmap' | 'hybrid';
  apiKey?: string;
}): string {
  const { center, zoom, size, maptype, apiKey } = params;
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${size}&maptype=${maptype}${keyParam}`;
}
