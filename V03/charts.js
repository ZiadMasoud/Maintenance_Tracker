/* charts.js - lightweight Canvas helpers (static previews) */
function clearCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawLine(canvas, labels, data, color = "#0b6fb2") {
  clearCanvas(canvas);
  if (!labels.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height,
    pad = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(labels.length - 1, 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.stroke();
  ctx.fillStyle = "#254a65";
  ctx.font = "10px sans-serif";
  labels.forEach((lab, i) => {
    const x = pad + i * stepX;
    ctx.fillText(lab, x - 12, h - 6);
  });
}

function drawBar(canvas, labels, data, color = "#64748b") {
  clearCanvas(canvas);
  if (!labels.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height,
    pad = 28;
  const max = Math.max(...data, 1);
  const stepX = (w - pad * 2) / Math.max(data.length, 1);
  data.forEach((v, i) => {
    const x = pad + i * stepX + 6;
    const barW = Math.max(6, stepX - 12);
    const barH = (v / max || 0) * (h - pad * 2);
    ctx.fillStyle = color;
    ctx.fillRect(x, h - pad - barH, barW, barH);
    ctx.fillStyle = "#254a65";
    ctx.font = "10px sans-serif";
    ctx.fillText((labels[i] || "").slice(0, 10), x, h - 6);
  });
}
