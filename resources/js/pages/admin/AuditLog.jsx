import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import ActivityTimeline from '../../components/ActivityTimeline';
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
                    <ActivityTimeline events={data} maxHeight="max-h-none" />
                </Card>
            )}
        </div>
    );
}
