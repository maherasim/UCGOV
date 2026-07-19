import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { AddHearingForm, CaseDocumentButtons, ProceedingsList } from '../../components/CaseProceedings';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import {
    Badge,
    Button,
    Card,
    ErrorText,
    Field,
    FullScreenSpinner,
    Modal,
    Select,
    Textarea,
    TextInput,
} from '../../components/ui';

const STATUS_TONE = {
    SUBMITTED: 'info',
    SEEN: 'accent',
    NOTICE_ISSUED: 'accent',
    ARB_CONSTITUTED: 'accent',
    IN_PROCEEDINGS: 'accent',
    DISPOSED_RECONCILED: 'success',
    DISPOSED_EFFECTIVE: 'danger',
    FILED_NON_RESPONSE: 'neutral',
};

const STAGES = [
    { key: 'SUBMITTED', label: 'Submitted to ADLG' },
    { key: 'SEEN', label: 'Seen by ADLG' },
    { key: 'NOTICE_ISSUED', label: 'Notice Issued' },
    { key: 'ARB_CONSTITUTED', label: 'Arbitration Constituted' },
    { key: 'FINAL', label: 'Final Decision' },
];

const STAGE_ORDER = ['SUBMITTED', 'SEEN', 'NOTICE_ISSUED', 'ARB_CONSTITUTED', 'FINAL'];
const DISPOSED_STAGES = ['DISPOSED_RECONCILED', 'DISPOSED_EFFECTIVE', 'FILED_NON_RESPONSE'];
const ACTIVE_HEARING_STATUSES = ['NOTICE_ISSUED', 'ARB_CONSTITUTED', 'IN_PROCEEDINGS'];

function currentStageIndex(status) {
    if (status.startsWith('DISPOSED') || status === 'FILED_NON_RESPONSE') return 4;
    if (status === 'IN_PROCEEDINGS') return STAGE_ORDER.indexOf('ARB_CONSTITUTED');
    return STAGE_ORDER.indexOf(status);
}

function InfoBox({ title, tone, rows }) {
    return (
        <div className={`mb-3 rounded-xl border p-3 ${tone}`}>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide opacity-80">{title}</div>
            {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between border-t border-black/5 py-1.5 text-xs first:border-0 first:pt-0">
                    <span className="opacity-70">{label}</span>
                    <span className="font-medium">{value ?? '—'}</span>
                </div>
            ))}
        </div>
    );
}

function IssueNoticeForm({ caseId, onDone }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ notice_no: '', issue_date: new Date().toISOString().slice(0, 10), hearing_date: '' });
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () => client.post(`/api/adlg/cases/${caseId}/issue-notice`, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-cases'] });
            queryClient.invalidateQueries({ queryKey: ['adlg-case', caseId] });
            onDone();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not issue notice.'),
    });

    return (
        <form
            className="mt-3 rounded-xl border border-border bg-surface-subtle p-3"
            onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
            }}
        >
            <Field label="Notice No.">
                <TextInput value={form.notice_no} onChange={(e) => setForm({ ...form, notice_no: e.target.value })} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Issue Date">
                    <TextInput
                        type="date"
                        value={form.issue_date}
                        onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                        required
                    />
                </Field>
                <Field label="Hearing Date">
                    <TextInput
                        type="date"
                        value={form.hearing_date}
                        onChange={(e) => setForm({ ...form, hearing_date: e.target.value })}
                        required
                    />
                </Field>
            </div>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Issuing…' : 'Confirm & Issue Notice'}
            </Button>
        </form>
    );
}

const DECISION_OPTIONS = [
    { value: 'DISPOSED_RECONCILED', label: '✅ Reconciled', tone: 'border-primary-500 bg-primary-50' },
    { value: 'DISPOSED_EFFECTIVE', label: '⚖️ Effective', tone: 'border-danger bg-red-50' },
    { value: 'FILED_NON_RESPONSE', label: '📁 Filed — Non-Response', tone: 'border-ink-faint bg-surface-subtle' },
];

