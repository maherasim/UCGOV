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
