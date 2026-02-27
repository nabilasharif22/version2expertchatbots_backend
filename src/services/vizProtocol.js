
function tryParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function sanitizeArray(arr, maxLen = 50) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, maxLen);
}

function validatePayload(p) {
  if (!p || typeof p !== 'object') return null;
  if (p.type !== 'chart') return null;
  if (!['line', 'bar', 'scatter'].includes(p.chart)) return null;
  if (!Array.isArray(p.series) || p.series.length === 0) return null;
  const out = {
    type: 'chart',
    chart: p.chart,
    title: String(p.title || '').slice(0, 120),
    labels: p.labels ? sanitizeArray(p.labels, 50).map(String) : undefined,
    series: p.series.slice(0, 6).map((s) => {
      const label = String(s.label || 'Series').slice(0, 60);
      const color = s.color && typeof s.color === 'string' ? s.color : undefined;
      if (p.chart === 'scatter') {
        const data = sanitizeArray(s.data || [], 200).map((pt) => ({ x: Number(pt?.x ?? 0), y: Number(pt?.y ?? 0) }));
        return { label, data, color };
      } else {
        const data = sanitizeArray(s.data || [], 200).map((v) => Number(v ?? 0));
        return { label, data, color };
      }
    }),
  };
  return out;
}

export function extractVizPayload(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { payload: null, strippedText: rawText || '' };
  }
  let match, jsonStr;
  const fenceRegex = /```viz\s+([\s\S]*?)```/i;
  match = rawText.match(fenceRegex);
  if (match) { jsonStr = match[1].trim(); }
  if (!jsonStr) {
    const tagRegex = /<viz>([\s\S]*?)<\/viz>/i;
    const m2 = rawText.match(tagRegex);
    if (m2) jsonStr = m2[1].trim();
  }
  if (!jsonStr) return { payload: null, strippedText: rawText };
  const parsed = tryParseJSON(jsonStr);
  const valid = validatePayload(parsed);
  const stripped = rawText.replace(fenceRegex, '').replace(/<viz>[\s\S]*?<\/viz>/i, '').trim();
  if (!valid) return { payload: null, strippedText: stripped };
  return { payload: valid, strippedText: stripped };
}

export function summarizeViz(payload) {
  if (!payload) return '';
  const seriesNames = payload.series.map((s) => s.label).join(', ');
  const len = payload.series[0]?.data?.length ?? 0;
  return `Visualization generated: "${payload.title || 'Untitled'}"
Type: ${payload.chart}
Series: ${seriesNames}
Points: ~${len}${payload.labels ? `; Labels: ${payload.labels.length}` : ''}`;
}
