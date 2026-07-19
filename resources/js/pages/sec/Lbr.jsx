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
    APPROVED: 'success',
    REJECTED: 'danger',
    RETURNED: 'warning',
    REGISTERED: 'success',
    PENDING_DELAY_APPROVAL: 'info',
    DELAY_APPROVED: 'success',
    DELAY_RETURNED: 'warning',
};

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
    { key: 'slip', label: 'Hospital Birth Slip', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'vacc', label: 'Vaccination Card', required: false, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'bform', label: 'Child B-Form / CNIC / Smart Card / Passport', required: false, accept: '.pdf,.jpg,.jpeg,.png', categoryOnly: '7+' },
    { key: 'forma', label: 'Form A (mandatory)', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
];

const emptyWizard = {
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

function NewLbrWizard({ open, onClose }) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(emptyWizard);
    const [docs, setDocs] = useState({});
    const [error, setError] = useState('');

    const close = () => {
        setStep(1);
        setForm(emptyWizard);
        setDocs({});
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

            return client.post('/api/sec/lbr-cases', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-lbr-cases'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit application.'),
    });

    const step1Valid = form.category && form.dob && age !== null && age >= 1 && age <= 7 && form.delay_reason && (form.delay_reason !== 'Other' || form.delay_reason_other) && form.child_name && form.child_gender;
    const step2Valid = form.applicant_name && /^\d{5}-\d{7}-\d{1}$/.test(form.applicant_cnic);
    const missingRequiredDocs = visibleDocSlots.filter((d) => d.required && !docs[d.key]);

    return (
        <Modal open={open} onClose={close} title="New Birth Registration" subtitle={`Step ${step} of 4`}>
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
                    {form.dob && age !== null && age < 1 && (
                        <p className="-mt-2 mb-3 text-xs font-medium text-danger">⚠️ Child must be at least 1 year old for delayed registration.</p>
                    )}
                    {form.dob && age !== null && age > 7 && (
                        <p className="-mt-2 mb-3 text-xs font-medium text-danger">⚠️ Child is over 7 years old — close this and use "Over 7 Years" from the New Application menu instead.</p>
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
                    <Field label="Birth Place (optional)">
                        <TextInput value={form.child_birth_place} onChange={set('child_birth_place')} />
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
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Father's Name (optional)">
                            <TextInput value={form.applicant_father_name} onChange={set('applicant_father_name')} />
                        </Field>
                        <Field label="Mother's Name (optional)">
                            <TextInput value={form.applicant_mother_name} onChange={set('applicant_mother_name')} />
                        </Field>
                    </div>
                    <Field label="Address (optional)">
                        <TextInput value={form.applicant_address} onChange={set('applicant_address')} />
                    </Field>
                    <Field label="Phone (optional)">
                        <TextInput
                            value={form.applicant_phone}
                            onChange={(e) => setForm({ ...form, applicant_phone: formatPhone(e.target.value) })}
                            placeholder="0300-1234567"
                        />
                    </Field>
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
                            {mutation.isPending ? 'Submitting…' : '✅ Submit Application'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
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
                    <div className="mt-1 text-xs text-ink-muted">Standard application — fill full details and upload documents now.</div>
                </button>
                <button
                    type="button"
                    onClick={() => onChoose('7+')}
                    className="rounded-xl border-2 border-border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50"
                >
                    <div className="text-sm font-bold text-ink">Over 7 Years</div>
                    <div className="mt-1 text-xs text-ink-muted">Requires ADLG's delay approval first. Submit basic info now — documents come after approval.</div>
                </button>
            </div>
        </Modal>
    );
}

function emptyDelayForm(lbrCase) {
    if (!lbrCase) {
        return {
            dob: '',
            delay_reason: '',
            delay_reason_other: '',
            child_name: '',
            child_gender: '',
            applicant_name: '',
            applicant_cnic: '',
            applicant_phone: '',
            secretary_remarks: '',
        };
    }
    const isOtherReason = !DELAY_REASONS.includes(lbrCase.delay_reason);
    return {
        dob: lbrCase.dob || '',
        delay_reason: isOtherReason ? 'Other' : lbrCase.delay_reason,
        delay_reason_other: isOtherReason ? lbrCase.delay_reason || '' : '',
        child_name: lbrCase.child?.name || '',
        child_gender: lbrCase.child?.gender || '',
        applicant_name: lbrCase.applicant?.name || '',
        applicant_cnic: lbrCase.applicant?.cnic || '',
        applicant_phone: lbrCase.applicant?.phone || '',
        secretary_remarks: lbrCase.secretary_remarks || '',
    };
}

/**
 * Handles both the initial "Over 7 Years" delay request and a resubmission after
 * ADLG returns one for correction — same lightweight field set either way, just a
 * different target endpoint and pre-filled starting values.
 */
function DelayRequestModal({ open, lbrCase, onClose }) {
    const queryClient = useQueryClient();
    const isResubmit = !!lbrCase;
    const [form, setForm] = useState(() => emptyDelayForm(lbrCase));
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setForm(emptyDelayForm(lbrCase));
            setError('');
        }
    }, [open, lbrCase]);

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const age = ageFromDob(form.dob);
    const valid =
        form.dob &&
        age !== null &&
        age >= 7 &&
        form.delay_reason &&
        (form.delay_reason !== 'Other' || form.delay_reason_other) &&
        form.child_name &&
        form.child_gender &&
        form.applicant_name &&
        /^\d{5}-\d{7}-\d{1}$/.test(form.applicant_cnic);

    const mutation = useMutation({
        mutationFn: () => {
            const payload = {
                dob: form.dob,
                delay_reason: form.delay_reason === 'Other' ? form.delay_reason_other || 'Other' : form.delay_reason,
                child_name: form.child_name,
                child_gender: form.child_gender,
                applicant_name: form.applicant_name,
                applicant_cnic: form.applicant_cnic,
                applicant_phone: form.applicant_phone,
                secretary_remarks: form.secretary_remarks,
            };
            return isResubmit
                ? client.post(`/api/sec/lbr-cases/${lbrCase.id}/resubmit-delay-request`, payload)
                : client.post('/api/sec/lbr-cases/delay-request', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-lbr-cases'] });
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit the delay request.'),
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isResubmit ? 'Resubmit Delay Request' : 'Delay Approval Request'}
            subtitle="Over 7 Years — basic info only; documents come after ADLG approval"
        >
            <Field label="Child's Date of Birth">
                <TextInput type="date" value={form.dob} onChange={set('dob')} required />
            </Field>
            {form.dob && age !== null && age < 7 && (
                <p className="-mt-2 mb-3 text-xs font-medium text-danger">⚠️ Child is under 7 years — use the standard "1–7 Years" application instead.</p>
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
            <Field label="Applicant Phone (optional)">
                <TextInput
                    value={form.applicant_phone}
                    onChange={(e) => setForm({ ...form, applicant_phone: formatPhone(e.target.value) })}
                    placeholder="0300-1234567"
                />
            </Field>
            <Field label="Secretary Remarks / Observations (optional)">
                <Textarea value={form.secretary_remarks} onChange={set('secretary_remarks')} />
            </Field>
            <ErrorText>{error}</ErrorText>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
                {mutation.isPending ? 'Submitting…' : isResubmit ? '↩️ Resubmit to ADLG' : '📨 Send to ADLG for Delay Approval'}
            </Button>
        </Modal>
    );
}

const emptyCompleteForm = {
    child_birth_place: '',
    child_birth_type: 'Hospital',
    child_hospital: '',
    applicant_relation: 'Father',
    applicant_father_name: '',
    applicant_mother_name: '',
    applicant_address: '',
    secretary_remarks: '',
};

/**
 * Stage 2 for an over-7-years case: unlocked only after ADLG approves the delay.
 * Collects the remaining details + the standard document set, then forwards the
 * case into the exact same FORWARDED review queue as a normal 1–7 application.
 */
function CompleteApplicationModal({ lbrCase, onClose }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptyCompleteForm);
    const [docs, setDocs] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        setForm(emptyCompleteForm);
        setDocs({});
        setError('');
    }, [lbrCase]);

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
    const missingRequiredDocs = DOC_SLOTS.filter((d) => d.required && !docs[d.key]);

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value ?? ''));
            DOC_SLOTS.forEach((slot) => {
                if (docs[slot.key]) formData.append(`documents[${slot.key}]`, docs[slot.key]);
            });
            return client.post(`/api/sec/lbr-cases/${lbrCase.id}/complete-application`, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-lbr-cases'] });
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not complete the application.'),
    });

    return (
        <Modal open={!!lbrCase} onClose={onClose} title="Complete Application" subtitle={lbrCase?.lbr_id}>
            <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3 text-xs text-primary-700">
                ✅ Delay approved by ADLG. Fill in the remaining details and upload documents to forward for final review.
            </div>
            <Field label="Birth Place (optional)">
                <TextInput value={form.child_birth_place} onChange={set('child_birth_place')} />
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
            <Field label="Relation to Child">
                <Select value={form.applicant_relation} onChange={set('applicant_relation')}>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Self">Self</option>
                </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Father's Name (optional)">
                    <TextInput value={form.applicant_father_name} onChange={set('applicant_father_name')} />
                </Field>
                <Field label="Mother's Name (optional)">
                    <TextInput value={form.applicant_mother_name} onChange={set('applicant_mother_name')} />
                </Field>
            </div>
            <Field label="Address (optional)">
                <TextInput value={form.applicant_address} onChange={set('applicant_address')} />
            </Field>

            <div className="my-3 space-y-3">
                {DOC_SLOTS.map((slot) => (
                    <Field key={slot.key} label={slot.label + (slot.required ? '' : ' (optional)')}>
                        <FileInput value={docs[slot.key] || null} onChange={(file) => setDocs({ ...docs, [slot.key]: file })} accept={slot.accept} />
                    </Field>
                ))}
            </div>
            <Field label="Secretary Remarks / Observations (optional)">
                <Textarea value={form.secretary_remarks} onChange={set('secretary_remarks')} />
            </Field>
            {missingRequiredDocs.length > 0 && (
                <p className="mb-2 text-xs text-ink-faint">Mandatory: {missingRequiredDocs.map((d) => d.label).join(', ')}</p>
            )}
            <ErrorText>{error}</ErrorText>
            <Button className="w-full" onClick={() => mutation.mutate()} disabled={missingRequiredDocs.length > 0 || mutation.isPending}>
                {mutation.isPending ? 'Submitting…' : '📤 Forward to ADLG'}
            </Button>
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

function LbrDetailModal({ lbrCaseId, onClose, onRegister, onResubmit, onComplete }) {
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

                    {c.status === 'PENDING_DELAY_APPROVAL' && (
                        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-info">
                            ⏳ Awaiting ADLG's decision on the delay approval request.
                        </div>
                    )}
                    {c.status === 'DELAY_APPROVED' && (
                        <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3 text-xs text-primary-700">
                            ✅ Delay approved. Complete the application below to forward for final review.
                        </div>
                    )}
                    {c.status === 'DELAY_RETURNED' && (
                        <div className="mb-3 rounded-xl border border-accent-400/30 bg-accent-100 p-3 text-xs text-accent-600">
                            ↩️ Delay request returned for correction. Review the ADLG's remarks below and resubmit.
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
                        {c.status === 'DELAY_RETURNED' && (
                            <Button className="flex-1" onClick={() => onResubmit(c)}>
                                ✏️ Resubmit Request
                            </Button>
                        )}
                        {c.status === 'DELAY_APPROVED' && (
                            <Button className="flex-1" onClick={() => onComplete(c)}>
                                📝 Complete Application
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
    const [wizardOpen, setWizardOpen] = useState(false);
    const [delayOpen, setDelayOpen] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [certTarget, setCertTarget] = useState(null);
    const [resubmitTarget, setResubmitTarget] = useState(null);
    const [completeTarget, setCompleteTarget] = useState(null);

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
                    if (cat === '1-7') setWizardOpen(true);
                    else setDelayOpen(true);
                }}
            />
            <NewLbrWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
            <DelayRequestModal
                open={delayOpen || !!resubmitTarget}
                lbrCase={resubmitTarget}
                onClose={() => {
                    setDelayOpen(false);
                    setResubmitTarget(null);
                }}
            />
            <CompleteApplicationModal lbrCase={completeTarget} onClose={() => setCompleteTarget(null)} />
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
                onComplete={(c) => {
                    setActiveId(null);
                    setCompleteTarget(c);
                }}
            />
            <CertificateModal lbrCase={certTarget} onClose={() => setCertTarget(null)} />
        </div>
    );
}
