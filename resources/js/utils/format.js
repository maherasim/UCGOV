// Pakistani CNIC: 36602-3534535-7 (5-7-1 digits)
export function formatCnic(raw) {
    const d = raw.replace(/\D/g, '').slice(0, 13);
    let out = d.slice(0, 5);
    if (d.length > 5) out += '-' + d.slice(5, 12);
    if (d.length > 12) out += '-' + d.slice(12, 13);
    return out;
}

// Pakistani mobile number: 0300-1234567 (4-7 digits)
export function formatPhone(raw) {
    const d = raw.replace(/\D/g, '').slice(0, 11);
    let out = d.slice(0, 4);
    if (d.length > 4) out += '-' + d.slice(4, 11);
    return out;
}

// Plain "HH:MM[:SS]" time-of-day string (e.g. attendance check_in_time) -> "9:29 AM".
// No date/timezone involved — it's a naive time value, formatted as-is.
export function formatTime(value) {
    if (!value) return '—';
    const match = /^(\d{1,2}):(\d{2})/.exec(value);
    if (!match) return value;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
}

// Full ISO datetime -> "29 Jul 2026, 1:08 PM", always rendered in Pakistan time
// regardless of the viewer's own device/browser timezone.
export function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
