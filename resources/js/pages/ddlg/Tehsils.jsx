import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Card, FullScreenSpinner } from '../../components/ui';

export default function Tehsils() {
    useEffect(() => setLastModule('teh'), []);

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-tehsils'],
        queryFn: () => client.get('/api/ddlg/tehsils').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-xl font-bold text-ink">Tehsils</h1>
                <p className="text-sm text-ink-muted">Every tehsil in your district — view only</p>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'District', data: 'district' },
                        { title: 'Union Councils', data: 'union_councils_count' },
                        { title: 'ADLG Assigned', data: 'adlg_activated' },
                    ]}
                    slots={{
                        3: (data) => <Badge tone={data ? 'success' : 'warning'}>{data ? 'Assigned' : 'Vacant'}</Badge>,
                    }}
                />
            </Card>
        </div>
    );
}
