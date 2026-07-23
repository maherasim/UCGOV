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
 * ADLG's review. For 7+ (court decree) this IS the final decision — Approve here
 * registers-ready immediately. For 1–7/ABROAD, ADLG is only the committee's
 * "Member/Secretary" (Rule 12(3)) — Approve just forwards to DDLG for the actual
 * committee decision, so the order-number field only makes sense for 7+.
 */
function ReviewModal({ deathCase, onClose }) {
    const queryClient = useQueryClient();
    const [action, setAction] = useState('');
    const [observations, setObservations] = useState('');
    const [orderNo, setOrderNo] = useState('');
    const [error, setError] = useState('');
    const isFinal = deathCase?.category === '7+';

    const close = () => {
        setAction('');
        setObservations('');
        setOrderNo('');
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/adlg/death-cases/${deathCase.id}/review`, {
                action,
                observations,
                order_no: action === 'APPROVED' && isFinal ? orderNo : undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-death-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not record decision.'),
    });

    return (
        <Modal open={!!deathCase} onClose={close} title="Review Application" subtitle={deathCase?.death_id}>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
                {!isFinal && (
                    <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-info">
                        This category requires DDLG committee approval — Approve here forwards it, it does not register the case.
                    </div>
                )}
                <Field label="Decision">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            ['APPROVED', isFinal ? '✅ Approve' : '➡️ Forward to DDLG', 'border-primary-500 bg-primary-50 text-primary-700'],
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
                {action === 'APPROVED' && isFinal && (
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
        queryKey: ['adlg-death-case', deathCaseId],
        queryFn: () => client.get(`/api/adlg/death-cases/${deathCaseId}`).then((r) => r.data.data),
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

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Deceased</div>
                        <div className="text-sm font-bold text-ink">{c.deceased.name} <span className="font-normal text-ink-faint">({c.deceased.gender})</span></div>
                        <div className="mt-1 text-xs text-ink-muted">Date of Death: {c.date_of_death} · Delay: {c.age_at_application} years</div>
                        {c.deceased.cause_of_death && <div className="text-xs text-ink-muted">Cause: {c.deceased.cause_of_death}</div>}
                    </div>

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Applicant</div>
                        <div className="text-sm font-bold text-ink">{c.applicant.name}</div>
                        <div className="mt-1 text-xs text-ink-muted">{c.applicant.cnic} · {c.applicant.relation}</div>
                        {c.applicant.address && <div className="text-xs text-ink-muted">{c.applicant.address}</div>}
                    </div>

                    {c.court_decree && (
                        <div className="mb-3 rounded-xl border border-border p-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Court Decree (Rule 13)</div>
                            <p className="text-xs text-ink">No. {c.court_decree.decree_no} · {c.court_decree.decree_date} · {c.court_decree.court_name}</p>
                        </div>
                    )}

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

                    <div className="mb-3 rounded-xl border border-border p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Documents ({c.documents.length})</div>
                        {c.documents.length === 0 ? (
                            <p className="text-xs text-ink-faint">No documents.</p>
                        ) : (
                            <div className="space-y-1.5">
                                {c.documents.map((d) => (
                                    <DocumentLink key={d.doc_key} label={d.label} fileUrl={d.file_url} onPreview={setPreviewDoc} />
                                ))}
                            </div>
                        )}
                    </div>

                    <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

                    {c.ddlg_observations && (
                        <div className="mb-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-accent-600">DDLG Committee Observations</div>
                            <p className="text-xs text-ink">{c.ddlg_observations}</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <a
                            href={`${APP_BASE_PATH}/api/adlg/death-cases/${c.id}/notesheet`}
                            target="_blank"
                            rel="noopener"
                            className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-surface-subtle"
                        >
                            📥 Notesheet
                        </a>
                        {c.status === 'FORWARDED' && (
                            <Button className="flex-1" onClick={() => onReview(c)}>
                                Review Decision
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
        queryKey: ['adlg-death-cases', statusFilter],
        queryFn: () => client.get('/api/adlg/death-cases', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    const pendingCount = data.filter((c) => c.status === 'FORWARDED').length;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Late Death Registration</h1>
                    <p className="text-sm text-ink-muted">Review applications forwarded by Secretaries</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-info">
                            {pendingCount} awaiting review
                        </span>
                    )}
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
                        <option value="">All statuses</option>
                        <option value="FORWARDED">Forwarded</option>
                        <option value="PENDING_DDLG_APPROVAL">Pending DDLG Committee</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="RETURNED">Returned</option>
                        <option value="REGISTERED">Registered</option>
                    </Select>
                    <Button
                        variant="ghost"
                        onClick={() =>
                            window.open(
                                `${APP_BASE_PATH}/api/adlg/death-cases-export${statusFilter ? `?status=${statusFilter}` : ''}`,
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
