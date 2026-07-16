import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EyeIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import { Badge, Card, EmptyState, Modal, Pagination, Spinner, TextInput, UsernameTag } from '../../components/ui';
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
                            <dd className="mt-0.5">
                                <UsernameTag username={secretary.username} />
                            </dd>
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
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [viewId, setViewId] = useState(null);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['admin-secretaries', search, page],
        queryFn: () => client.get('/api/admin/secretaries', { params: { search: search || undefined, page } }).then((r) => r.data),
        placeholderData: keepPreviousData,
    });

    const secretaries = data?.data || [];
    const meta = data?.meta;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Secretaries</h1>
                    <p className="text-sm text-ink-muted">Every Union Council Secretary across Punjab{meta ? ` · ${meta.total} total` : ''}.</p>
                </div>
            </div>

            <div className="relative mb-4 max-w-sm">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <div className="[&_input]:pl-9">
                    <TextInput
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search name, username, CNIC, phone, UC, tehsil, district…"
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="h-8 w-8" />
                    </div>
                ) : secretaries.length === 0 ? (
                    <EmptyState icon="🧑‍💼" title="No secretaries match your search" />
                ) : (
                    <>
                        <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-border bg-surface-subtle/60 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">Username</th>
                                        <th className="px-4 py-3">Union Council</th>
                                        <th className="px-4 py-3">Tehsil</th>
                                        <th className="px-4 py-3">District</th>
                                        <th className="px-4 py-3">Phone</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {secretaries.map((sec) => (
                                        <tr key={sec.id} className="hover:bg-surface-subtle/60">
                                            <td className="px-4 py-3 font-medium text-ink">{sec.name}</td>
                                            <td className="px-4 py-3">
                                                <UsernameTag username={sec.username} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-ink-muted">{sec.secretary_profile?.union_council || '—'}</span>
                                                    {sec.secretary_profile?.additional_charges?.length > 0 && (
                                                        <span
                                                            title={`Additional charge: ${sec.secretary_profile.additional_charges
                                                                .map((c) => c.union_council)
                                                                .join(', ')}`}
                                                        >
                                                            <Badge tone="info">+{sec.secretary_profile.additional_charges.length}</Badge>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-ink-muted">{sec.secretary_profile?.tehsil || '—'}</td>
                                            <td className="px-4 py-3 text-ink-muted">{sec.secretary_profile?.district || '—'}</td>
                                            <td className="px-4 py-3 text-ink-muted">{sec.phone ? formatPhone(sec.phone) : '—'}</td>
                                            <td className="px-4 py-3">
                                                <Badge tone={sec.active ? 'success' : 'danger'}>{sec.active ? 'Active' : 'Inactive'}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setViewId(sec.id)}
                                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                                    aria-label="Show"
                                                    title="Show"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination meta={meta} onPageChange={setPage} />
                    </>
                )}
            </Card>

            <SecretaryDetailModal secretaryId={viewId} onClose={() => setViewId(null)} />
        </div>
    );
}
