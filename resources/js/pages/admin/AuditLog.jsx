import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { Card, EmptyState, FullScreenSpinner, TextInput } from '../../components/ui';

export default function AuditLog() {
    const [search, setSearch] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['audit-log', search],
        queryFn: () => client.get('/api/admin/audit-log', { params: { search } }).then((r) => r.data.data),
    });

    return (
        <div>
            <h1 className="mb-4 text-xl font-bold text-ink">Audit Log</h1>

            <TextInput
                className="mb-4 max-w-sm"
                placeholder="Search audit logs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {isLoading ? (
                <FullScreenSpinner />
            ) : data.length === 0 ? (
                <EmptyState icon="📜" title="No audit events" subtitle="System activity will appear here." />
            ) : (
                <Card>
                    <ul className="divide-y divide-border">
                        {data.map((a) => (
                            <li key={a.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <div className="text-sm font-medium text-ink">{a.note || a.action}</div>
                                    <div className="text-xs text-ink-muted">
                                        {a.action} · {a.user || 'System'}
                                    </div>
                                </div>
                                <div className="text-xs text-ink-faint">
                                    {new Date(a.created_at).toLocaleString()}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
