import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownTrayIcon, CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { APP_BASE_PATH } from '../utils/basePath';
import { compressPhoto } from '../utils/photoCapture';
import { Button, ErrorText, Field, Textarea, TextInput } from './ui';
import DocumentPreviewModal from './DocumentPreviewModal';

const emptyForm = {
    date: new Date().toISOString().slice(0, 10),
    venue: 'UC Office',
    petitioner_present: false,
    respondent_present: false,
    petitioner_biometric: false,
    respondent_biometric: false,
    pet_rep_name: '',
    pet_rep_cnic: '',
    res_rep_name: '',
    res_rep_cnic: '',
    pet_statement: '',
    res_statement: '',
    reconciliation: '',
    adjourned: false,
    adjourn_reason: '',
    next_hearing_date: '',
    notice_issued: false,
    notice_ref: '',
    notice_date: '',
    notice_details: '',
};

function Checkbox({ checked, onChange, label }) {
    return (
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            {label}
        </label>
    );
}

/**
 * Camera capture for a party's presence photo — the actual proof behind "Present,"
 * not just the checkbox. Uses the back/environment camera since you're photographing
 * someone else, unlike the front-camera selfie pattern used for secretary attendance.
 */
function PartyPhotoCapture({ label, photo, preview, onCapture, onRetake, error }) {
    const inputRef = useRef(null);

    const handleChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const blob = await compressPhoto(file);
            onCapture(blob, URL.createObjectURL(blob));
        } catch (err) {
            onCapture(null, null, err.message);
        }
    };

    return (
        <div>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
            {preview ? (
                <div className="relative inline-block">
                    <img src={preview} alt={`${label} photo`} className="h-20 w-20 rounded-lg border border-border object-cover" />
                    <button
                        type="button"
                        onClick={onRetake}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow"
                        aria-label={`Retake ${label} photo`}
                    >
                        <XMarkIcon className="h-3 w-3" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={`flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-ink-muted transition hover:border-primary-400 hover:text-primary-600 ${
                        error ? 'border-danger text-danger' : 'border-border'
                    }`}
                >
                    <CameraIcon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">{label}</span>
                </button>
            )}
            {error && <ErrorText>{error}</ErrorText>}
        </div>
    );
}

export function AddHearingForm({ role, caseId, queryKeyPrefix, onDone }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptyForm);
    const [petitionerPhoto, setPetitionerPhoto] = useState(null);
    const [petitionerPreview, setPetitionerPreview] = useState(null);
    const [respondentPhoto, setRespondentPhoto] = useState(null);
    const [respondentPreview, setRespondentPreview] = useState(null);
    const [photoError, setPhotoError] = useState('');
    const [error, setError] = useState('');

    const set = (key) => (val) => setForm({ ...form, [key]: val });

    const retakePetitioner = () => {
        if (petitionerPreview) URL.revokeObjectURL(petitionerPreview);
        setPetitionerPhoto(null);
        setPetitionerPreview(null);
    };
    const retakeRespondent = () => {
        if (respondentPreview) URL.revokeObjectURL(respondentPreview);
        setRespondentPhoto(null);
        setRespondentPreview(null);
    };

    const mutation = useMutation({
        mutationFn: () => {
            const data = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (typeof value === 'boolean') {
                    data.append(key, value ? '1' : '0');
                } else if (value !== '' && value !== null && value !== undefined) {
                    data.append(key, value);
                }
            });
            if (petitionerPhoto) data.append('petitioner_photo', petitionerPhoto, 'petitioner.jpg');
            if (respondentPhoto) data.append('respondent_photo', respondentPhoto, 'respondent.jpg');

            return client.post(`/api/${role}/cases/${caseId}/proceedings`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-cases`] });
            queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-case`, caseId] });
            onDone();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not record hearing.'),
    });

    const submit = (e) => {
        e.preventDefault();
        setError('');
        setPhotoError('');

        if (form.petitioner_present && !petitionerPhoto) {
            setPhotoError('Photo required for anyone marked present.');
            return;
        }
        if (form.respondent_present && !respondentPhoto) {
            setPhotoError('Photo required for anyone marked present.');
            return;
        }
        mutation.mutate();
    };

    return (
        <form className="mt-3 space-y-3 rounded-xl border border-border bg-surface-subtle p-3" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Hearing Date">
                    <TextInput type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} required />
                </Field>
                <Field label="Venue">
                    <TextInput value={form.venue} onChange={(e) => set('venue')(e.target.value)} />
                </Field>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                        <Checkbox checked={form.petitioner_present} onChange={set('petitioner_present')} label="Petitioner Present" />
                        <Checkbox checked={form.petitioner_biometric} onChange={set('petitioner_biometric')} label="Petitioner Biometric" />
                    </div>
                    {form.petitioner_present && (
                        <PartyPhotoCapture
                            label="Petitioner"
                            photo={petitionerPhoto}
                            preview={petitionerPreview}
                            onCapture={(blob, preview, err) => {
                                if (err) setPhotoError(err);
                                else {
                                    setPhotoError('');
                                    setPetitionerPhoto(blob);
                                    setPetitionerPreview(preview);
                                }
                            }}
                            onRetake={retakePetitioner}
                        />
                    )}
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
                    <div className="space-y-2">
                        <Checkbox checked={form.respondent_present} onChange={set('respondent_present')} label="Respondent Present" />
                        <Checkbox checked={form.respondent_biometric} onChange={set('respondent_biometric')} label="Respondent Biometric" />
                    </div>
                    {form.respondent_present && (
                        <PartyPhotoCapture
                            label="Respondent"
                            photo={respondentPhoto}
                            preview={respondentPreview}
                            onCapture={(blob, preview, err) => {
                                if (err) setPhotoError(err);
                                else {
                                    setPhotoError('');
                                    setRespondentPhoto(blob);
                                    setRespondentPreview(preview);
                                }
                            }}
                            onRetake={retakeRespondent}
                        />
                    )}
                </div>
                <ErrorText>{photoError}</ErrorText>
            </div>

            <Field label="Petitioner Statement (optional)">
                <Textarea value={form.pet_statement} onChange={(e) => set('pet_statement')(e.target.value)} />
            </Field>
            <Field label="Respondent Statement (optional)">
                <Textarea value={form.res_statement} onChange={(e) => set('res_statement')(e.target.value)} />
            </Field>
            <Field label="Reconciliation Effort (optional)">
                <Textarea value={form.reconciliation} onChange={(e) => set('reconciliation')(e.target.value)} />
            </Field>

            <div className="rounded-lg border border-border bg-surface p-3">
                <Checkbox checked={form.adjourned} onChange={set('adjourned')} label="Adjourned to next hearing" />
                {form.adjourned && (
                    <div className="mt-2 space-y-2">
                        <TextInput value={form.adjourn_reason} onChange={(e) => set('adjourn_reason')(e.target.value)} placeholder="Reason for adjournment" required />
                        <TextInput type="date" value={form.next_hearing_date} onChange={(e) => set('next_hearing_date')(e.target.value)} required />
                    </div>
                )}
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
                <Checkbox checked={form.notice_issued} onChange={set('notice_issued')} label="Notice issued during this hearing" />
                {form.notice_issued && (
                    <div className="mt-2 space-y-2">
                        <TextInput value={form.notice_ref} onChange={(e) => set('notice_ref')(e.target.value)} placeholder="Notice reference no." required />
                        <TextInput type="date" value={form.notice_date} onChange={(e) => set('notice_date')(e.target.value)} required />
                        <Textarea value={form.notice_details} onChange={(e) => set('notice_details')(e.target.value)} placeholder="Notice details (optional)" />
                    </div>
                )}
            </div>

            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : '➕ Save Hearing Record'}
            </Button>
        </form>
    );
}