function PassDecisionForm({ caseId, onDone }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({ type: '', order_no: '', remarks: '' });
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () => client.post(`/api/adlg/cases/${caseId}/pass-decision`, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-cases'] });
            queryClient.invalidateQueries({ queryKey: ['adlg-case', caseId] });
            onDone();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not pass decision.'),
    });

    return (
        <form
            className="mt-3 rounded-xl border border-border bg-surface-subtle p-3"
            onSubmit={(e) => {
                e.preventDefault();
                if (!form.type) {
                    setError('Select a decision type.');
                    return;
                }
                mutation.mutate();
            }}
        >
            <Field label="Decision">
                <div className="space-y-2">
                    {DECISION_OPTIONS.map((opt) => (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => setForm({ ...form, type: opt.value })}
                            className={`w-full rounded-lg border-2 px-3 py-2 text-left text-sm font-medium ${
                                form.type === opt.value ? opt.tone : 'border-border bg-surface'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="Order No.">
                <TextInput value={form.order_no} onChange={(e) => setForm({ ...form, order_no: e.target.value })} required />
            </Field>
            <Field label="Remarks">
                <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Confirm Decision'}
            </Button>
        </form>
    );
}

function CaseDetailModal({ caseId, onClose }) {
    const queryClient = useQueryClient();
    const [showNoticeForm, setShowNoticeForm] = useState(false);
    const [showDecisionForm, setShowDecisionForm] = useState(false);
    const [showHearingForm, setShowHearingForm] = useState(false);

    const { data: c, isLoading } = useQuery({
        queryKey: ['adlg-case', caseId],
        queryFn: () => client.get(`/api/adlg/cases/${caseId}`).then((r) => r.data.data),
        enabled: !!caseId,
    });

    const markSeenMutation = useMutation({
        mutationFn: () => client.post(`/api/adlg/cases/${caseId}/mark-seen`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-cases'] });
            queryClient.invalidateQueries({ queryKey: ['adlg-case', caseId] });
        },
    });

    const close = () => {
        setShowNoticeForm(false);
        setShowDecisionForm(false);
        setShowHearingForm(false);
        onClose();
    };

    return (
        <Modal open={!!caseId} onClose={close} title={c ? c.case_no : 'Case Detail'} subtitle={c?.union_council}>
            {isLoading || !c ? (
                <FullScreenSpinner />
            ) : (
                <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone={c.type === 'divorce' ? 'danger' : 'accent'}>{c.type === 'divorce' ? '💔 Divorce' : '🏛️ Khula'}</Badge>
                        <Badge tone={STATUS_TONE[c.status]}>{c.status_label}</Badge>
                        {c.is_urgent && <Badge tone="danger">🚨 Urgent</Badge>}
                    </div>

                    <div className="mb-2 text-sm font-bold text-ink">
                        {c.divorcer_name} <span className="font-normal text-ink-faint">vs</span> {c.respondent_name}
                    </div>
                    <div className="mb-3">
                        {c.attachment_url ? (
                            <a href={c.attachment_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600 hover:underline">
                                📎 View attached document
                            </a>
                        ) : (
                            <span className="text-xs text-ink-faint">📎 No document attached</span>
                        )}
                    </div>

                    {c.days_remaining !== null && (
                        <div
                            className={`mb-4 rounded-xl border p-3 text-xs font-semibold ${
                                c.days_remaining <= 3 ? 'border-red-200 bg-red-50 text-danger' : 'border-accent-400/30 bg-accent-100 text-accent-600'
                            }`}
                        >
                            90-Day Period: {Math.max(0, c.days_remaining)} days remaining
                            {c.days_remaining <= 3 && ' — HIGH PRIORITY'}
                        </div>
                    )}

                    {/* Timeline stepper */}
                    <div className="mb-4">
                        {STAGES.map((s, i) => {
                            const cur = currentStageIndex(c.status);
                            const done = cur > i || (i === 4 && cur === 4);
                            const active = cur === i && i !== 4;
                            const item =
                                i === 4
                                    ? c.timeline?.find((t) => DISPOSED_STAGES.includes(t.stage))
                                    : c.timeline?.find((t) => t.stage === s.key);
                            const last = i === STAGES.length - 1;

                            return (
                                <div key={s.key} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                done
                                                    ? 'bg-primary-500 text-white'
                                                    : active
                                                      ? 'bg-accent-500 text-white'
                                                      : 'bg-surface-subtle text-ink-faint'
                                            }`}
                                        >
                                            {done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                                        </div>
                                        {!last && <div className="w-px flex-1 bg-border" />}
                                    </div>
                                    <div className={`min-w-0 flex-1 ${last ? 'pb-1' : 'pb-4'}`}>
                                        <div className={`text-xs font-semibold ${done ? 'text-ink' : active ? 'text-accent-600' : 'text-ink-faint'}`}>
                                            {s.label}
                                        </div>
                                        {item && (
                                            <div className="mt-0.5 text-[11px] text-ink-muted">
                                                {item.event_date} · {item.actor || 'System'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <InfoBox
                            title={c.type === 'divorce' ? 'Divorcer (H)' : 'Divorcer (W)'}
                            tone="border-red-100 bg-red-50/50"
                            rows={[
                                ['Name', c.divorcer_name],
                                ['CNIC', c.divorcer_cnic],
                                ['Phone', c.divorcer_phone],
                            ]}
                        />
                        <InfoBox
                            title={c.type === 'divorce' ? 'Respondent (W)' : 'Respondent (H)'}
                            tone="border-slate-200 bg-slate-50"
                            rows={[
                                ['Name', c.respondent_name],
                                ['CNIC', c.respondent_cnic],
                                ['Phone', c.respondent_phone],
                            ]}
                        />
                    </div>

                    {c.notice && (
                        <InfoBox
                            title="📬 Notice Details"
                            tone="border-blue-200 bg-blue-50"
                            rows={[
                                ['Notice No.', c.notice.notice_no],
                                ['Issued', c.notice.issue_date],
                                ['Hearing', c.notice.hearing_date],
                            ]}
                        />
                    )}
                    {c.arbitration && (
                        <InfoBox
                            title="⚖️ Arbitration Council"
                            tone="border-purple-200 bg-purple-50"
                            rows={[
                                ['Husband Rep', `${c.arbitration.husband_rep_name} · ${c.arbitration.husband_rep_designation || '—'}`],
                                ['Wife Rep', `${c.arbitration.wife_rep_name} · ${c.arbitration.wife_rep_designation || '—'}`],
                            ]}
                        />
                    )}
                    {c.decision && (
                        <InfoBox
                            title="✅ Final Decision"
                            tone="border-primary-100 bg-primary-50"
                            rows={[
                                ['Order No.', c.decision.order_no],
                                ['Date', c.decision.decided_at],
                                ['Remarks', c.decision.remarks],
                            ]}
                        />
                    )}

                    {c.status === 'SUBMITTED' && (
                        <Button className="mb-3 w-full" onClick={() => markSeenMutation.mutate()} disabled={markSeenMutation.isPending}>
                            {markSeenMutation.isPending ? 'Marking…' : '👁 Mark as Seen'}
                        </Button>
                    )}

                    {c.status === 'SEEN' && !showNoticeForm && (
                        <Button className="mb-3 w-full" onClick={() => setShowNoticeForm(true)}>
                            📬 Issue Notice to Parties
                        </Button>
                    )}
                    {c.status === 'SEEN' && showNoticeForm && <IssueNoticeForm caseId={c.id} onDone={() => setShowNoticeForm(false)} />}

                    {c.status === 'NOTICE_ISSUED' && !c.arbitration && (
                        <div className="mb-3 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-ink-muted">
                            Awaiting Arbitration Council constitution by the Secretary.
                        </div>
                    )}

                    {['ARB_CONSTITUTED', 'IN_PROCEEDINGS'].includes(c.status) && !showDecisionForm && (
                        <Button className="mb-3 w-full" onClick={() => setShowDecisionForm(true)}>
                            📋 Pass Final Decision
                        </Button>
                    )}
                    {['ARB_CONSTITUTED', 'IN_PROCEEDINGS'].includes(c.status) && showDecisionForm && (
                        <PassDecisionForm caseId={c.id} onDone={() => setShowDecisionForm(false)} />
                    )}

                    {ACTIVE_HEARING_STATUSES.includes(c.status) && (
                        <div className="mb-3">
                            <div className="mb-1.5 flex items-center justify-between">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                                    Hearings ({c.proceedings?.length || 0})
                                </div>
                                {!showHearingForm && (
                                    <button
                                        onClick={() => setShowHearingForm(true)}
                                        className="text-xs font-semibold text-primary-600 hover:underline"
                                    >
                                        + Add Hearing
                                    </button>
                                )}
                            </div>
                            <ProceedingsList proceedings={c.proceedings} />
                            {showHearingForm && (
                                <AddHearingForm role="adlg" caseId={c.id} queryKeyPrefix="adlg" onDone={() => setShowHearingForm(false)} />
                            )}
                        </div>
                    )}

                    <CaseDocumentButtons role="adlg" caseId={c.id} />
                </div>
            )}
        </Modal>
    );
}

export default function Cases() {
    useEffect(() => setLastModule('dv'), []);

    const [statusFilter, setStatusFilter] = useState('');
    const [activeCaseId, setActiveCaseId] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-cases', statusFilter],
        queryFn: () => client.get('/api/adlg/cases', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Divorce / Khula Registry</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={() =>
                            window.open(`${APP_BASE_PATH}/api/adlg/cases-export${statusFilter ? `?status=${statusFilter}` : ''}`, '_blank')
                        }
                    >
                        📊 Export Excel
                    </Button>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-56">
                        <option value="">All statuses</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="SEEN">Seen</option>
                        <option value="NOTICE_ISSUED">Notice Issued</option>
                        <option value="ARB_CONSTITUTED">Arbitration Constituted</option>
                        <option value="IN_PROCEEDINGS">In Proceedings</option>
                        <option value="DISPOSED_RECONCILED">Disposed — Reconciled</option>
                        <option value="DISPOSED_EFFECTIVE">Disposed — Effective</option>
                        <option value="FILED_NON_RESPONSE">Filed — Non-Response</option>
                    </Select>
                </div>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Case No.', data: 'case_no' },
                        { title: 'Type', data: 'type' },
                        { title: 'Divorcer', data: 'divorcer_name' },
                        { title: 'Respondent', data: 'respondent_name' },
                        { title: 'UC', data: 'union_council' },
                        { title: 'Status', data: 'status_label' },
                        { title: 'Days Left', data: 'days_remaining' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        1: (data) => <Badge tone={data === 'divorce' ? 'danger' : 'accent'}>{data === 'divorce' ? 'Divorce' : 'Khula'}</Badge>,
                        5: (data, row) => <Badge tone={STATUS_TONE[row.status]}>{data}</Badge>,
                        6: (data, row) =>
                            data === null ? (
                                <span className="text-ink-faint">—</span>
                            ) : (
                                <Badge tone={row.is_urgent ? 'danger' : data <= 10 ? 'accent' : 'neutral'}>{Math.max(0, data)}d</Badge>
                            ),
                        7: (data, row) => (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setActiveCaseId(row.id)}
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

            <CaseDetailModal caseId={activeCaseId} onClose={() => setActiveCaseId(null)} />
        </div>
    );
}
