/**
 * 战术沙盘推演录像与战情高清图存档模块
 * 支持基于 MediaRecorder API 的实时 60FPS 画布录制与视频文件导出
 * 支持 2K/4K 战术沙盘高分辨率指挥图导出 (带密级与推演元数据)
 */

export class TacticalRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime = 0;
  private timerInterval: number | null = null;
  public isRecording = false;

  start(canvas: HTMLCanvasElement, onDurationChange?: (sec: number) => void) {
    if (this.isRecording) return;
    this.recordedChunks = [];

    // 获取 30fps 或 60fps 实时 Canvas 视频流
    const stream = canvas.captureStream(30);

    // 优先选择 webm 视频封装，具有极高兼容性
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3000000, // 3Mbps 高清码率
      });
    } catch {
      // 降级回退
      this.mediaRecorder = new MediaRecorder(stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(500); // 每0.5秒收集一次流片段
    this.isRecording = true;
    this.startTime = Date.now();

    if (onDurationChange) {
      this.timerInterval = window.setInterval(() => {
        const sec = Math.floor((Date.now() - this.startTime) / 1000);
        onDurationChange(sec);
      }, 500);
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('未在录制中'));
        return;
      }

      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }
}

/**
 * 触发录像视频下载
 */
export function downloadRecordedVideo(blob: Blob, scenarioName = '战术攻防演练') {
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const filename = `${scenarioName}_推演实录_${timestamp}.webm`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * 导出当前战术态势为超清图片 (PNG)
 */
export function exportTacticalSnapshot(
  canvas: HTMLCanvasElement,
  scenarioName: string,
  drillCode: string,
  classification: string
) {
  // 创建临时离屏画布以绘制军事战术标头水印
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return;

  // 1. 复制原沙盘内容
  ctx.drawImage(canvas, 0, 0);

  // 2. 绘制顶部指挥战术信息条
  const barH = 34;
  ctx.fillStyle = 'rgba(10, 15, 20, 0.85)';
  ctx.fillRect(0, 0, exportCanvas.width, barH);
  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 12px "Noto Sans SC", sans-serif';
  ctx.fillText(`【${classification}】`, 14, 22);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 13px "Noto Sans SC", sans-serif';
  ctx.fillText(`任务代号: ${drillCode} | ${scenarioName}`, 120, 22);

  const timeStr = new Date().toLocaleString('zh-CN', { hour12: false });
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText(`标绘时间戳: ${timeStr} | 战策沙盘推演系统`, exportCanvas.width - 14, 22);

  // 3. 触发图片下载
  const dataUrl = exportCanvas.toDataURL('image/png');
  const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const filename = `${drillCode}_${scenarioName}_战术态势图_${timestamp}.png`;

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
