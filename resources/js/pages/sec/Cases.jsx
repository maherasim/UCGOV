import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { AddHearingForm, CaseDocumentButtons, ProceedingsList } from '../../components/CaseProceedings';
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
    SubLabel,
    Textarea,
    TextInput,
} from '../../components/ui';
import { formatCnic, formatPhone } from '../../utils/format';

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
    if (DISPOSED_STAGES.includes(status)) return 4;
    if (status === 'IN_PROCEEDINGS') return STAGE_ORDER.indexOf('ARB_CONSTITUTED');
    return STAGE_ORDER.indexOf(status);
}

// ── New Case wizard ──────────────────────────────────────────
const emptyWizard = {
    case_no: '',
    type: 'divorce',
    receipt_date: new Date().toISOString().slice(0, 10),
    address: '',
    divorcer_name: '',
    divorcer_cnic: '',
    divorcer_phone: '',
    respondent_name: '',
    respondent_cnic: '',
    respondent_phone: '',
    marriage_date: '',
    nikah_registrar: '',
    mahr_amount: '',
    children_count: '',
    remarks: '',
};

function NewCaseWizard({ open, onClose }) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(emptyWizard);
    const [attachment, setAttachment] = useState(null);
    const [error, setError] = useState('');

    const close = () => {
        setStep(1);
        setForm(emptyWizard);
        setAttachment(null);
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value ?? ''));
            if (attachment) formData.append('attachment', attachment);

            return client.post('/api/sec/cases', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit case.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const isDivorce = form.type === 'divorce';

    return (
        <Modal open={open} onClose={close} title="New Case" subtitle={`Step ${step} of 4`}>
            <div className="mb-5 flex gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary-500' : 'bg-border'}`} />
                ))}
            </div>

            {step === 1 && (
                <div>
                    <Field label="Case Type">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, type: 'divorce' })}
                                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                                    isDivorce ? 'border-danger bg-red-50 text-danger' : 'border-border bg-surface text-ink-muted'
                                }`}
                            >
                                💔 Divorce
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, type: 'khula' })}
                                className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold ${
                                    !isDivorce ? 'border-accent-500 bg-accent-100 text-accent-600' : 'border-border bg-surface text-ink-muted'
                                }`}
                            >
                                🏛️ Khula
                            </button>
                        </div>
                    </Field>
                    <Field label="Case Number">
                        <TextInput value={form.case_no} onChange={set('case_no')} placeholder="DV-2026-001" required />
                    </Field>
                    <Field label="Receipt Date">
                        <TextInput type="date" value={form.receipt_date} onChange={set('receipt_date')} required />
                    </Field>
                    <Field label="Address">
                        <TextInput value={form.address} onChange={set('address')} />
                    </Field>
                    <Button className="w-full" onClick={() => setStep(2)} type="button" disabled={!form.case_no}>
                        Next: Party Information
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <Field label={isDivorce ? 'Divorcer (Husband)' : 'Divorcer (Wife)'}>
                        <SubLabel>Full Name</SubLabel>
                        <TextInput
                            value={form.divorcer_name}
                            onChange={set('divorcer_name')}
                            placeholder="e.g. Muhammad Ali"
                            className="mb-2"
                            required
                        />
                        <SubLabel>CNIC</SubLabel>
                        <TextInput
                            value={form.divorcer_cnic}
                            onChange={(e) => setForm({ ...form, divorcer_cnic: formatCnic(e.target.value) })}
                            placeholder="XXXXX-XXXXXXX-X"
                            className="mb-2"
                            required
                        />
                        <SubLabel>Phone (optional)</SubLabel>
                        <TextInput
                            value={form.divorcer_phone}
                            onChange={(e) => setForm({ ...form, divorcer_phone: formatPhone(e.target.value) })}
                            placeholder="03XX-XXXXXXX"
                        />
                    </Field>
                    <Field label={isDivorce ? 'Respondent (Wife)' : 'Respondent (Husband)'}>
                        <SubLabel>Full Name</SubLabel>
                        <TextInput
                            value={form.respondent_name}
                            onChange={set('respondent_name')}
                            placeholder="e.g. Ayesha Bibi"
                            className="mb-2"
                            required
                        />
                        <SubLabel>CNIC</SubLabel>
                        <TextInput
                            value={form.respondent_cnic}
                            onChange={(e) => setForm({ ...form, respondent_cnic: formatCnic(e.target.value) })}
                            placeholder="XXXXX-XXXXXXX-X"
                            className="mb-2"
                            required
                        />
                        <SubLabel>Phone (optional)</SubLabel>
                        <TextInput
                            value={form.respondent_phone}
                            onChange={(e) => setForm({ ...form, respondent_phone: formatPhone(e.target.value) })}
                            placeholder="03XX-XXXXXXX"
                        />
                    </Field>
                    <Field label="Marriage Details (optional)">
                        <SubLabel>Marriage Date</SubLabel>
                        <TextInput
                            type="date"
                            value={form.marriage_date}
                            onChange={(e) => setForm({ ...form, marriage_date: e.target.value })}
                            className="mb-2"
                        />
                        <SubLabel>Nikah Registrar</SubLabel>
                        <TextInput
                            value={form.nikah_registrar}
                            onChange={(e) => setForm({ ...form, nikah_registrar: e.target.value })}
                            placeholder="e.g. Registrar's name"
                            className="mb-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <SubLabel>Mehr Amount</SubLabel>
                                <TextInput
                                    value={form.mahr_amount}
                                    onChange={(e) => setForm({ ...form, mahr_amount: e.target.value })}
                                    placeholder="e.g. 50,000"
                                />
                            </div>
                            <div>
                                <SubLabel>Children</SubLabel>
                                <TextInput
                                    value={form.children_count}
                                    onChange={(e) => setForm({ ...form, children_count: e.target.value })}
                                    placeholder="e.g. 2"
                                />
                            </div>
                        </div>
                    </Field>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                            Back
                        </Button>
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={() => setStep(3)}
                            disabled={!form.divorcer_name || !form.divorcer_cnic || !form.respondent_name || !form.respondent_cnic}
                        >
                            Next: Documentation
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <Field label={isDivorce ? 'Divorce Deed (mandatory)' : 'Court Decree (mandatory)'}>
                        <label
                            className={`block w-full cursor-pointer rounded-xl border-2 border-dashed p-6 text-center text-sm font-medium ${
                                attachment ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-border text-ink-muted'
                            }`}
                        >
                            {attachment ? `✅ ${attachment.name}` : '📎 Tap to attach document'}
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) => setAttachment(e.target.files[0] || null)}
                            />
                        </label>
                    </Field>
                    <Field label="Remarks">
                        <Textarea value={form.remarks} onChange={set('remarks')} />
                    </Field>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                            Back
                        </Button>
                        <Button type="button" className="flex-1" onClick={() => setStep(4)}>
                            Review &amp; Submit
                        </Button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div>
                    <div className="mb-4 divide-y divide-border rounded-xl border border-border">
                        {[
                            ['Case Number', form.case_no],
                            ['Type', form.type.toUpperCase()],
                            ['Date', form.receipt_date],
                            ['Divorcer', `${form.divorcer_name} · ${form.divorcer_cnic}`],
                            ['Respondent', `${form.respondent_name} · ${form.respondent_cnic}`],
                            ['Attachment', attachment ? `✅ ${attachment.name}` : '⚠️ Not attached'],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between px-3 py-2 text-xs">
                                <span className="text-ink-muted">{k}</span>
                                <span className="font-medium text-ink">{v}</span>
                            </div>
                        ))}
                    </div>
                    <ErrorText>{error}</ErrorText>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setStep(3)}>
                            Back
                        </Button>
                        <Button type="button" className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? 'Submitting…' : '✅ Submit Case'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Constitute Arbitration inline form ──────────────────────
