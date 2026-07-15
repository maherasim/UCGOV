import { EyeIcon } from '@heroicons/react/24/outline';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function urlPath(url) {
    return (url || '').split('?')[0].toLowerCase();
}

export function isImageUrl(url) {
    return IMAGE_EXTENSIONS.some((ext) => urlPath(url).endsWith(ext));
}

export function isPdfUrl(url) {
    return urlPath(url).endsWith('.pdf');
}

/**
 * A clickable document row with a view-icon, used wherever a case/LBR document list is
 * rendered — clicking previews images/PDFs in DocumentPreviewModal instead of always
 * navigating away to a new tab.
 */
export function DocumentLink({ label, fileUrl, onPreview }) {
    return (
        <button
            onClick={() => onPreview({ label, file_url: fileUrl })}
            className="flex w-full items-center gap-1.5 text-left text-xs font-medium text-primary-600 hover:underline"
        >
            <EyeIcon className="h-3.5 w-3.5 flex-shrink-0" /> {label}
        </button>
    );
}

export default function DocumentPreviewModal({ doc, onClose }) {
    if (!doc) return null;

    const image = isImageUrl(doc.file_url);
    const pdf = isPdfUrl(doc.file_url);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
            <div
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
                    <h2 className="text-sm font-bold text-ink">{doc.label}</h2>
                    <button onClick={onClose} className="rounded-lg p-1 text-ink-muted hover:bg-surface-subtle" aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-surface-subtle p-4">
                    {image ? (
                        <img src={doc.file_url} alt={doc.label} className="mx-auto max-h-[70vh] rounded-lg object-contain" />
                    ) : pdf ? (
                        <iframe src={doc.file_url} title={doc.label} className="h-[70vh] w-full rounded-lg border border-border bg-white" />
                    ) : (
                        <p className="py-10 text-center text-sm text-ink-muted">
                            This file type can't be previewed here — open it directly instead.
                        </p>
                    )}
                </div>

                <div className="flex-shrink-0 border-t border-border px-5 py-3">
                    <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener"
                        className="block text-center text-xs font-semibold text-primary-600 hover:underline"
                    >
                        Open original in new tab ↗
                    </a>
                </div>
            </div>
        </div>
    );
}
