import { useMemo, useRef, useState } from 'react';

/**
 * Fixed categorical order reused across every chart on the dashboard — mirrors the
 * semantic tones already used by <Badge> (success=primary, info, warning=accent,
 * danger) so a color means the same thing everywhere in the app, not just here.
 * Validated for CVD-safe separation via the dataviz skill's palette checks.
 */
export const CHART_COLORS = {
    primary: '#0B6D3A',
    info: '#2563EB',
    accent: '#C9A227',
    danger: '#DC2626',
    ink: '#0F172A',
    inkMuted: '#52616B',
    inkFaint: '#94A3A0',
    border: '#E2E8E4',
    surface: '#FFFFFF',
};

function niceMax(value) {
    if (value <= 0) return 5;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
}

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Single-hue sequential shading by alpha — "more is darker" without a full named ramp. */
function sequentialAlpha(hex, t) {
    const { r, g, b } = hexToRgb(hex);
    const alpha = 0.4 + 0.6 * Math.max(0, Math.min(1, t));
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function readableOn(hex) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? CHART_COLORS.ink : '#FFFFFF';
}

const W = 600;

/**
 * Multi-series line/area trend with a crosshair + shared tooltip. Built for small
 * series counts (1–3) per the dataviz series-count ladder — direct-labels are skipped
 * in favor of legend + tooltip, which stays fully accessible on hover/focus.
 */