export function ProceedingsList({ proceedings }) {
    const [previewDoc, setPreviewDoc] = useState(null);

    if (!proceedings || proceedings.length === 0) {
        return <p className="text-xs text-ink-faint">No hearings recorded yet.</p>;
    }

    return (
        <div className="space-y-2">
            {proceedings.map((p, i) => (
                <div key={p.id} className="rounded-xl border border-border p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-ink">Hearing {i + 1} · {p.proc_no}</span>
                        <span className="text-[11px] text-ink-faint">{p.date}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
                        <span className="flex items-center gap-1.5">
                            Petitioner: {p.petitioner_present ? 'Present' : 'Absent'}{p.petitioner_biometric ? ' ✓' : ''}
                            {p.petitioner_photo_url && (
                                <button
                                    onClick={() => setPreviewDoc({ label: `Petitioner — Hearing ${i + 1}`, file_url: p.petitioner_photo_url })}
                                    className="shrink-0"
                                >
                                    <img src={p.petitioner_photo_url} alt="Petitioner" className="h-8 w-8 rounded-md border border-border object-cover" />
                                </button>
                            )}
                        </span>
                        <span className="flex items-center gap-1.5">
                            Respondent: {p.respondent_present ? 'Present' : 'Absent'}{p.respondent_biometric ? ' ✓' : ''}
                            {p.respondent_photo_url && (
                                <button
                                    onClick={() => setPreviewDoc({ label: `Respondent — Hearing ${i + 1}`, file_url: p.respondent_photo_url })}
                                    className="shrink-0"
                                >
                                    <img src={p.respondent_photo_url} alt="Respondent" className="h-8 w-8 rounded-md border border-border object-cover" />
                                </button>
                            )}
                        </span>
                    </div>
                    {p.reconciliation && <div className="mt-1 text-[11px] text-ink-muted">Reconciliation: {p.reconciliation}</div>}
                    {p.adjourned && <div className="mt-1 text-[11px] font-medium text-accent-700">Adjourned — Next hearing: {p.next_hearing_date}</div>}
                    {p.notice_issued && <div className="mt-1 text-[11px] font-medium text-info">Notice {p.notice_ref} issued {p.notice_date}</div>}
                </div>
            ))}

            <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
        </div>
    );
}

export function CaseDocumentButtons({ role, caseId }) {
    return (
        <div className="flex gap-2">
            <a
                href={`${APP_BASE_PATH}/api/${role}/cases/${caseId}/notesheet`}
                target="_blank"
                rel="noopener"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
            >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Notesheet
            </a>
            <a
                href={`${APP_BASE_PATH}/api/${role}/cases/${caseId}/full-file`}
                target="_blank"
                rel="noopener"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
            >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Full Case File
            </a>
        </div>
    );
}
