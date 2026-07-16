import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Card, FullScreenSpinner, Modal } from '../../components/ui';
import { formatCnic, formatPhone } from '../../utils/format';

function SecretaryDetailModal({ secretaryId, onClose }) {
    const { data: secretary, isLoading } = useQuery({
        queryKey: ['admin-secretary', secretaryId],
        queryFn: () => client.get(`/api/admin/secretaries/${secretaryId}`).then((r) => r.data.data),
        enabled: !!secretaryId,
    });

    const charges = secretary?.secretary_profile?.additional_charges || [];

    return (
        <Modal
            open={!!secretaryId}
            onClose={onClose}
            title={secretary?.name || 'Secretary'}
            subtitle={secretary ? [secretary.secretary_profile?.union_council, secretary.secretary_profile?.tehsil].filter(Boolean).join(' · ') : ''}
        >
            {isLoading || !secretary ? (
                <div className="py-8 text-center text-sm text-ink-muted">Loading…</div>
            ) : (
                <dl className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <dt className="text-[11px] font-bold uppercase text-ink-muted">Username</dt>
                            <dd className="mt-0.5 font-medium text-ink">@{secretary.username}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] font-bold uppercase text-ink-muted">Status</dt>
                            <dd className="mt-0.5">
                                <Badge tone={secretary.active ? 'success' : 'danger'}>{secretary.active ? 'Active' : 'Inactive'}</Badge>
                            </dd>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <dt className="text-[11px] font-bold uppercase text-ink-muted">Father's Name</dt>
                            <dd className="mt-0.5 font-medium text-ink">{secretary.secretary_profile?.father_name || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] font-bold uppercase text-ink-muted">Email</dt>
                            <dd className="mt-0.5 font-medium text-ink">{secretary.email || '—'}</dd>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <dt className="text-[11px] font-bold uppercase text-ink-muted">CNIC</dt>
                            <dd className="mt-0.5 font-medium text-ink">{secretary.cnic ? formatCnic(secretary.cnic) : '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-[11px] font-bold uppercase text-ink-muted">Phone</dt>
                            <dd className="mt-0.5 font-medium text-ink">{secretary.phone ? formatPhone(secretary.phone) : '—'}</dd>
                        </div>
                    </div>
                    <div>
                        <dt className="text-[11px] font-bold uppercase text-ink-muted">Union Council</dt>
                        <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-ink">
                            {secretary.secretary_profile?.union_council || '—'}
                            {secretary.secretary_profile?.geofence_set === false && (
                                <span title="This Union Council has no geofence set.">
                                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                                </span>
                            )}
                        </dd>
                        <dd className="mt-0.5 text-xs text-ink-muted">
                            {[secretary.secretary_profile?.tehsil, secretary.secretary_profile?.district].filter(Boolean).join(', ')}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11px] font-bold uppercase text-ink-muted">Additional Charges</dt>
                        {charges.length === 0 ? (
                            <dd className="mt-0.5 text-ink-muted">None</dd>
                        ) : (
                            <dd className="mt-1 flex flex-wrap gap-1.5">
                                {charges.map((c) => (
                                    <Badge key={c.union_council_id} tone="info">
                                        {c.union_council}
                                    </Badge>
                                ))}
                            </dd>
                        )}
                    </div>
                </dl>
            )}
            <p className="mt-4 text-xs text-ink-muted">
                Creating, editing, or resetting this account is managed by the tehsil's ADLG from their Secretaries page.
            </p>
        </Modal>
    );
}

export default function Secretaries() {
    const [viewId, setViewId] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-secretaries'],
        queryFn: () => client.get('/api/admin/secretaries').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Secretaries</h1>
                    <p className="text-sm text-ink-muted">All {data.length} Union Council Secretaries across Punjab.</p>
                </div>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'Username', data: 'username', render: (d) => `@${d}` },
                        { title: 'Union Council', data: 'secretary_profile.union_council', defaultContent: '—' },
                        { title: 'Tehsil', data: 'secretary_profile.tehsil', defaultContent: '—' },
                        { title: 'District', data: 'secretary_profile.district', defaultContent: '—' },
                        { title: 'Phone', data: 'phone', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        2: (data, row) => (
                            <div className="flex items-center gap-1.5">
                                <span>{data || '—'}</span>
                                {row.secretary_profile?.additional_charges?.length > 0 && (
                                    <span
                                        title={`Additional charge: ${row.secretary_profile.additional_charges
                                            .map((c) => c.union_council)
                                            .join(', ')}`}
                                    >
                                        <Badge tone="info">+{row.secretary_profile.additional_charges.length}</Badge>
                                    </span>
                                )}
                            </div>
                        ),
                        6: (data) => <Badge tone={data ? 'success' : 'danger'}>{data ? 'Active' : 'Inactive'}</Badge>,
                        7: (data, row) => (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setViewId(row.id)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="Show"
                                    title="Show"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <SecretaryDetailModal secretaryId={viewId} onClose={() => setViewId(null)} />
        </div>
    );
}
