import { useEffect, useState } from 'react';
import { timeAgo } from '../utils/timeAgo';

/** Pulsing "Live" indicator with a ticking relative timestamp — pair with a query's `refetchInterval`. */
export default function LiveBadge({ dataUpdatedAt }) {
    const [, tick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 5000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
            <span className="font-bold uppercase tracking-wide text-primary-600">Live</span>
            <span>· updated {dataUpdatedAt ? timeAgo(new Date(dataUpdatedAt).toISOString()) : 'just now'}</span>
        </div>
    );
}
