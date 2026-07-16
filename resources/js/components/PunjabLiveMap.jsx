import { useEffect, useRef, useState } from 'react';
import { CHART_COLORS } from './charts';

/**
 * Plots every geocoded Union Council by its real lat/lng — at province scale this
 * naturally traces Punjab's outline as a field of dots, no map tiles or API key
 * needed. Rendered on <canvas> rather than SVG: thousands of points redrawing every
 * refresh would be real DOM churn as SVG nodes, but is a few milliseconds on canvas.
 *
 * Assumes the backend has already dropped geocoding outliers (see App\Support\GeoBounds)
 * — this component trusts its input and fits bounds to plain min/max, so genuine
 * edge-of-region points render at the true edge instead of being clamped inward.
 */
export default function PunjabLiveMap({ points }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [hover, setHover] = useState(null);
    const projectRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !points?.length) return undefined;

        const draw = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, rect.width, rect.height);

            const lats = points.map((p) => p[0]);
            const lngs = points.map((p) => p[1]);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            // Longitude compresses toward the poles — correct with cos(latitude) so
            // the plotted shape matches the real geography instead of stretching east-west.
            const latRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
            const lngSpanKm = Math.max((maxLng - minLng) * Math.cos(latRad), 1e-6);
            const latSpanKm = Math.max(maxLat - minLat, 1e-6);

            const pad = 16;
            const availW = rect.width - pad * 2;
            const availH = rect.height - pad * 2;
            const scale = Math.min(availW / lngSpanKm, availH / latSpanKm);
            const drawW = lngSpanKm * scale;
            const drawH = latSpanKm * scale;
            const offsetX = pad + (availW - drawW) / 2;
            const offsetY = pad + (availH - drawH) / 2;

            const project = (lat, lng) => [
                offsetX + (lng - minLng) * Math.cos(latRad) * scale,
                offsetY + (1 - (lat - minLat) / latSpanKm) * drawH,
            ];

            projectRef.current = project;

            // Three passes: dim base layer first, vacant next, live pulse on top so each reads clearly.
            points.forEach(([lat, lng, status]) => {
                if (status !== 1) return;
                const [x, y] = project(lat, lng);
                ctx.beginPath();
                ctx.arc(x, y, 1.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(11, 109, 58, 0.45)';
                ctx.fill();
            });
            points.forEach(([lat, lng, status]) => {
                if (status !== 0) return;
                const [x, y] = project(lat, lng);
                ctx.beginPath();
                ctx.arc(x, y, 1.6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
                ctx.fill();
            });
            points.forEach(([lat, lng, status]) => {
                if (status !== 2) return;
                const [x, y] = project(lat, lng);
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = CHART_COLORS.accent;
                ctx.shadowColor = CHART_COLORS.accent;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        };

        draw();
        const observer = new ResizeObserver(draw);
        observer.observe(container);
        return () => observer.disconnect();
    }, [points]);

    const handleMove = (e) => {
        const project = projectRef.current;
        if (!project || !points?.length) return;
        const rect = containerRef.current.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        let nearest = null;
        let best = 14 * 14;
        for (const [lat, lng, status] of points) {
            const [x, y] = project(lat, lng);
            const d = (x - px) ** 2 + (y - py) ** 2;
            if (d < best) {
                best = d;
                nearest = { x, y, status };
            }
        }
        setHover(nearest);
    };

    const statusLabel = { 0: 'Vacant — no secretary assigned', 1: 'Covered', 2: 'Covered — checked in today' };

    return (
        <div ref={containerRef} className="relative h-full w-full" onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
            <canvas ref={canvasRef} className="block" />
            {hover && (
                <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink shadow-lg"
                    style={{ left: hover.x, top: hover.y - 8 }}
                >
                    {statusLabel[hover.status]}
                </div>
            )}
        </div>
    );
}
