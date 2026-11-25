// Simple inline SVG line chart and donut chart helpers

export function renderLineChart(series, lines, formatValue = (v) => v) {
  const width = 560;
  const height = 210;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  let maxVal = 0;
  for (const pt of series) {
    for (const l of lines) {
      if (pt[l.key] > maxVal) maxVal = pt[l.key];
    }
  }
  maxVal = maxVal > 0 ? maxVal * 1.15 : 10;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padT + chartH - t * chartH;
    const label = formatValue(Math.round(maxVal * t));
    return `
      <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#eef2f6" stroke-dasharray="3 3"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b">${label}</text>
    `;
  });

  const xStep = series.length > 1 ? chartW / (series.length - 1) : chartW;
  const xLabels = series.map((pt, i) => {
    const x = padL + i * xStep;
    return `<text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#64748b">${pt.label}</text>`;
  });

  const paths = lines.map((l) => {
    const coords = series.map((pt, i) => {
      const x = padL + i * xStep;
      const y = padT + chartH - (pt[l.key] / maxVal) * chartH;
      return [x, y];
    });
    const poly = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${padL},${padT + chartH} ${poly} ${padL + (series.length - 1) * xStep},${padT + chartH}`;
    const dots = coords
      .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="#fff" stroke="${l.color}" stroke-width="2"/>`)
      .join("");
    return `
      <polygon points="${area}" fill="${l.color}" fill-opacity="0.08"/>
      <polyline points="${poly}" fill="none" stroke="${l.color}" stroke-width="2.2"/>
      ${dots}
    `;
  });

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; display:block;">
      ${gridLines.join("")}
      ${xLabels.join("")}
      ${paths.join("")}
    </svg>
  `;
}

export function renderDonutChart(segments, centerValue, centerLabel) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;

  const arcs = segments.map((s) => {
    if (total === 0 || s.value === 0) return "";
    const len = (s.value / total) * c;
    const dash = `${len.toFixed(2)} ${(c - len).toFixed(2)}`;
    const el = `<circle cx="72" cy="72" r="${r}" fill="none" stroke="${s.color}" stroke-width="18"
      stroke-dasharray="${dash}" stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 72 72)"/>`;
    offset += len;
    return el;
  });

  return `
    <svg width="144" height="144" viewBox="0 0 144 144">
      <circle cx="72" cy="72" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="18"/>
      ${arcs.join("")}
      <text x="72" y="69" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">${centerValue}</text>
      <text x="72" y="85" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">${centerLabel}</text>
    </svg>
  `;
}
