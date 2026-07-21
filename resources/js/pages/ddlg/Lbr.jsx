import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import DocumentPreviewModal, { DocumentLink } from '../../components/DocumentPreviewModal';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, ErrorText, Field, FullScreenSpinner, Modal, Select, Textarea } from '../../components/ui';

const STATUS_TONE = {
    FORWARDED: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    RETURNED: 'warning',
    REGISTERED: 'success',
    PENDING_DELAY_APPROVAL: 'info',
    PENDING_DDLG_APPROVAL: 'info',
    DELAY_APPROVED: 'success',
    DELAY_RETURNED: 'warning',
};

/**
 * DDLG's one action on this module: the final sign-off on whether a 7+ year delay
 * is acceptable, for a case the ADLG has already reviewed and forwarded. Everything
 * else about the case (the actual birth-registration paperwork) stays with ADLG,
 * exactly as a normal 1–7 year case — DDLG never touches that decision.
 */
function ReviewDelayModal({ lbrCase, onClose }) {
    const queryClient = useQueryClient();
    const [action, setAction] = useState('');
    const [observations, setObservations] = useState('');
    const [error, setError] = useState('');

    const close = () => {
        setAction('');
        setObservations('');
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/ddlg/lbr-cases/${lbrCase.id}/review-delay-request`, { action, observations }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ddlg-lbr-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not record decision.'),
    });

    return (
        <Modal open={!!lbrCase} onClose={close} title="Final Delay Approval" subtitle={lbrCase?.lbr_id}>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
                <Field label="Decision">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            ['APPROVED', '✅ Approve Delay', 'border-primary-500 bg-primary-50 text-primary-700'],
                            ['REJECTED', '❌ Reject', 'border-danger bg-red-50 text-danger'],
                            ['RETURNED', '↩️ Return', 'border-accent-500 bg-accent-100 text-accent-700'],
                        ].map(([key, label, activeClass]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setAction(key)}
                                className={`rounded-lg border-2 px-2 py-2 text-xs font-semibold ${action === key ? activeClass : 'border-border bg-surface text-ink-muted'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Observations">
                    <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Required for all decisions…" required />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="w-full" disabled={mutation.isPending || !action}>
                    {mutation.isPending ? 'Saving…' : 'Record Decision'}
                </Button>
            </form>
        </Modal>
    );
}

function LbrDetailModal({ lbrCaseId, onClose, onReviewDelay }) {
    const [previewDoc, setPreviewDoc] = useState(null);

    const { data: c, isLoading } = useQuery({
        queryKey: ['ddlg-lbr-case', lbrCaseId],
        queryFn: () => client.get(`/api/ddlg/lbr-cases/${lbrCaseId}`).then((r) => r.data.data),
        enabled: !!lbrCaseId,
    });

    return (
        <Modal open={!!lbrCaseId} onClose={onClose} title={c ? c.lbr_id : 'Application Detail'} subtitle={c?.union_council}>
            {isLoading || !c ? (
                <FullScreenSpinner />
            ) : (
                <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone="neutral">{c.category_label}</Badge>
                        <Badge tone={STATUS_TONE[c.status]}>{c.status_label}</Badge>
                    </div>

                    {c.status === 'PENDING_DDLG_APPROVAL' && (
                        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-info">
                            ⏳ ADLG approved this delay and forwarded it to you for final sign-off.
                        </div>
                    )}

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Child</div>
                        <div className="text-sm font-bold text-ink">{c.child.name} <span className="font-normal text-ink-faint">({c.child.gender})</span></div>
                        <div className="mt-1 text-xs text-ink-muted">DOB: {c.dob} · Age at application: {c.age_at_application} years</div>
                        {c.child.birth_place && <div className="text-xs text-ink-muted">Birth Place: {c.child.birth_place}</div>}
                    </div>

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Applicant</div>
                        <div className="text-sm font-bold text-ink">{c.applicant.name}</div>
                        <div className="mt-1 text-xs text-ink-muted">{c.applicant.cnic} · {c.applicant.relation}</div>
                        {c.applicant.address && <div className="text-xs text-ink-muted">{c.applicant.address}</div>}
                    </div>

                    <div className="mb-3 rounded-xl border border-border p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Reason for Delay</div>
                        <p className="text-xs text-ink">{c.delay_reason}</p>
                        {c.secretary_remarks && <p className="mt-1.5 text-xs italic text-ink-muted">Secretary: &ldquo;{c.secretary_remarks}&rdquo;</p>}
                    </div>

                    {c.documents.length > 0 && (
                        <div className="mb-3 rounded-xl border border-border p-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Documents ({c.documents.length})</div>
                            <div className="space-y-1.5">
                                {c.documents.map((d) => (
                                    <DocumentLink key={d.doc_key} label={d.label} fileUrl={d.file_url} onPreview={setPreviewDoc} />
                                ))}
                            </div>
                        </div>
                    )}

                    <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

                    {c.adlg_observations && (
                        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-info">ADLG Observations</div>
                            <p className="text-xs text-ink">{c.adlg_observations}</p>
                            {c.adlg_order_no && <p className="mt-1 text-xs font-semibold text-ink">Order No: {c.adlg_order_no}</p>}
                        </div>
                    )}

                    {c.ddlg_observations && (
                        <div className="mb-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-accent-600">DDLG Observations</div>
                            <p className="text-xs text-ink">{c.ddlg_observations}</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <a
                            href={`${APP_BASE_PATH}/api/ddlg/lbr-cases/${c.id}/notesheet`}
                            target="_blank"
                            rel="noopener"
                            className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-surface-subtle"
                        >
                            📥 Notesheet
                        </a>
                        {c.status === 'PENDING_DDLG_APPROVAL' && (
                            <Button className="flex-1" onClick={() => onReviewDelay(c)}>
                                Review Delay Request
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default function Lbr() {
    useEffect(() => setLastModule('lbr'), []);

    const [activeId, setActiveId] = useState(null);
    const [reviewTarget, setReviewTarget] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-lbr-cases', statusFilter],
        queryFn: () => client.get('/api/ddlg/lbr-cases', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    const pendingCount = data.filter((c) => c.status === 'PENDING_DDLG_APPROVAL').length;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Delayed Birth Registration</h1>
                    <p className="text-sm text-ink-muted">Full registry for your district — final delay approval for Over-7-Years cases</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-info">
                            {pendingCount} awaiting your approval
                        </span>
                    )}
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-52">
                        <option value="">All statuses</option>
                        <option value="PENDING_DELAY_APPROVAL">Pending ADLG Delay Approval</option>
                        <option value="PENDING_DDLG_APPROVAL">Pending My Final Approval</option>
                        <option value="DELAY_APPROVED">Delay Approved</option>
                        <option value="DELAY_RETURNED">Delay Returned</option>
                        <option value="FORWARDED">Forwarded</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="RETURNED">Returned</option>
                        <option value="REGISTERED">Registered</option>
                    </Select>
                    <Button
                        variant="ghost"
                        onClick={() =>
                            window.open(
                                `${APP_BASE_PATH}/api/ddlg/lbr-cases-export${statusFilter ? `?status=${statusFilter}` : ''}`,
                                '_blank'
                            )
                        }
                    >
                        📊 Export Excel
                    </Button>
                </div>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'LBR-ID', data: 'lbr_id' },
                        { title: 'Child', data: 'child.name' },
                        { title: 'Union Council', data: 'union_council' },
                        { title: 'Category', data: 'category_label' },
                        { title: 'Status', data: 'status_label' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        4: (data, row) => <Badge tone={STATUS_TONE[row.status]}>{data}</Badge>,
                        5: (data, row) => (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setActiveId(row.id)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="View"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <LbrDetailModal
                lbrCaseId={activeId}
                onClose={() => setActiveId(null)}
                onReviewDelay={(c) => {
                    setActiveId(null);
                    setReviewTarget(c);
                }}
            />
            <ReviewDelayModal lbrCase={reviewTarget} onClose={() => setReviewTarget(null)} />
        </div>
    );
}
