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

const CATEGORY_LABELS = {
    '1-7': '1–7 Years (Domestic)',
    '7+': 'Over 7 Years (Court Decree)',
    ABROAD: 'Pakistani Abroad (6+ Months)',
};

const DELAY_REASONS = [
    'Unawareness of registration law',
    'Home death, no documentation',
    'Financial hardship',
    'Remote / rural area, no UC access',
    'Original documents lost',
    'Family did not report in time',
    'Other',
];

const DOC_SLOTS = [
    { key: 'affidavit', label: 'Affidavit (Stamp Paper Rs. 300, 2 Witnesses)', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'cnic_deceased', label: 'CNIC / Birth Certificate of Deceased', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'cnic_applicant', label: 'Applicant CNIC (copy)', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'death_slip', label: 'Hospital Death Slip (if applicable)', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'burial_slip', label: 'Burial Slip (if available)', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'court_decree', label: 'Court Decree (Copy)', required: true, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: '7+' },
    { key: 'passport_copy', label: 'Passport Copy', required: true, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: 'ABROAD' },
    { key: 'visa_copy', label: 'Visa Copy', required: true, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: 'ABROAD' },
    { key: 'other_doc', label: 'Other Supporting Document', required: false, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: 'ABROAD' },
];

const emptyForm = {
    category: '1-7',
    date_of_death: '',
    delay_reason: '',
    delay_reason_other: '',
    deceased_name: '',
    deceased_gender: '',
    deceased_cnic: '',
    cause_of_death: '',
    place_of_death: '',
    burial_place: '',
    applicant_name: '',
    applicant_cnic: '',
    applicant_relation: 'Son',
    applicant_address: '',
    applicant_phone: '',
    secretary_remarks: '',
    court_decree_no: '',
    court_decree_date: '',
    court_name: '',
    country_of_death: '',
    passport_no: '',
};

function delayYearsFromDeath(dateOfDeath) {
    if (!dateOfDeath) return null;
    const diffMs = Date.now() - new Date(dateOfDeath).getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

function formFromCase(c) {
    if (!c) return emptyForm;
    const isOtherReason = !DELAY_REASONS.includes(c.delay_reason);
    return {
        category: c.category,
        date_of_death: c.date_of_death || '',
        delay_reason: isOtherReason ? 'Other' : c.delay_reason,
        delay_reason_other: isOtherReason ? c.delay_reason || '' : '',
        deceased_name: c.deceased?.name || '',
        deceased_gender: c.deceased?.gender || '',
        deceased_cnic: c.deceased?.cnic || '',
        cause_of_death: c.deceased?.cause_of_death || '',
        place_of_death: c.deceased?.place_of_death || '',
        burial_place: c.deceased?.burial_place || '',
        applicant_name: c.applicant?.name || '',
        applicant_cnic: c.applicant?.cnic || '',
        applicant_relation: c.applicant?.relation || 'Son',
        applicant_address: c.applicant?.address || '',
        applicant_phone: c.applicant?.phone || '',
        secretary_remarks: c.secretary_remarks || '',
        court_decree_no: c.court_decree?.decree_no || '',
        court_decree_date: c.court_decree?.decree_date || '',
        court_name: c.court_decree?.court_name || '',
        country_of_death: c.abroad?.country_of_death || '',
        passport_no: c.abroad?.passport_no || '',
    };
}

function NewCaseChooser({ open, onClose, onChoose }) {
    return (
        <Modal open={open} onClose={onClose} title="New Death Registration" subtitle="Select the category">
            <div className="grid grid-cols-1 gap-3">
                <button
                    type="button"
                    onClick={() => onChoose('1-7')}
                    className="rounded-xl border-2 border-border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                    <div className="text-sm font-bold text-ink">1–7 Years (Domestic)</div>
                    <div className="mt-1 text-xs text-ink-muted">Death reported 1–7 years late. Reviewed by ADLG then decided by the DDLG committee.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onChoose('7+')}
                    className="rounded-xl border-2 border-border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                    <div className="text-sm font-bold text-ink">Over 7 Years (Court Decree)</div>
                    <div className="mt-1 text-xs text-ink-muted">Requires a court decree. Reviewed and approved directly by ADLG — no committee.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onChoose('ABROAD')}
                    className="rounded-xl border-2 border-border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                    <div className="text-sm font-bold text-ink">Pakistani Abroad (6+ Months)</div>
                    <div className="mt-1 text-xs text-ink-muted">Death of a Pakistani living abroad, not registered within 6 months. Same committee procedure as 1–7 years, plus passport/visa.</div>
                </button>
            </div>
        </Modal>
    );
}

