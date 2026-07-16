import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Card, FullScreenSpinner, Modal } from '../../components/ui';

function UnionCouncilDetailModal({ uc, onClose }) {
    if (!uc) return null;

    return (
        <Modal open={!!uc} onClose={onClose} title={uc.name} subtitle={[uc.tehsil, uc.district].filter(Boolean).join(', ')}>
            <dl className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <dt className="text-[11px] font-bold uppercase text-ink-muted">UC No.</dt>
                        <dd className="mt-0.5 font-medium text-ink">{uc.uc_no ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-bold uppercase text-ink-muted">Code</dt>
                        <dd className="mt-0.5 font-medium text-ink">{uc.code || '—'}</dd>
                    </div>
                </div>
                <div>
                    <dt className="text-[11px] font-bold uppercase text-ink-muted">Address</dt>
                    <dd className="mt-0.5 font-medium text-ink">{uc.address || '—'}</dd>
                </div>
                <div>
                    <dt className="text-[11px] font-bold uppercase text-ink-muted">Secretary</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                        {uc.secretary || <Badge tone="warning">Vacant</Badge>}
                    </dd>
                </div>
                <div>
                    <dt className="text-[11px] font-bold uppercase text-ink-muted">Geofence</dt>
                    <dd className="mt-0.5">
                        {uc.lat && uc.lng ? (
                            <Badge tone="success">
                                {uc.lat}, {uc.lng} · {uc.geofence_radius}m
                            </Badge>
                        ) : (
                            <Badge tone="neutral">Not set</Badge>
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="text-[11px] font-bold uppercase text-ink-muted">Status</dt>
                    <dd className="mt-0.5">
                        <Badge tone={uc.active ? 'success' : 'danger'}>{uc.active ? 'Active' : 'Inactive'}</Badge>
                    </dd>
                </div>
            </dl>
            <p className="mt-4 text-xs text-ink-muted">
                Editing (name, geofence, address) is managed by the tehsil's ADLG from their Union Councils page.
            </p>
        </Modal>
    );
}

export default function UnionCouncils() {
    const [viewTarget, setViewTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-union-councils'],
        queryFn: () => client.get('/api/admin/union-councils').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Union Councils</h1>
                    <p className="text-sm text-ink-muted">All {data.length} Union Councils across Punjab, A–Z.</p>
                </div>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'UC No.', data: 'uc_no', defaultContent: '—' },
                        { title: 'Tehsil', data: 'tehsil', defaultContent: '—' },
                        { title: 'District', data: 'district', defaultContent: '—' },
                        { title: 'Secretary', data: 'secretary' },
                        { title: 'Geofence', data: 'lat' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        4: (data) => (data ? data : <Badge tone="warning">Vacant</Badge>),
                        5: (data, row) =>
                            row.lat && row.lng ? (
                                <Badge tone="success">Set · {row.geofence_radius}m</Badge>
                            ) : (
                                <Badge tone="neutral">Not set</Badge>
                            ),
                        6: (data, row) => (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setViewTarget(row)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="View"
                                    title="View"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <UnionCouncilDetailModal uc={viewTarget} onClose={() => setViewTarget(null)} />
        </div>
    );
}
