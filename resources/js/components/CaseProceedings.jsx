import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { Button, ErrorText, Field, Textarea, TextInput } from './ui';

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

export function AddHearingForm({ role, caseId, queryKeyPrefix, onDone }) {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    const set = (key) => (val) => setForm({ ...form, [key]: val });

    const mutation = useMutation({
        mutationFn: () => client.post(`/api/${role}/cases/${caseId}/proceedings`, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-cases`] });
            queryClient.invalidateQueries({ queryKey: [`${queryKeyPrefix}-case`, caseId] });
            onDone();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not record hearing.'),
    });

    return (
        <form
            className="mt-3 space-y-3 rounded-xl border border-border bg-surface-subtle p-3"
            onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
            }}
        >
            <div className="grid grid-cols-2 gap-3">
                <Field label="Hearing Date">
                    <TextInput type="date" value={form.date} onChange={(e) => set('date')(e.target.value)} required />
                </Field>
                <Field label="Venue">
                    <TextInput value={form.venue} onChange={(e) => set('venue')(e.target.value)} />
                </Field>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-3">
                <Checkbox checked={form.petitioner_present} onChange={set('petitioner_present')} label="Petitioner Present" />
                <Checkbox checked={form.petitioner_biometric} onChange={set('petitioner_biometric')} label="Petitioner Biometric" />
                <Checkbox checked={form.respondent_present} onChange={set('respondent_present')} label="Respondent Present" />
                <Checkbox checked={form.respondent_biometric} onChange={set('respondent_biometric')} label="Respondent Biometric" />
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
                    <div className="text-[11px] text-ink-muted">
                        Petitioner: {p.petitioner_present ? 'Present' : 'Absent'}{p.petitioner_biometric ? ' ✓' : ''} · Respondent: {p.respondent_present ? 'Present' : 'Absent'}{p.respondent_biometric ? ' ✓' : ''}
                    </div>
                    {p.reconciliation && <div className="mt-1 text-[11px] text-ink-muted">Reconciliation: {p.reconciliation}</div>}
                    {p.adjourned && <div className="mt-1 text-[11px] font-medium text-accent-700">Adjourned — Next hearing: {p.next_hearing_date}</div>}
                    {p.notice_issued && <div className="mt-1 text-[11px] font-medium text-info">Notice {p.notice_ref} issued {p.notice_date}</div>}
                </div>
            ))}
        </div>
    );
}

export function CaseDocumentButtons({ role, caseId }) {
    return (
        <div className="flex gap-2">
            <a
                href={`/api/${role}/cases/${caseId}/notesheet`}
                target="_blank"
                rel="noopener"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
            >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Notesheet
            </a>
            <a
                href={`/api/${role}/cases/${caseId}/full-file`}
                target="_blank"
                rel="noopener"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-subtle"
            >
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Full Case File
            </a>
        </div>
    );
}
