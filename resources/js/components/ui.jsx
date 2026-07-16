import { useRef, useState } from 'react';
import { CheckIcon, ClipboardDocumentIcon, DocumentIcon, EyeIcon, EyeSlashIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function Button({ variant = 'primary', className = '', ...props }) {
    const variants = {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-400',
        accent: 'bg-accent-500 text-white hover:bg-accent-600',
        ghost: 'bg-surface border border-border text-ink hover:bg-surface-subtle',
        danger: 'bg-danger text-white hover:opacity-90',
    };

    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        />
    );
}

export function Badge({ tone = 'neutral', children }) {
    const tones = {
        neutral: 'bg-surface-subtle text-ink-muted border-border',
        success: 'bg-primary-50 text-primary-700 border-primary-100',
        warning: 'bg-accent-100 text-accent-600 border-accent-400/30',
        danger: 'bg-red-50 text-danger border-red-200',
        info: 'bg-blue-50 text-info border-blue-200',
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
            {children}
        </span>
    );
}

/**
 * The "@" is purely a visual affordance (login screens don't want it) — `select-none` keeps
 * it out of the browser's text selection so a drag-select/copy over this cell only ever
 * copies the real username. The copy button is the same guarantee for a single click.
 */
export function UsernameTag({ username }) {
    const [copied, setCopied] = useState(false);

    const copy = async (e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(username);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API unavailable (e.g. insecure context) — nothing to fall back to.
        }
    };

    return (
        <span className="group inline-flex items-center gap-1">
            <span className="font-mono text-[13px] text-ink">
                <span className="select-none text-ink-faint">@</span>
                {username}
            </span>
            <button
                type="button"
                onClick={copy}
                className="rounded p-0.5 text-ink-faint opacity-0 transition group-hover:opacity-100 hover:text-primary-600"
                title={copied ? 'Copied!' : 'Copy username'}
                aria-label="Copy username"
            >
                {copied ? <CheckIcon className="h-3.5 w-3.5 text-primary-600" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
            </button>
        </span>
    );
}

export function Spinner({ className = '' }) {
    return (
        <div
            className={`h-5 w-5 animate-spin rounded-full border-2 border-primary-100 border-t-primary-500 ${className}`}
            role="status"
            aria-label="Loading"
        />
    );
}

export function FullScreenSpinner() {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Spinner className="h-8 w-8" />
        </div>
    );
}

export function Card({ className = '', children }) {
    return (
        <div className={`rounded-2xl border border-border bg-surface shadow-sm ${className}`}>
            {children}
        </div>
    );
}

const kpiTones = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-100 text-accent-600',
    info: 'bg-blue-50 text-info',
    danger: 'bg-red-50 text-danger',
};

export function KpiCard({ label, value, sub, icon: Icon, tone = 'primary' }) {
    return (
        <Card className="p-5">
            <div className="flex items-start justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
                {Icon && (
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpiTones[tone]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </div>
            <div className="mt-3 text-3xl font-extrabold text-ink">{value}</div>
            {sub && <div className="mt-1 text-xs text-ink-faint">{sub}</div>}
        </Card>
    );
}

export function EmptyState({ icon = '📭', title, subtitle }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="text-4xl">{icon}</div>
            <div className="mt-3 font-semibold text-ink">{title}</div>
            {subtitle && <div className="mt-1 max-w-sm text-sm text-ink-muted">{subtitle}</div>}
        </div>
    );
}

/**
 * Footer pager for server-paginated lists (Laravel's default paginate() meta shape:
 * current_page/last_page/total/from/to). Use when a list is too large to fetch in one
 * request and hand to the client-side DataTable component.
 */
export function Pagination({ meta, onPageChange }) {
    if (!meta || meta.last_page <= 1) return null;
    const { current_page, last_page, total, from, to } = meta;

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <span className="text-xs text-ink-muted">
                Showing {from}–{to} of {total}
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page <= 1}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Prev
                </button>
                <span className="text-xs font-semibold text-ink-muted">
                    Page {current_page} of {last_page}
                </span>
                <button
                    type="button"
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={current_page >= last_page}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export function Field({ label, children }) {
    return (
        <label className="mb-3 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
            {children}
        </label>
    );
}

/**
 * A persistent label for one input inside a grouped Field (e.g. Name/CNIC/Phone stacked
 * under one "Divorcer" heading) — placeholder text alone isn't enough to tell an empty,
 * editable field apart from static text, especially when the placeholder looks like real data.
 */
export function SubLabel({ children }) {
    return <span className="mb-1 block text-[11px] font-medium text-ink-muted">{children}</span>;
}

const inputClass =
    'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';

export function TextInput(props) {
    return <input className={inputClass} {...props} />;
}

export function PasswordInput({ className = '', ...props }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <input type={visible ? 'text' : 'password'} className={`${inputClass} pr-10 ${className}`} {...props} />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
                aria-label={visible ? 'Hide password' : 'Show password'}
            >
                {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
        </div>
    );
}

export function Textarea(props) {
    return <textarea className={`${inputClass} resize-none`} rows={4} {...props} />;
}

export function Select({ children, ...props }) {
    return (
        <select className={inputClass} {...props}>
            {children}
        </select>
    );
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileInput({ value, onChange, accept, hint, required }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = (file) => {
        if (file) onChange(file);
    };

    if (value) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-subtle p-3">
                <DocumentIcon className="h-8 w-8 flex-shrink-0 text-primary-500" />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{value.name}</div>
                    <div className="text-xs text-ink-muted">{formatFileSize(value.size)}</div>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-danger"
                    aria-label="Remove file"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div>
            <label
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-6 text-center transition ${
                    dragOver ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-300 hover:bg-surface-subtle'
                }`}
            >
                <PaperClipIcon className="h-6 w-6 text-ink-faint" />
                <div className="text-sm font-medium text-ink">
                    <span className="text-primary-600">Click to upload</span> or drag and drop
                </div>
                {hint && <div className="text-xs text-ink-muted">{hint}</div>}
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    required={required}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                />
            </label>
        </div>
    );
}

export function Modal({ open, onClose, title, subtitle, children }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-xl">
                <div className="flex flex-shrink-0 items-start justify-between border-b border-border px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-ink">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-ink-muted hover:bg-surface-subtle"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="overflow-y-auto p-6">{children}</div>
            </div>
        </div>
    );
}

export function ErrorText({ children }) {
    if (!children) return null;
    return <p className="mt-1 text-xs font-medium text-danger">{children}</p>;
}


export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, pending }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
                <h2 className="text-base font-bold text-ink">{title}</h2>
                <p className="mt-2 text-sm text-ink-muted">{message}</p>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onCancel} disabled={pending}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onConfirm} disabled={pending}>
                        {pending ? 'Deleting…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
