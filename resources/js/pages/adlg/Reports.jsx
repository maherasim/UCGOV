import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Card, FullScreenSpinner } from '../../components/ui';

export default function Reports() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-reports'],
        queryFn: () => client.get('/api/adlg/reports').then((r) => r.data.data),
    });

    const reviewMutation = useMutation({
        mutationFn: (id) => client.patch(`/api/adlg/reports/${id}/mark-reviewed`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adlg-reports'] }),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <h1 className="mb-4 text-xl font-bold text-ink">Secretary Reports</h1>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Date', data: 'report_date' },
                        { title: 'Secretary', data: 'secretary' },
                        { title: 'UC', data: 'union_council' },
                        { title: 'Nikah', data: 'nikah_count' },
                        { title: 'Birth', data: 'birth_count' },
                        { title: 'Death', data: 'death_count' },
                        { title: 'Complaints', data: 'complaint_count' },
                        { title: 'Status', data: 'reviewed' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        7: (data) => <Badge tone={data ? 'success' : 'warning'}>{data ? 'Reviewed' : 'Pending'}</Badge>,
                        8: (data, row) => (
                            <div className="flex justify-end">
                                {!row.reviewed && (
                                    <button
                                        onClick={() => reviewMutation.mutate(row.id)}
                                        className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                        aria-label="Mark Reviewed"
                                    >
                                        <CheckIcon className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ),
                    }}
                />
            </Card>
        </div>
    );
}