/**
 * One wizard handles new submissions AND resubmission after a RETURNED case —
 * unlike LBR there's no two-stage document pattern here (Rule 12(1) requires the
 * full document set upfront), so a single form covers every category.
 */
function DeathCaseWizard({ open, deathCase, initialCategory, onClose }) {
    const queryClient = useQueryClient();
    const isResubmit = !!deathCase;
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(() => formFromCase(deathCase));
    const [docs, setDocs] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setStep(1);
            setForm(isResubmit ? formFromCase(deathCase) : { ...emptyForm, category: initialCategory || '1-7' });
            setDocs({});
            setError('');
        }
    }, [open, deathCase, initialCategory, isResubmit]);

    const close = () => {
        setStep(1);
        setForm(emptyForm);
        setDocs({});
        setError('');
        onClose();
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const delayYears = delayYearsFromDeath(form.date_of_death);
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

            return isResubmit
                ? client.post(`/api/sec/death-cases/${deathCase.id}/resubmit`, formData)
                : client.post('/api/sec/death-cases', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-death-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit application.'),
    });

    const step1Valid =
        form.date_of_death &&
        delayYears !== null &&
        form.delay_reason &&
        (form.delay_reason !== 'Other' || form.delay_reason_other) &&
        form.deceased_name &&
        form.deceased_gender;
    const step2Valid =
        form.applicant_name &&
        /^\d{5}-\d{7}-\d{1}$/.test(form.applicant_cnic) &&
        form.applicant_relation &&
        form.applicant_address &&
        (form.category !== '7+' || (form.court_decree_no && form.court_decree_date && form.court_name)) &&
        (form.category !== 'ABROAD' || (form.country_of_death && form.passport_no));
    const missingRequiredDocs = visibleDocSlots.filter((d) => d.required && !docs[d.key] && !(isResubmit && deathCase?.documents?.some((doc) => doc.doc_key === d.key)));

    return (
        <Modal open={open} onClose={close} title={isResubmit ? 'Resubmit Death Registration' : 'New Death Registration'} subtitle={isResubmit ? deathCase.death_id : `Step ${step} of 4 — ${CATEGORY_LABELS[form.category]}`}>
            <div className="mb-5 flex gap-1.5">
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-primary-500' : 'bg-border'}`} />
                ))}
            </div>

            {step === 1 && (
                <div>
                    <Field label="Date of Death">
                        <TextInput type="date" value={form.date_of_death} onChange={set('date_of_death')} required />
                    </Field>
                    {form.date_of_death && delayYears !== null && (
                        <p className="-mt-2 mb-3 text-xs font-medium text-ink-muted">
                            Delay: {delayYears.toFixed(1)} years — {form.category === '1-7' ? 'must be 1–7 years for this category' : form.category === '7+' ? 'must be over 7 years' : 'confirm this qualifies as late (6+ months, abroad)'}
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
                    <Field label="Deceased's Full Name">
                        <TextInput value={form.deceased_name} onChange={set('deceased_name')} required />
                    </Field>
                    <Field label="Gender">
                        <div className="flex gap-2">
                            {['Male', 'Female', 'Other'].map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setForm({ ...form, deceased_gender: g })}
                                    className={`flex-1 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold ${
                                        form.deceased_gender === g ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface text-ink-muted'
                                    }`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Deceased CNIC (optional)">
                            <TextInput
                                value={form.deceased_cnic}
                                onChange={(e) => setForm({ ...form, deceased_cnic: formatCnic(e.target.value) })}
                                placeholder="36602-3534535-7"
                            />
                        </Field>
                        <Field label="Cause of Death (optional)">
                            <TextInput value={form.cause_of_death} onChange={set('cause_of_death')} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Place of Death (optional)">
                            <TextInput value={form.place_of_death} onChange={set('place_of_death')} />
                        </Field>
                        <Field label="Burial Place (optional)">
                            <TextInput value={form.burial_place} onChange={set('burial_place')} />
                        </Field>
                    </div>
                    <Button className="w-full" type="button" onClick={() => setStep(2)} disabled={!step1Valid}>
                        Next: Applicant Details
                    </Button>
                </div>
            )}

            {step === 2 && (
                <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Applicant (Relative) Details</div>
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
                    <Field label="Relation to Deceased">
                        <Select value={form.applicant_relation} onChange={set('applicant_relation')}>
                            {['Son', 'Daughter', 'Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Other'].map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
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

                    {form.category === '7+' && (
                        <>
                            <div className="mb-1.5 mt-4 border-t border-border pt-3 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Court Decree (Rule 13)</div>
                            <Field label="Decree Number">
                                <TextInput value={form.court_decree_no} onChange={set('court_decree_no')} required />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Decree Date">
                                    <TextInput type="date" value={form.court_decree_date} onChange={set('court_decree_date')} required />
                                </Field>
                                <Field label="Court Name">
                                    <TextInput value={form.court_name} onChange={set('court_name')} required />
                                </Field>
                            </div>
                        </>
                    )}

                    {form.category === 'ABROAD' && (
                        <>
                            <div className="mb-1.5 mt-4 border-t border-border pt-3 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Death Abroad Details (Rule 15)</div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Country of Death">
                                    <TextInput value={form.country_of_death} onChange={set('country_of_death')} required />
                                </Field>
                                <Field label="Passport No.">
                                    <TextInput value={form.passport_no} onChange={set('passport_no')} required />
                                </Field>
                            </div>
                        </>
                    )}

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
                    <Field label="Secretary Remarks / Observations (optional)">
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
                            ['Category', CATEGORY_LABELS[form.category]],
                            ['Deceased', form.deceased_name],
                            ['Date of Death', form.date_of_death],
                            ['Delay', delayYears !== null ? `${delayYears.toFixed(1)} years` : '—'],
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

function CertificateModal({ deathCase, onClose }) {
    const queryClient = useQueryClient();
    const [certNo, setCertNo] = useState('');
    const [certDate, setCertDate] = useState(new Date().toISOString().slice(0, 10));
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/sec/death-cases/${deathCase.id}/register-certificate`, {
                certificate_no: certNo,
                certificate_date: certDate,
                certificate_remarks: remarks,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-death-cases'] });
            queryClient.invalidateQueries({ queryKey: ['sec-death-case', deathCase.id] });
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not register certificate.'),
    });

    return (
        <Modal open={!!deathCase} onClose={onClose} title="Register Death Certificate" subtitle={deathCase?.death_id}>
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
                <Field label="Certificate Number">
                    <TextInput value={certNo} onChange={(e) => setCertNo(e.target.value)} placeholder="DC-2026-UC1-001" required />
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

function LdrDetailModal({ deathCaseId, onClose, onRegister, onResubmit }) {
    const [previewDoc, setPreviewDoc] = useState(null);

    const { data: c, isLoading } = useQuery({
        queryKey: ['sec-death-case', deathCaseId],
        queryFn: () => client.get(`/api/sec/death-cases/${deathCaseId}`).then((r) => r.data.data),
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
                        {c.locked && <Badge tone="warning">🔒 Locked</Badge>}
                    </div>
                    <div className="mb-2 text-sm font-bold text-ink">{c.deceased.name} <span className="font-normal text-ink-faint">({c.deceased.gender})</span></div>
                    <div className="mb-3 text-xs text-ink-muted">Applicant: {c.applicant.name} · {c.applicant.cnic} ({c.applicant.relation})</div>

                    {c.status === 'PENDING_DDLG_APPROVAL' && (
                        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-info">
                            ⏳ Forwarded to the DDLG committee for final decision.
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
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-accent-600">DDLG Committee Observations</div>
                            <p className="text-xs text-ink">{c.ddlg_observations}</p>
                            {c.ddlg_order_no && <p className="mt-1 text-xs font-semibold text-ink">Order No: {c.ddlg_order_no}</p>}
                        </div>
                    )}

                    {c.certificate && (
                        <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-primary-700">Death Certificate</div>
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
                            href={`${APP_BASE_PATH}/api/sec/death-cases/${c.id}/notesheet`}
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

export default function Ldr() {
    useEffect(() => setLastModule('ldr'), []);

    const [chooserOpen, setChooserOpen] = useState(false);
    const [wizardCategory, setWizardCategory] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [certTarget, setCertTarget] = useState(null);
    const [resubmitTarget, setResubmitTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['sec-death-cases'],
        queryFn: () => client.get('/api/sec/death-cases').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Late Death Registration</h1>
                <Button onClick={() => setChooserOpen(true)}>+ New Application</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'LDR-ID', data: 'death_id' },
                        { title: 'Deceased', data: 'deceased.name' },
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
            <DeathCaseWizard
                open={!!wizardCategory || !!resubmitTarget}
                deathCase={resubmitTarget}
                initialCategory={wizardCategory}
                onClose={() => {
                    setWizardCategory(null);
                    setResubmitTarget(null);
                }}
            />
            <LdrDetailModal
                deathCaseId={activeId}
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
            <CertificateModal deathCase={certTarget} onClose={() => setCertTarget(null)} />
        </div>
    );
}
