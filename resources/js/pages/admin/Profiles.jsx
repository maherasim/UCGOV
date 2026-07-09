import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { Badge, Card, EmptyState, FullScreenSpinner } from '../../components/ui';

export default function Profiles() {
    const { data, isLoading } = useQuery({
        queryKey: ['profile-submissions'],
        queryFn: () => client.get('/api/admin/profile-submissions').then((r) => r.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <h1 className="mb-1 text-xl font-bold text-ink">Profiles</h1>
            <p className="mb-4 text-sm text-ink-muted">
                First-login profile submissions from ADLGs and Secretaries, for verification.
            </p>

            {data.length === 0 ? (
                <EmptyState
                    icon="🧾"
                    title="No profile submissions yet"
                    subtitle="These populate once ADLG/Secretary accounts complete their first-login profile setup."
                />
            ) : (
                <Card>
                    <ul className="divide-y divide-border">
                        {data.map((p, i) => (
                            <li key={i} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold text-ink">{p.name}</div>
                                    <div className="text-xs text-ink-muted">{p.tehsil || p.union_council}</div>
                                </div>
                                <Badge tone={p.type === 'adlg' ? 'info' : 'success'}>
                                    {p.type === 'adlg' ? 'ADLG' : 'Secretary'}
                                </Badge>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}
