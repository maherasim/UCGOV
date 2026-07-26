import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, FullScreenSpinner } from '../../components/ui';

export default function UnionCouncils() {
    useEffect(() => setLastModule('uc'), []);

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-union-councils'],
        queryFn: () => client.get('/api/ddlg/union-councils').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Union Councils</h1>
                    <p className="text-sm text-ink-muted">Every UC across every tehsil in your district — view only</p>
                </div>
                <Button variant="ghost" onClick={() => window.open(`${APP_BASE_PATH}/api/ddlg/union-councils-export`, '_blank')}>
                    📊 Export Excel
                </Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'UC No.', data: 'uc_no' },
                        { title: 'Name', data: 'name' },
                        { title: 'Tehsil', data: 'tehsil' },
                        { title: 'Secretary', data: 'secretary', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                    ]}
                    slots={{
                        4: (data) => <Badge tone={data ? 'success' : 'danger'}>{data ? 'Active' : 'Inactive'}</Badge>,
                    }}
                />
            </Card>
        </div>
    );
}
