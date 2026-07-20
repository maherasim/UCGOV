import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from './ui';

const WORK_DAYS = [0, 1, 2, 3, 4]; // Sun–Thu — matches LiveLocationTracker / AttendanceAnalyticsPopup
const CHECK_INTERVAL_MS = 60000;
const SNOOZE_MS = 5 * 60000;

function isWorkingHours() {
    const now = new Date();
    const hour = now.getHours();
    return WORK_DAYS.includes(now.getDay()) && hour >= 9 && hour < 17;
}

/**
 * Mounted once at the Secretary layout level so it watches connectivity/GPS across every
 * tab, not just Attendance — both attendance marking and live movement tracking depend on
 * internet + location being on during office hours (9AM–5PM, Sun–Thu).
 */
export default function ConnectivityMonitor() {
    const [offline, setOffline] = useState(!navigator.onLine);
    const [locationOff, setLocationOff] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const snoozeUntilRef = useRef(0);

    useEffect(() => {
        const handleOffline = () => setOffline(true);
        const handleOnline = () => setOffline(false);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationOff(true);
            return undefined;
        }

        const checkLocation = () => {
            if (!isWorkingHours()) return;
            navigator.geolocation.getCurrentPosition(
                () => setLocationOff(false),
                (err) => {
                    if (err.code === err.PERMISSION_DENIED || err.code === err.POSITION_UNAVAILABLE) setLocationOff(true);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
            );
        };

        checkLocation();
        const interval = setInterval(checkLocation, CHECK_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    const hasIssue = isWorkingHours() && (offline || locationOff);

    useEffect(() => {
        if (hasIssue && Date.now() > snoozeUntilRef.current) setDismissed(false);
    }, [hasIssue, offline, locationOff]);

    const dismiss = () => {
        snoozeUntilRef.current = Date.now() + SNOOZE_MS;
        setDismissed(true);
    };

    return (
        <Modal open={hasIssue && !dismissed} onClose={dismiss} title="⚠️ Attention Required">
            <div className="py-1">
                <p className="mb-3 text-sm text-ink-muted">
                    Office hours are 9AM–5PM. Please keep the following on so your attendance and movement can be tracked correctly:
                </p>
                <ul className="mb-5 space-y-2">
                    {offline && (
                        <li className="flex items-center gap-2 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                            📡 Internet connection is off
                        </li>
                    )}
                    {locationOff && (
                        <li className="flex items-center gap-2 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                            📍 Location / GPS access is off
                        </li>
                    )}
                </ul>
                <Button className="w-full" onClick={dismiss}>
                    Got it
                </Button>
            </div>
        </Modal>
    );
}
