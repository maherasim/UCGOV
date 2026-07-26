import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import DocumentPreviewModal, { DocumentLink } from '../../components/DocumentPreviewModal';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import {
    Badge,
    Button,
    Card,
    ErrorText,
    Field,
    FileInput,
    FullScreenSpinner,
    Modal,
    Select,
    Textarea,
    TextInput,
} from '../../components/ui';
import { formatCnic, formatPhone } from '../../utils/format';

const STATUS_TONE = {
    FORWARDED: 'info',
    PENDING_DDLG_APPROVAL: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    RETURNED: 'warning',
    REGISTERED: 'success',
};

/**
 * Quick-insert templates for the Secretary Remarks field — a plain array so
 * adding another template later is a one-line change, not a redesign. The
 * inserted text is always editable afterward; nothing here is auto-saved verbatim.
 */
const REMARKS_TEMPLATES = [
    {
        label: 'Standard approval remarks',
        text: 'Record of the UC has duly been checked. The child is not registered, therefore it is requested to approve this case as all legal formalities have been fulfilled. This case is fit for approval please.',
    },
];

const DELAY_REASONS = [
    'Unawareness of registration law',
    'Hospital / facility not registered',
    'Home delivery, no documentation',
    'Financial hardship',
    'Remote / rural area, no UC access',
    'Original documents lost',
    'Other',
];

const DOC_SLOTS = [
    { key: 'cnic', label: 'Applicant CNIC (copy)', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'photo1', label: 'Child Photograph (1st)', required: true, accept: '.jpg,.jpeg,.png' },
    { key: 'photo2', label: 'Child Photograph (2nd)', required: true, accept: '.jpg,.jpeg,.png' },
    { key: 'forma', label: 'Form A (mandatory)', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'slip', label: 'Hospital Birth Slip', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'vacc', label: 'Vaccination Card', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'bform', label: 'Child B-Form / CNIC / Smart Card / Passport', required: false, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: '7+' },
    { key: 'newspaper_notice', label: 'Newspaper Advertisement / Publication Notice', required: true, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: '7+' },
    { key: 'stamp_paper', label: 'Stamp Paper (Affidavit)', required: true, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: '7+' },
];

const emptyForm = {
    category: '1-7',
    dob: '',
    delay_reason: '',
    delay_reason_other: '',
    child_name: '',
    child_gender: '',
    child_birth_place: '',
    child_birth_type: 'Hospital',
    child_hospital: '',
    applicant_name: '',
    applicant_cnic: '',
    applicant_relation: 'Father',
    applicant_father_name: '',
    applicant_mother_name: '',
    applicant_address: '',
    applicant_phone: '',
    secretary_remarks: '',
};

function ageFromDob(dob) {
    if (!dob) return null;
    const diffMs = Date.now() - new Date(dob).getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

function formFromCase(c) {
    if (!c) return emptyForm;
    const isOtherReason = !DELAY_REASONS.includes(c.delay_reason);
    return {
        category: c.category,
        dob: c.dob || '',
        delay_reason: isOtherReason ? 'Other' : c.delay_reason,
        delay_reason_other: isOtherReason ? c.delay_reason || '' : '',
        child_name: c.child?.name || '',
        child_gender: c.child?.gender || '',
        child_birth_place: c.child?.birth_place || '',
        child_birth_type: c.child?.birth_type || 'Hospital',
        child_hospital: c.child?.hospital || '',
        applicant_name: c.applicant?.name || '',
        applicant_cnic: c.applicant?.cnic || '',
        applicant_relation: c.applicant?.relation || 'Father',
        applicant_father_name: c.applicant?.father_name || '',
        applicant_mother_name: c.applicant?.mother_name || '',
        applicant_address: c.applicant?.address || '',
        applicant_phone: c.applicant?.phone || '',
        secretary_remarks: c.secretary_remarks || '',
    };
}

function NewCaseChooser({ open, onClose, onChoose }) {
    return (
        <Modal open={open} onClose={onClose} title="New Birth Registration" subtitle="Select the delay category">
            <div className="grid grid-cols-1 gap-3">
                <button
                    type="button"
                    onClick={() => onChoose('1-7')}
                    className="rounded-xl border-2 border-border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                    <div className="text-sm font-bold text-ink">1–7 Years</div>
                    <div className="mt-1 text-xs text-ink-muted">Reviewed and decided directly by ADLG.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onChoose('7+')}
                    className="rounded-xl border-2 border-border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                    <div className="text-sm font-bold text-ink">Over 7 Years</div>
                    <div className="mt-1 text-xs text-ink-muted">ADLG reviews and forwards to DDLG, who makes the final decision.</div>
                </button>
            </div>
        </Modal>
    );
}