function ConstituteArbitrationForm({ caseId, onDone }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState({
        husband_rep_name: '',
        husband_rep_cnic: '',
        husband_rep_phone: '',
        husband_rep_designation: '',
        wife_rep_name: '',
        wife_rep_cnic: '',
        wife_rep_phone: '',
        wife_rep_designation: '',
    });
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () => client.post(`/api/sec/cases/${caseId}/constitute-arbitration`, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-cases'] });
            queryClient.invalidateQueries({ queryKey: ['sec-case', caseId] });
            onDone();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not constitute arbitration.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <form
            className="mt-3 rounded-xl border border-border bg-surface-subtle p-3"
            onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
            }}
        >
            <Field label="Husband's Representative">
                <TextInput value={form.husband_rep_name} onChange={set('husband_rep_name')} placeholder="Name" className="mb-2" required />
                <TextInput
                    value={form.husband_rep_cnic}
                    onChange={(e) => setForm({ ...form, husband_rep_cnic: formatCnic(e.target.value) })}
                    placeholder="CNIC"
                    className="mb-2"
                    required
                />
                <div className="grid grid-cols-2 gap-2">
                    <TextInput
                        value={form.husband_rep_phone}
                        onChange={(e) => setForm({ ...form, husband_rep_phone: formatPhone(e.target.value) })}
                        placeholder="Phone"
                    />
                    <TextInput value={form.husband_rep_designation} onChange={set('husband_rep_designation')} placeholder="Relation" />
                </div>
            </Field>
            <Field label="Wife's Representative">
                <TextInput value={form.wife_rep_name} onChange={set('wife_rep_name')} placeholder="Name" className="mb-2" required />
                <TextInput
                    value={form.wife_rep_cnic}
                    onChange={(e) => setForm({ ...form, wife_rep_cnic: formatCnic(e.target.value) })}
                    placeholder="CNIC"
                    className="mb-2"
                    required
                />
                <div className="grid grid-cols-2 gap-2">
                    <TextInput
                        value={form.wife_rep_phone}
                        onChange={(e) => setForm({ ...form, wife_rep_phone: formatPhone(e.target.value) })}
                        placeholder="Phone"
                    />
                    <TextInput value={form.wife_rep_designation} onChange={set('wife_rep_designation')} placeholder="Relation" />
                </div>
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : '⚖️ Constitute Arbitration Council'}
            </Button>
        </form>
    );
}

