import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Card, FullScreenSpinner, UsernameTag } from '../../components/ui';

export default function Adlgs() {
    useEffect(() => setLastModule('adlg'), []);

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-adlgs'],
        queryFn: () => client.get('/api/ddlg/adlgs').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4">
                <h1 className="text-xl font-bold text-ink">ADLGs</h1>
                <p className="text-sm text-ink-muted">Every ADLG across your district's tehsils — view only</p>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'Username', data: 'username' },
                        { title: 'Tehsil', data: 'adlg_profile.tehsil', defaultContent: '—' },
                        { title: 'Grade', data: 'adlg_profile.grade', defaultContent: '—' },
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