export function TrendChart({ data, series, height = 220, valueFormatter = (v) => v, yTickFormatter = (v) => v }) {
    const wrapRef = useRef(null);
    const [hoverIdx, setHoverIdx] = useState(null);

    const padding = { top: 12, right: 12, bottom: 24, left: 34 };
    const plotW = W - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const maxVal = useMemo(() => {
        const all = data.flatMap((d) => series.map((s) => d[s.key] ?? 0));
        return niceMax(Math.max(...all, 0));
    }, [data, series]);

    const xAt = (i) => padding.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
    const yAt = (v) => padding.top + plotH - (v / maxVal) * plotH;

    const linePath = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d[key] ?? 0)}`).join(' ');
    const areaPath = (key) => {
        const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(d[key] ?? 0)}`).join(' ');
        return `${line} L ${xAt(data.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
    };

    const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));

    const handleMove = (e) => {
        const rect = wrapRef.current.getBoundingClientRect();
        const relX = ((e.clientX - rect.left) / rect.width) * W;
        let nearest = 0;
        let best = Infinity;
        data.forEach((_, i) => {
            const dist = Math.abs(xAt(i) - relX);
            if (dist < best) {
                best = dist;
                nearest = i;
            }
        });
        setHoverIdx(nearest);
    };

    const showLegend = series.length >= 2;
    const hovered = hoverIdx !== null ? data[hoverIdx] : null;
    const tooltipLeft = hoverIdx !== null ? (xAt(hoverIdx) / W) * 100 : 0;
    const flipTooltip = tooltipLeft > 62;

    return (
        <div ref={wrapRef} className="relative">
            <svg
                viewBox={`0 0 ${W} ${height}`}
                className="w-full touch-none"
                style={{ height }}
                onMouseMove={handleMove}
                onMouseLeave={() => setHoverIdx(null)}
            >
                {gridTicks.map((t) => (
                    <g key={t}>
                        <line x1={padding.left} x2={W - padding.right} y1={yAt(t)} y2={yAt(t)} stroke={CHART_COLORS.border} strokeWidth="1" />
                        <text x={padding.left - 8} y={yAt(t) + 3} textAnchor="end" fontSize="9" fill={CHART_COLORS.inkFaint}>
                            {yTickFormatter(t)}
                        </text>
                    </g>
                ))}

                {series.map((s) =>
                    s.area ? (
                        <path key={`area-${s.key}`} d={areaPath(s.key)} fill={s.color} opacity="0.1" stroke="none" />
                    ) : null
                )}
                {series.map((s) => (
                    <path key={`line-${s.key}`} d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ))}

                {hoverIdx !== null && (
                    <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padding.top} y2={padding.top + plotH} stroke={CHART_COLORS.inkFaint} strokeWidth="1" strokeDasharray="3 3" />
                )}
                {hoverIdx !== null &&
                    series.map((s) => (
                        <circle key={`dot-${s.key}`} cx={xAt(hoverIdx)} cy={yAt(data[hoverIdx][s.key] ?? 0)} r="4" fill={s.color} stroke={CHART_COLORS.surface} strokeWidth="2" />
                    ))}

                {data.map((d, i) =>
                    i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
                        <text key={d.date} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize="9" fill={CHART_COLORS.inkFaint}>
                            {new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                        </text>
                    ) : null
                )}
            </svg>

            {hovered && (
                <div
                    className="pointer-events-none absolute top-2 z-10 min-w-[130px] rounded-lg border border-border bg-surface px-3 py-2 shadow-lg"
                    style={{ left: `${tooltipLeft}%`, transform: flipTooltip ? 'translateX(-104%)' : 'translateX(4%)' }}
                >
                    <div className="mb-1 text-[10px] font-semibold text-ink-muted">
                        {new Date(hovered.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </div>
                    {series.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-3 text-xs">
                            <span className="flex items-center gap-1.5 text-ink-muted">
                                <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.label}
                            </span>
                            <span className="font-semibold text-ink">{valueFormatter(hovered[s.key] ?? 0)}</span>
                        </div>
                    ))}
                </div>
            )}

            {showLegend && (
                <div className="mt-2 flex flex-wrap items-center gap-4">
                    {series.map((s) => (
                        <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                            <span className="inline-block h-0.5 w-3.5 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Horizontal magnitude bars, single hue, more-is-darker. Value sits at the bar's tip
 * as a direct label; a native <title> covers hover for the rare case it doesn't fit.
 */
export function HorizontalBarChart({ data, color = CHART_COLORS.primary, height = 32, valueFormatter = (v) => v, emptyLabel = 'No data yet.' }) {
    const [hoverKey, setHoverKey] = useState(null);
    const maxValue = Math.max(...data.map((d) => d.value), 1);

    if (data.length === 0 || data.every((d) => d.value === 0)) {
        return <div className="py-8 text-center text-sm text-ink-muted">{emptyLabel}</div>;
    }

    return (
        <div className="space-y-2.5">
            {data.map((d) => {
                const pct = (d.value / maxValue) * 100;
                const isHovered = hoverKey === d.label;
                return (
                    <div
                        key={d.label}
                        className="flex items-center gap-3"
                        onMouseEnter={() => setHoverKey(d.label)}
                        onMouseLeave={() => setHoverKey(null)}
                    >
                        <div className="w-32 flex-shrink-0 truncate text-right text-xs font-medium text-ink-muted" title={d.label}>
                            {d.label}
                        </div>
                        <div className="relative flex-1 rounded-full bg-surface-subtle" style={{ height }}>
                            <div
                                className="flex items-center rounded-full transition-all"
                                style={{
                                    width: `${Math.max(pct, 3)}%`,
                                    height,
                                    backgroundColor: sequentialAlpha(color, d.value / maxValue),
                                    outline: isHovered ? `2px solid ${color}` : 'none',
                                    outlineOffset: '1px',
                                }}
                            >
                                <title>
                                    {d.label}: {valueFormatter(d.value)}
                                </title>
                            </div>
                        </div>
                        <div className="w-10 flex-shrink-0 text-xs font-bold text-ink">{valueFormatter(d.value)}</div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * A single part-to-whole bar with categorical segments (never a pie — see dataviz
 * choosing-a-form) separated by a 2px surface gap, with a legend since segments ≥ 2.
 */
export function StackedBarChart({ segments, height = 40, valueFormatter = (v) => v }) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    if (total === 0) {
        return <div className="py-8 text-center text-sm text-ink-muted">No disposed cases yet.</div>;
    }

    return (
        <div>
            <div className="flex w-full overflow-hidden rounded-lg" style={{ height, gap: '2px' }}>
                {segments
                    .filter((s) => s.value > 0)
                    .map((s) => {
                        const pct = (s.value / total) * 100;
                        const fits = pct >= 12;
                        return (
                            <div
                                key={s.key}
                                className="flex items-center justify-center overflow-hidden first:rounded-l-lg last:rounded-r-lg"
                                style={{ width: `${pct}%`, backgroundColor: s.color, minWidth: '2px' }}
                            >
                                <title>
                                    {s.label}: {valueFormatter(s.value)} ({Math.round(pct)}%)
                                </title>
                                {fits && (
                                    <span className="px-1 text-[11px] font-bold" style={{ color: readableOn(s.color) }}>
                                        {Math.round(pct)}%
                                    </span>
                                )}
                            </div>
                        );
                    })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {segments.map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                        {s.label} · <span className="font-bold text-ink">{valueFormatter(s.value)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
