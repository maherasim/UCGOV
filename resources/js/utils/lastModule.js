const KEY = 'ucgov:last-module';

export const MODULE_LABELS = {
    dv: 'Divorce/Khula Registry',
    lbr: 'Birth Registration',
    att: 'Attendance',
    rep: 'Reports',
};

export const MODULE_KEYWORDS = {
    dv: ['divorce', 'arbitration', 'mflo', 'khula', 'talaq'],
    lbr: ['birth registration', 'lbr', 'delayed birth', 'punjab lbr'],
    att: ['attendance', 'uc', 'secretary uc duties'],
    rep: ['reporting', 'uc governance platform', 'office order'],
};

export function setLastModule(key) {
    try {
        localStorage.setItem(KEY, key);
    } catch {
        // localStorage unavailable (private browsing, etc.) — recommendations simply won't show
    }
}

export function getLastModule() {
    try {
        return localStorage.getItem(KEY);
    } catch {
        return null;
    }
}