/**
 * One wizard handles new submissions (both categories) AND resubmission after a
 * RETURNED case — full documents are collected upfront regardless of category
 * (Rule 4/5 both require the complete document set at application time; there's
 * no more "delay approval first, documents later" two-stage pattern).
 */
function LbrWizard({ open, lbrCase, initialCategory, onClose }) {
    const queryClient = useQueryClient();
    const isResubmit = !!lbrCase;
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(() => formFromCase(lbrCase));
    const [docs, setDocs] = useState({});
    const [extraDocs, setExtraDocs] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setStep(1);
            setForm(isResubmit ? formFromCase(lbrCase) : { ...emptyForm, category: initialCategory || '1-7' });
            setDocs({});
            setExtraDocs([]);
            setError('');
        }
    }, [open, lbrCase, initialCategory, isResubmit]);

    const close = () => {
        setStep(1);
        setForm(emptyForm);
        setDocs({});
        setExtraDocs([]);
        setError('');
        onClose();
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const age = ageFromDob(form.dob);
    const visibleDocSlots = DOC_SLOTS.filter((d) => !d.categoryOnly || d.categoryOnly === form.category);

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key === 'delay_reason_other') return;
                formData.append(key, value ?? '');
            });
            if (form.delay_reason === 'Other') formData.set('delay_reason', form.delay_reason_other || 'Other');
            visibleDocSlots.forEach((slot) => {
                if (docs[slot.key]) formData.append(`documents[${slot.key}]`, docs[slot.key]);
            });
            extraDocs.forEach((d) => {
                if (d.file && d.label.trim()) {
                    formData.append(`documents[extra_${d.id}]`, d.file);
                    formData.append(`extra_labels[extra_${d.id}]`, d.label.trim());
                }
            });

            return isResubmit
                ? client.post(`/api/sec/lbr-cases/${lbrCase.id}/resubmit`, formData)
                : client.post('/api/sec/lbr-cases', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-lbr-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit application.'),
    });

    const ageValid = age !== null && (form.category === '1-7' ? age >= 1 && age <= 7 : age > 7);
    const step1Valid = form.category && form.dob && ageValid && form.delay_reason && (form.delay_reason !== 'Other' || form.delay_reason_other) && form.child_name && form.child_gender && form.child_birth_place;
    const step2Valid =
        form.applicant_name &&
        /^\d{5}-\d{7}-\d{1}$/.test(form.applicant_cnic) &&
        form.applicant_address &&
        form.applicant_father_name &&
        form.applicant_mother_name;
    const missingRequiredDocs = visibleDocSlots.filter((d) => d.required && !docs[d.key] && !(isResubmit && lbrCase?.documents?.some((doc) => doc.doc_key === d.key)));

    return (
        <Modal open={open} onClose={close} title={isResubmit ? 'Resubmit Birth Registration' : 'New Birth Registration'} subtitle={isResubmit ? lbrCase.lbr_id : `Step ${step} of 4 — ${form.category === '1-7' ? '1–7 Years' : 'Over 7 Years'}`}>
            <div className="mb-5 flex gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary-500' : 'bg-border'}`} />
                ))}
            </div>

            {step === 1 && (
                <div>
                    <Field label="Child's Date of Birth">
                        <TextInput type="date" value={form.dob} onChange={set('dob')} required />
                    </Field>
                    {form.dob && age !== null && !ageValid && (
                        <p className="-mt-2 mb-3 text-xs font-medium text-danger">
                            ⚠️ Age is {age.toFixed(1)} years — {form.category === '1-7' ? 'this category needs 1–7 years; use "Over 7 Years" instead' : 'this category needs over 7 years; use "1–7 Years" instead'}.
                        </p>
                    )}
                    <Field label="Reason for Delay">
                        <Select value={form.delay_reason} onChange={set('delay_reason')} required>
                            <option value="">Select reason…</option>
                            {DELAY_REASONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </Select>
                    </Field>
                    {form.delay_reason === 'Other' && (
                        <Field label="Specify Reason">
                            <TextInput value={form.delay_reason_other} onChange={set('delay_reason_other')} required />
                        </Field>
                    )}
                    <Field label="Child's Full Name">
                        <TextInput value={form.child_name} onChange={set('child_name')} required />
                    </Field>
                    <Field label="Gender">
                        <div className="flex gap-2">
                            {['Male', 'Female', 'Other'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setForm({ ...form, child_gender: g })}
                                    className={`flex-1 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold ${
                                        form.child_gender === g ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface text-ink-muted'
                                    }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label="Birth Place">
                        <TextInput value={form.child_birth_place} onChange={set('child_birth_place')} required />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Birth Type">
                            <Select value={form.child_birth_type} onChange={set('child_birth_type')}>
                                <option value="Hospital">Hospital</option>
                                <option value="Home">Home</option>
                                <option value="Other">Other</option>
                            </Select>
                        </Field>
                        <Field label="Hospital Name (optional)">
                            <TextInput value={form.child_hospital} onChange={set('child_hospital')} />
                        </Field>
                    </div>
                    <Button className="w-full" type="button" onClick={() => setStep(2)} disabled={!step1Valid}>
                        Next: Applicant Details
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Applicant Details</div>
                    <Field label="Applicant Full Name">
                        <TextInput value={form.applicant_name} onChange={set('applicant_name')} required />
                    </Field>
                    <Field label="Applicant CNIC">
                        <TextInput
                            value={form.applicant_cnic}
                            onChange={(e) => setForm({ ...form, applicant_cnic: formatCnic(e.target.value) })}
                            placeholder="36602-3534535-7"
                            required
                        />
                    </Field>
                    <Field label="Relation to Child">
                        <Select value={form.applicant_relation} onChange={set('applicant_relation')}>
                            <option value="Father">Father</option>
                            <option value="Mother">Mother</option>
                            <option value="Guardian">Guardian</option>
                            <option value="Self">Self</option>
                        </Select>
                    </Field>
                    <Field label="Address">
                        <TextInput value={form.applicant_address} onChange={set('applicant_address')} required />
                    </Field>
                    <Field label="Phone (optional)">
                        <TextInput
                            value={form.applicant_phone}
                            onChange={(e) => setForm({ ...form, applicant_phone: formatPhone(e.target.value) })}
                            placeholder="0300-1234567"
                        />
                    </Field>

                    <div className="mb-1.5 mt-4 border-t border-border pt-3 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Parents Details</div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Father's Name">
                            <TextInput value={form.applicant_father_name} onChange={set('applicant_father_name')} required />
                        </Field>
                        <Field label="Mother's Name">
                            <TextInput value={form.applicant_mother_name} onChange={set('applicant_mother_name')} required />
                        </Field>
                    </div>

                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button type="button" className="flex-1" onClick={() => setStep(3)} disabled={!step2Valid}>
                            Next: Documents
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div>
                    <div className="space-y-3">
                        {visibleDocSlots.map((slot) => (
                            <Field key={slot.key} label={slot.label + (slot.required ? '' : ' (optional)')}>
                                <FileInput
                                    value={docs[slot.key] || null}
                                    onChange={(file) => setDocs({ ...docs, [slot.key]: file })}
                                    accept={slot.accept}
                                />
                            </Field>
                        ))}
                    </div>

                    {extraDocs.length > 0 && (
                        <div className="my-3 space-y-3 border-t border-border pt-3">
                            {extraDocs.map((d) => (
                                <div key={d.id} className="rounded-lg border border-border p-2.5">
                                    <div className="mb-1.5 flex items-center gap-2">
                                        <TextInput
                                            placeholder="Document label (e.g. School Certificate)"
                                            value={d.label}
                                            onChange={(e) => setExtraDocs(extraDocs.map((x) => (x.id === d.id ? { ...x, label: e.target.value } : x)))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setExtraDocs(extraDocs.filter((x) => x.id !== d.id))}
                                            className="flex-shrink-0 rounded-lg px-2 py-1.5 text-ink-muted hover:bg-surface-subtle hover:text-danger"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <FileInput
                                        value={d.file}
                                        onChange={(file) => setExtraDocs(extraDocs.map((x) => (x.id === d.id ? { ...x, file } : x)))}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setExtraDocs([...extraDocs, { id: Date.now(), label: '', file: null }])}
                        className="mb-3 text-xs font-semibold text-primary-600 hover:underline"
                    >
                        + Add Additional Document
                    </button>

                    <Field label="Secretary Remarks / Observations (optional)">
                        <div className="mb-1.5 flex justify-end">
                            <Select
                                value=""
                                className="w-auto text-xs"
                                onChange={(e) => {
                                    const template = REMARKS_TEMPLATES.find((t) => t.label === e.target.value);
                                    if (!template) return;
                                    setForm({
                                        ...form,
                                        secretary_remarks: form.secretary_remarks ? `${form.secretary_remarks} ${template.text}` : template.text,
                                    });
                                }}
                            >
                                <option value="">✨ Insert template…</option>
                                {REMARKS_TEMPLATES.map((t) => (
                                    <option key={t.label} value={t.label}>{t.label}</option>
                                ))}
                            </Select>
                        </div>
                        <Textarea value={form.secretary_remarks} onChange={set('secretary_remarks')} />
                    </Field>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setStep(2)}>Back</Button>
                        <Button type="button" className="flex-1" onClick={() => setStep(4)} disabled={missingRequiredDocs.length > 0}>
                            Review &amp; Submit
                        </Button>
                    </div>
                    {missingRequiredDocs.length > 0 && (
                        <p className="mt-2 text-xs text-ink-faint">Mandatory: {missingRequiredDocs.map((d) => d.label).join(', ')}</p>
                    )}
                </div>
            )}

            {step === 4 && (
                <div>
                    <div className="mb-4 divide-y divide-border rounded-xl border border-border">
                        {[
                            ['Category', form.category === '1-7' ? '1–7 Years' : 'Over 7 Years'],
                            ['Child', form.child_name],
                            ['DOB', form.dob],
                            ['Age at Application', age !== null ? `${age.toFixed(1)} years` : '—'],
                            ['Applicant', `${form.applicant_name} · ${form.applicant_cnic}`],
                            ['Documents Attached', `${Object.values(docs).filter(Boolean).length} of ${visibleDocSlots.length}`],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between px-3 py-2 text-xs">
                                <span className="text-ink-muted">{k}</span>
                                <span className="font-medium text-ink">{v}</span>
                            </div>
                        ))}
                    </div>
                    <ErrorText>{error}</ErrorText>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" onClick={() => setStep(3)}>Back</Button>
                        <Button type="button" className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? 'Submitting…' : isResubmit ? '↩️ Resubmit to ADLG' : '✅ Submit Application'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

function CertificateModal({ lbrCase, onClose }) {
    const queryClient = useQueryClient();
    const [certNo, setCertNo] = useState('');
    const [certDate, setCertDate] = useState(new Date().toISOString().slice(0, 10));
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/sec/lbr-cases/${lbrCase.id}/register-certificate`, {
                certificate_no: certNo,
                certificate_date: certDate,
                certificate_remarks: remarks,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-lbr-cases'] });
            queryClient.invalidateQueries({ queryKey: ['sec-lbr-case', lbrCase.id] });
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not register certificate.'),
    });

    return (
        <Modal open={!!lbrCase} onClose={onClose} title="Register Birth Certificate" subtitle={lbrCase?.lbr_id}>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
                <Field label="Certificate Number">
                    <TextInput value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder="BC-2026-UC1-001" required />
                </Field>
                <Field label="Certificate Date">
                    <TextInput type="date" value={certDate} onChange={(e) => setCertDate(e.target.value)} required />
                </Field>
                <Field label="Remarks (optional)">
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Registering…' : '📜 Issue Certificate & Lock File'}
                </Button>
            </form>
        </Modal>
    );
}

function LbrDetailModal({ lbrCaseId, onClose, onRegister, onResubmit }) {
    const [previewDoc, setPreviewDoc] = useState(null);

    const { data: c, isLoading } = useQuery({
        queryKey: ['sec-lbr-case', lbrCaseId],
        queryFn: () => client.get(`/api/sec/lbr-cases/${lbrCaseId}`).then((r) => r.data.data),
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
                        {c.locked && <Badge tone="warning">🔒 Locked</Badge>}
                    </div>
                    <div className="mb-2 text-sm font-bold text-ink">{c.child.name} <span className="font-normal text-ink-faint">({c.child.gender})</span></div>
                    <div className="mb-3 text-xs text-ink-muted">Applicant: {c.applicant.name} · {c.applicant.cnic} ({c.applicant.relation})</div>

                    {c.status === 'PENDING_DDLG_APPROVAL' && (
                        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-info">
                            ⏳ ADLG forwarded this to DDLG for the final decision.
                        </div>
                    )}
                    {c.status === 'RETURNED' && (
                        <div className="mb-3 rounded-xl border border-accent-400/30 bg-accent-100 p-3 text-xs text-accent-600">
                            ↩️ Returned for correction. Review the remarks below and resubmit.
                        </div>
                    )}
                    {c.status === 'APPROVED' && (
                        <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3 text-xs text-primary-700">
                            ✅ Approved. Register the certificate below.
                        </div>
                    )}

                    <div className="mb-3 rounded-xl border border-border p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Documents</div>
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
                            {c.ddlg_order_no && <p className="mt-1 text-xs font-semibold text-ink">Order No: {c.ddlg_order_no}</p>}
                        </div>
                    )}

                    {c.certificate && (
                        <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-primary-700">Birth Certificate</div>
                            <p className="text-xs text-ink">No. {c.certificate.certificate_no} · {c.certificate.certificate_date}</p>
                        </div>
                    )}

                    <div className="mb-4">
                        {c.timeline?.map((t, i) => (
                            <div key={i} className="flex gap-2 py-1 text-xs">
                                <span className="text-ink-faint">{t.event_date}</span>
                                <span className="text-ink">{t.note}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <a
                            href={`${APP_BASE_PATH}/api/sec/lbr-cases/${c.id}/notesheet`}
                            target="_blank"
                            rel="noopener"
                            className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-ink hover:bg-surface-subtle"
                        >
                            📥 Notesheet
                        </a>
                        {c.status === 'APPROVED' && (
                            <Button className="flex-1" onClick={() => onRegister(c)}>
                                📜 Register Certificate
                            </Button>
                        )}
                        {c.status === 'RETURNED' && (
                            <Button className="flex-1" onClick={() => onResubmit(c)}>
                                ✏️ Resubmit
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

    const [chooserOpen, setChooserOpen] = useState(false);
    const [wizardCategory, setWizardCategory] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [certTarget, setCertTarget] = useState(null);
    const [resubmitTarget, setResubmitTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['sec-lbr-cases'],
        queryFn: () => client.get('/api/sec/lbr-cases').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Delayed Birth Registration</h1>
                <Button onClick={() => setChooserOpen(true)}>+ New Application</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'LBR-ID', data: 'lbr_id' },
                        { title: 'Child', data: 'child.name' },
                        { title: 'Category', data: 'category_label' },
                        { title: 'Applicant', data: 'applicant.name' },
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

            <NewCaseChooser
                open={chooserOpen}
                onClose={() => setChooserOpen(false)}
                onChoose={(cat) => {
                    setChooserOpen(false);
                    setWizardCategory(cat);
                }}
            />
            <LbrWizard
                open={!!wizardCategory || !!resubmitTarget}
                lbrCase={resubmitTarget}
                initialCategory={wizardCategory}
                onClose={() => {
                    setWizardCategory(null);
                    setResubmitTarget(null);
                }}
            />
            <LbrDetailModal
                lbrCaseId={activeId}
                onClose={() => setActiveId(null)}
                onRegister={(c) => {
                    setActiveId(null);
                    setCertTarget(c);
                }}
                onResubmit={(c) => {
                    setActiveId(null);
                    setResubmitTarget(c);
                }}
            />
            <CertificateModal lbrCase={certTarget} onClose={() => setCertTarget(null)} />
        </div>
    );
}
