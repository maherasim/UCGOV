import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, FullScreenSpinner, UsernameTag } from '../../components/ui';

export default function Secretaries() {
    useEffect(() => setLastModule('sec'), []);

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-secretaries'],
        queryFn: () => client.get('/api/ddlg/secretaries').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Secretaries</h1>
                    <p className="text-sm text-ink-muted">Every UC Secretary across your district — view only</p>
                </div>
                <Button variant="ghost" onClick={() => window.open(`${APP_BASE_PATH}/api/ddlg/secretaries-export`, '_blank')}>
                    📊 Export Excel
                </Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'Username', data: 'username' },
                        { title: 'Union Council', data: 'secretary_profile.union_council', defaultContent: '—' },
                        { title: 'Tehsil', data: 'secretary_profile.tehsil', defaultContent: '—' },
                        { title: 'Phone', data: 'phone', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                    ]}
                    slots={{
                        1: (data) => <UsernameTag username={data} />,
                        5: (data) => <Badge tone={data ? 'success' : 'danger'}>{data ? 'Active' : 'Inactive'}</Badge>,
                    }}
                />
            </Card>
        </div>
    );
}
