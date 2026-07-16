import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EyeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import { Badge, Card, EmptyState, Pagination, Spinner, TextInput, Modal } from '../../components/ui';

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
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [viewTarget, setViewTarget] = useState(null);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['admin-union-councils', search, page],
        queryFn: () =>
            client.get('/api/admin/union-councils', { params: { search: search || undefined, page } }).then((r) => r.data),
        placeholderData: keepPreviousData,
    });

    const ucs = data?.data || [];
    const meta = data?.meta;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Union Councils</h1>
                    <p className="text-sm text-ink-muted">Every Union Council across Punjab, A–Z{meta ? ` · ${meta.total} total` : ''}.</p>
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
                        placeholder="Search name, UC no., tehsil, district…"
                    />
                </div>
            </div>

            <Card className="overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Spinner className="h-8 w-8" />
                    </div>
                ) : ucs.length === 0 ? (
                    <EmptyState icon="🏘️" title="No Union Councils match your search" />
                ) : (
                    <>
                        <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-border bg-surface-subtle/60 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                                    <tr>
                                        <th className="px-4 py-3">Name</th>
                                        <th className="px-4 py-3">UC No.</th>
                                        <th className="px-4 py-3">Tehsil</th>
                                        <th className="px-4 py-3">District</th>
                                        <th className="px-4 py-3">Secretary</th>
                                        <th className="px-4 py-3">Geofence</th>
                                        <th className="px-4 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {ucs.map((uc) => (
                                        <tr key={uc.id} className="hover:bg-surface-subtle/60">
                                            <td className="px-4 py-3 font-medium text-ink">{uc.name}</td>
                                            <td className="px-4 py-3 text-ink-muted">{uc.uc_no ?? '—'}</td>
                                            <td className="px-4 py-3 text-ink-muted">{uc.tehsil || '—'}</td>
                                            <td className="px-4 py-3 text-ink-muted">{uc.district || '—'}</td>
                                            <td className="px-4 py-3">
                                                {uc.secretary || <Badge tone="warning">Vacant</Badge>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {uc.lat && uc.lng ? (
                                                    <Badge tone="success">Set · {uc.geofence_radius}m</Badge>
                                                ) : (
                                                    <Badge tone="neutral">Not set</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setViewTarget(uc)}
                                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                                    aria-label="View"
                                                    title="View"
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

            <UnionCouncilDetailModal uc={viewTarget} onClose={() => setViewTarget(null)} />
        </div>
    );
}
