import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import DocumentPreviewModal, { DocumentLink } from '../../components/DocumentPreviewModal';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, ErrorText, Field, FullScreenSpinner, Modal, Select, Textarea, TextInput } from '../../components/ui';

const STATUS_TONE = {
    FORWARDED: 'info',
    PENDING_DDLG_APPROVAL: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    RETURNED: 'warning',
    REGISTERED: 'success',
};

/**
 * DDLG's one action on this module: the committee's decision (Rule 12(3)/(4)) on
 * 1–7 year and Abroad cases the ADLG has already reviewed and forwarded. 7+ year
 * (court decree) cases never reach DDLG — ADLG decides those directly.
 */
function ReviewModal({ deathCase, onClose }) {
    const queryClient = useQueryClient();
    const [action, setAction] = useState('');
    const [observations, setObservations] = useState('');
    const [orderNo, setOrderNo] = useState('');
    const [error, setError] = useState('');

    const close = () => {
        setAction('');
        setObservations('');
        setOrderNo('');
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/ddlg/death-cases/${deathCase.id}/review`, {
                action,
                observations,
                order_no: action === 'APPROVED' ? orderNo : undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ddlg-death-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not record decision.'),
    });

    return (
        <Modal open={!!deathCase} onClose={close} title="Committee Decision" subtitle={deathCase?.death_id}>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
                <div className="mb-3 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-ink-muted">
                    Committee: Deputy Director (Convener) · Assistant Director Tehsil (Member/Secretary) ·
                    Registration Office Official (Member) · NADRA Representative (Member) — Rule 12(3).
                </div>
                <Field label="Decision">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            ['APPROVED', '✅ Approve', 'border-primary-500 bg-primary-50 text-primary-700'],
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
                {action === 'APPROVED' && (
                    <Field label="Order Number">
                        <TextInput value={orderNo} onChange={(e) => setOrderNo(e.target.value)} required />
                    </Field>
                )}
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

function LdrDetailModal({ deathCaseId, onClose, onReview }) {
    const [previewDoc, setPreviewDoc] = useState(null);

    const { data: c, isLoading } = useQuery({
        queryKey: ['ddlg-death-case', deathCaseId],
        queryFn: () => client.get(`/api/ddlg/death-cases/${deathCaseId}`).then((r) => r.data.data),
        enabled: !!deathCaseId,
    });

    return (
        <Modal open={!!deathCaseId} onClose={onClose} title={c ? c.death_id : 'Application Detail'} subtitle={c?.union_council}>
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
                            ⏳ ADLG reviewed this and forwarded it to the committee for a final decision.
                        </div>
                    )}

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Deceased</div>
                        <div className="text-sm font-bold text-ink">{c.deceased.name} <span className="font-normal text-ink-faint">({c.deceased.gender})</span></div>
                        <div className="mt-1 text-xs text-ink-muted">Date of Death: {c.date_of_death} · Delay: {c.age_at_application} years</div>
                    </div>

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Applicant</div>
                        <div className="text-sm font-bold text-ink">{c.applicant.name}</div>
                        <div className="mt-1 text-xs text-ink-muted">{c.applicant.cnic} · {c.applicant.relation}</div>
                    </div>

                    {c.abroad && (
                        <div className="mb-3 rounded-xl border border-border p-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Death Abroad (Rule 15)</div>
                            <p className="text-xs text-ink">{c.abroad.country_of_death} · Passport {c.abroad.passport_no}</p>
                        </div>
                    )}

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
                        </div>
                    )}

                    <div className="flex gap-2">
                        <a
                            href={`${APP_BASE_PATH}/api/ddlg/death-cases/${c.id}/notesheet`}
                            target="_blank"
                            rel="noopener"
                            className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-surface-subtle"
                        >
                            📥 Notesheet
                        </a>
                        {c.status === 'PENDING_DDLG_APPROVAL' && (
                            <Button className="flex-1" onClick={() => onReview(c)}>
                                Committee Decision
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default function Ldr() {
    useEffect(() => setLastModule('ldr'), []);

    const [activeId, setActiveId] = useState(null);
    const [reviewTarget, setReviewTarget] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-death-cases', statusFilter],
        queryFn: () => client.get('/api/ddlg/death-cases', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    const pendingCount = data.filter((c) => c.status === 'PENDING_DDLG_APPROVAL').length;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Late Death Registration</h1>
                    <p className="text-sm text-ink-muted">Full registry for your district — committee decision for 1–7 year and Abroad cases</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-info">
                            {pendingCount} awaiting committee decision
                        </span>
                    )}
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-52">
                        <option value="">All statuses</option>
                        <option value="FORWARDED">Forwarded</option>
                        <option value="PENDING_DDLG_APPROVAL">Pending Committee Decision</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="RETURNED">Returned</option>
                        <option value="REGISTERED">Registered</option>
                    </Select>
                    <Button
                        variant="ghost"
                        onClick={() =>
                            window.open(
                                `${APP_BASE_PATH}/api/ddlg/death-cases-export${statusFilter ? `?status=${statusFilter}` : ''}`,
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
                        { title: 'LDR-ID', data: 'death_id' },
                        { title: 'Deceased', data: 'deceased.name' },
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

            <LdrDetailModal
                deathCaseId={activeId}
                onClose={() => setActiveId(null)}
                onReview={(c) => {
                    setActiveId(null);
                    setReviewTarget(c);
                }}
            />
            <ReviewModal deathCase={reviewTarget} onClose={() => setReviewTarget(null)} />
        </div>
    );
}
