/* charts.js - minimal static canvas drawing helpers */

/* clear canvas */
function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* simple small line chart */
function drawLine(canvas, labels, dataset, options = {}) {
  clearCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  const pad = 28;
  const max = Math.max(...dataset, 1);
  const min = Math.min(...dataset, 0);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(labels.length - 1, 1);
  ctx.strokeStyle = options.color || "#0b6fb2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  dataset.forEach((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    ctx.fillStyle = options.color || "#0b6fb2";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.stroke();
  ctx.fillStyle = "#254a65";
  ctx.font = "10px sans-serif";
  labels.forEach((lab, i) => {
    const x = pad + i * stepX;
    ctx.fillText(lab, x - 10, h - 6);
  });
}

/* simple bar chart */
function drawBar(canvas, labels, dataset, options = {}) {
  clearCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  const pad = 28;
  const max = Math.max(...dataset, 1);
  const stepX = (w - pad * 2) / Math.max(dataset.length, 1);
  dataset.forEach((v, i) => {
    const x = pad + i * stepX + 6;
    const barW = Math.max(6, stepX - 12);
    const barH = (v / max || 0) * (h - pad * 2);
    ctx.fillStyle = options.color || "#64748b";
    ctx.fillRect(x, h - pad - barH, barW, barH);
    ctx.fillStyle = "#254a65";
    ctx.font = "10px sans-serif";
    ctx.fillText(labels[i] ? labels[i].slice(0, 12) : "", x, h - 6);
  });
}

/* simple doughnut (not used in dashboard mini charts but available) */
function drawDoughnut(canvas, labels, dataset, options = {}) {
  clearCanvas(canvas);
  const ctx = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  const cx = w / 2,
    cy = h / 2,
    radius = Math.min(w, h) / 3;
  const total = dataset.reduce((s, v) => s + v, 0) || 1;
  let start = -Math.PI / 2;
  const colors = options.colors || ["#0b6fb2", "#f59e0b", "#d9534f", "#64748b"];
  dataset.forEach((v, i) => {
    const angle = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = colors[i % colors.length];
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
}
