import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { EmptyState, FullScreenSpinner } from './ui';

function timeAgo(iso) {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function NotificationBell() {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => client.get('/api/notifications').then((r) => r.data),
        refetchInterval: 30000,
    });

    const markReadMutation = useMutation({
        mutationFn: (id) => client.post(`/api/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => client.post('/api/notifications/read-all'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const unreadCount = data?.meta?.unread_count || 0;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative rounded-full p-2 text-ink-muted hover:bg-surface-subtle"
                aria-label="Notifications"
            >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                    <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                        <span className="text-sm font-bold text-ink">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllReadMutation.mutate()}
                                className="text-xs font-semibold text-primary-600 hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <FullScreenSpinner />
                        ) : !data.data.length ? (
                            <div className="py-6">
                                <EmptyState icon="🔔" title="No notifications yet" />
                            </div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {data.data.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            onClick={() => !n.read && markReadMutation.mutate(n.id)}
                                            className={`block w-full px-4 py-3 text-left hover:bg-surface-subtle ${!n.read ? 'bg-primary-50/40' : ''}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />}
                                                <div className={n.read ? 'ml-3.5' : ''}>
                                                    <p className="text-xs leading-relaxed text-ink">{n.message}</p>
                                                    <p className="mt-1 text-[10px] text-ink-faint">{timeAgo(n.created_at)}</p>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
