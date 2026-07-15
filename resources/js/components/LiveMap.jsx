import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Card, EmptyState, FullScreenSpinner } from './ui';

/**
 * Not a real tiled map — the prototype's "live map" is a simple scatter plot: each
 * secretary's lat/lng is normalised against the min/max of the current set and placed as a
 * percentage position inside a bordered box. Faithfully reproduced here rather than pulling
 * in a mapping library the prototype never used either.
 */
function plotPositions(locations) {
    const lats = locations.map((l) => l.lat);
    const lngs = locations.map((l) => l.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) * 0.28 || 0.001;
    const padLng = (maxLng - minLng) * 0.28 || 0.001;

    return locations.map((l) => {
        const x = ((l.lng - (minLng - padLng)) / (maxLng + padLng - (minLng - padLng))) * 92 + 4;
        const y = (1 - (l.lat - (minLat - padLat)) / (maxLat + padLat - (minLat - padLat))) * 88 + 4;
        return { ...l, x, y };
    });
}

function minutesAgo(iso) {
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function LiveMap() {
    const { data, isLoading } = useQuery({
        queryKey: ['adlg-live-locations'],
        queryFn: () => client.get('/api/adlg/live-locations').then((r) => r.data.data),
        refetchInterval: 20000,
    });

    if (isLoading) return <FullScreenSpinner />;

    if (!data?.length) {
        return (
            <EmptyState
                icon="📍"
                title="No live locations yet"
                subtitle="Secretaries share their location automatically during working hours (Sun–Thu, 9AM–5PM)."
            />
        );
    }

    const points = plotPositions(data);
    const freshCount = data.filter((l) => l.fresh).length;

    return (
        <Card className="p-5">
            <div className="mb-3 flex items-center gap-5 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Live (&lt;5 min): {freshCount}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-ink-faint" /> Older: {data.length - freshCount}
                </span>
            </div>

            <div
                className="relative h-[440px] w-full overflow-hidden rounded-xl border border-border bg-surface-subtle"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, rgba(0,0,0,.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.04) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            >
                {points.map((p) => (
                    <div
                        key={p.secretary_id}
                        className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    >
                        <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs shadow ${p.fresh ? 'animate-pulse bg-primary-500' : 'bg-ink-faint'}`}
                        >
                            📍
                        </div>
                        <div className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                            {p.name.split(' ')[0]} · {p.fresh ? 'now' : `${minutesAgo(p.last_seen_at)}m ago`}
                        </div>
                        <div className="pointer-events-none absolute left-1/2 top-full mt-6 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-[10px] shadow-lg group-hover:block">
                            <div className="font-bold text-ink">{p.name}</div>
                            <div className="text-ink-muted">{p.union_council}</div>
                            <div className="mt-1 font-mono text-ink-faint">
                                {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                            </div>
                            {p.accuracy_meters && <div className="text-ink-faint">±{Math.round(p.accuracy_meters)}m accuracy</div>}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