function CaseDetailModal({ caseId, onClose }) {
    const [showArbForm, setShowArbForm] = useState(false);
    const [showHearingForm, setShowHearingForm] = useState(false);

    const { data: c, isLoading } = useQuery({
        queryKey: ['sec-case', caseId],
        queryFn: () => client.get(`/api/sec/cases/${caseId}`).then((r) => r.data.data),
        enabled: !!caseId,
    });

    const close = () => {
        setShowArbForm(false);
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
                    <div className="mb-4">
                        {c.attachment_url ? (
                            <a href={c.attachment_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600 hover:underline">
                                📎 View attached document
                            </a>
                        ) : (
                            <span className="text-xs text-ink-faint">📎 No document attached</span>
                        )}
                    </div>

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
                                            {i + 1}
                                        </div>
                                        {!last && <div className="w-px flex-1 bg-border" />}
                                    </div>
                                    <div className={`min-w-0 flex-1 ${last ? 'pb-1' : 'pb-4'}`}>
                                        <div className={`text-xs font-semibold ${done ? 'text-ink' : active ? 'text-accent-600' : 'text-ink-faint'}`}>
                                            {s.label}
                                        </div>
                                        {item && <div className="mt-0.5 text-[11px] text-ink-muted">{item.event_date} · {item.actor || 'System'}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {!c.arbitration && ['NOTICE_ISSUED', 'IN_PROCEEDINGS'].includes(c.status) && !showArbForm && (
                        <Button className="mb-3 w-full" onClick={() => setShowArbForm(true)}>
                            ⚖️ Constitute Arbitration Council
                        </Button>
                    )}
                    {!c.arbitration && ['NOTICE_ISSUED', 'IN_PROCEEDINGS'].includes(c.status) && showArbForm && (
                        <ConstituteArbitrationForm caseId={c.id} onDone={() => setShowArbForm(false)} />
                    )}
                    {c.status === 'SUBMITTED' && (
                        <div className="mb-3 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-ink-muted">Awaiting ADLG review.</div>
                    )}
                    {c.status === 'SEEN' && (
                        <div className="mb-3 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-ink-muted">Awaiting notice from ADLG.</div>
                    )}
                    {DISPOSED_STAGES.includes(c.status) && (
                        <div className="mb-3 rounded-xl border border-border bg-surface-subtle p-3 text-xs text-ink-muted">
                            Case closed — {c.decision?.remarks || c.status_label}.
                        </div>
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
                                <AddHearingForm role="sec" caseId={c.id} queryKeyPrefix="sec" onDone={() => setShowHearingForm(false)} />
                            )}
                        </div>
                    )}

                    <CaseDocumentButtons role="sec" caseId={c.id} />
                </div>
            )}
        </Modal>
    );
}

export default function Cases() {
    useEffect(() => setLastModule('dv'), []);

    const [wizardOpen, setWizardOpen] = useState(false);
    const [activeCaseId, setActiveCaseId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['sec-cases', statusFilter],
        queryFn: () => client.get('/api/sec/cases', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Divorce / Khula Registry</h1>
                <Button onClick={() => setWizardOpen(true)}>+ New Case</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Case No.', data: 'case_no' },
                        { title: 'Type', data: 'type' },
                        { title: 'Divorcer', data: 'divorcer_name' },
                        { title: 'Respondent', data: 'respondent_name' },
                        { title: 'Status', data: 'status_label' },
                        { title: 'Days Left', data: 'days_remaining' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        1: (data) => <Badge tone={data === 'divorce' ? 'danger' : 'accent'}>{data === 'divorce' ? 'Divorce' : 'Khula'}</Badge>,
                        4: (data, row) => <Badge tone={STATUS_TONE[row.status]}>{data}</Badge>,
                        5: (data, row) =>
                            data === null ? (
                                <span className="text-ink-faint">—</span>
                            ) : (
                                <Badge tone={row.is_urgent ? 'danger' : data <= 10 ? 'accent' : 'neutral'}>{Math.max(0, data)}d</Badge>
                            ),
                        6: (data, row) => (
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

            <NewCaseWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
            <CaseDetailModal caseId={activeCaseId} onClose={() => setActiveCaseId(null)} />
        </div>
    );
}
