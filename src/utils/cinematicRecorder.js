/**
 * Client-side 16:9 HD Cinematic Video Banner Recorder for Silsilah 3D.
 * Captures the live Three.js WebGL canvas, composites a cinematic letterbox +
 * gold title overlay onto an offscreen 1280x720 canvas, and exports MP4 (or WebM fallback).
 */
export function pickSupportedVideoMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mime: 'video/mp4;codecs=h264', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: '', ext: 'webm' };
}

export function startCinematicBannerRecording({
  sourceCanvas,
  title = 'Silsilah Keluarga Trah Wira Kusuma',
  subtitle = 'SILSILAH 3D · VISUALISASI INTERAKTIF',
  durationMs = 10000,
  onTick,
  onComplete,
  onError,
}) {
  const format = pickSupportedVideoMime();
  if (!format || !sourceCanvas) {
    onError?.('Browser Anda belum mendukung perekaman video kanvas.');
    return () => {};
  }

  const W = 1280;
  const H = 720;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = W;
  outCanvas.height = H;
  const ctx = outCanvas.getContext('2d');

  let rafId = null;
  let stopped = false;
  const startedAt = performance.now();

  const drawFrame = () => {
    if (stopped) return;
    const elapsed = performance.now() - startedAt;

    // Deep midnight backdrop
    ctx.fillStyle = '#070d19';
    ctx.fillRect(0, 0, W, H);

    // Draw live 3D WebGL canvas centered (cover-fit)
    const sw = sourceCanvas.width || W;
    const sh = sourceCanvas.height || H;
    const scale = Math.max(W / sw, H / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    try {
      ctx.drawImage(sourceCanvas, dx, dy, dw, dh);
    } catch {
      // Ignore transient frame errors
    }

    // Subtle cinematic vignette & top/bottom letterbox bars
    const barH = 54;
    ctx.fillStyle = 'rgba(4, 8, 18, 0.88)';
    ctx.fillRect(0, 0, W, barH);
    ctx.fillRect(0, H - barH, W, barH);

    // Subtle golden hairline along letterbox edges
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, 'rgba(245, 197, 66, 0)');
    grad.addColorStop(0.2, 'rgba(245, 197, 66, 0.45)');
    grad.addColorStop(0.8, 'rgba(245, 197, 66, 0.45)');
    grad.addColorStop(1, 'rgba(245, 197, 66, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, barH - 1, W, 1.5);
    ctx.fillRect(0, H - barH, W, 1.5);

    // Fade-in title banner in bottom letterbox
    const alpha = Math.min(1, elapsed / 700);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fde68a';
    ctx.font = '700 12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(subtitle.toUpperCase(), 34, H - 30);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(title, 34, H - 11);

    // Subtle right-side watermark
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText('silsilah-3d', W - 34, H - 22);
    ctx.restore();

    const remainingSec = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
    onTick?.(remainingSec);

    if (elapsed >= durationMs) {
      stop();
      return;
    }
    rafId = requestAnimationFrame(drawFrame);
  };

  const stream = outCanvas.captureStream(30);
  const chunks = [];
  let recorder;
  try {
    recorder = new MediaRecorder(stream, {
      ...(format.mime ? { mimeType: format.mime } : {}),
      videoBitsPerSecond: 4_500_000,
    });
  } catch (err) {
    onError?.(err?.message || 'Gagal memulai perekam video.');
    return () => {};
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks, { type: format.mime || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silsilah-3d-banner.${format.ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    onComplete?.(format.ext);
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  recorder.start(250);
  rafId = requestAnimationFrame(drawFrame);

  return stop;
}
