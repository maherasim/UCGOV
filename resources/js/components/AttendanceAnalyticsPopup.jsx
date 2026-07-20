import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_BASE_PATH } from '../utils/basePath';
import { Button, Modal } from './ui';

const WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Mounted once at the ADLG layout level so it fires on a schedule tied to login time, not to
 * visiting the Attendance page — mirrors the prototype's initADLG() -> scheduleAttPopup().
 */
export default function AttendanceAnalyticsPopup() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const shownRef = useRef(false);
    const timerRef = useRef(null);

    useEffect(() => {
        const now = new Date();
        if (!WORK_DAYS.includes(now.getDay())) return undefined;

        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0);
        const endOfWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
        const msUntilTarget = target.getTime() - now.getTime();

        const show = () => {
            if (shownRef.current) return;
            shownRef.current = true;
            setOpen(true);
        };

        if (msUntilTarget <= 0) {
            if (now < endOfWindow) show();
        } else {
            timerRef.current = setTimeout(show, msUntilTarget);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const download = () => {
        window.open(`${APP_BASE_PATH}/api/adlg/attendance/analytics-export`, '_blank');
        setOpen(false);
    };

    return (
        <Modal open={open} onClose={() => setOpen(false)} title="Daily Attendance Analytics">
            <div className="py-2 text-center">
                <div className="mb-2 text-4xl">📊</div>
                <p className="mb-5 text-sm leading-relaxed text-ink-muted">
                    It's 10:30 AM on {DAY_NAMES[new Date().getDay()]}. Would you like to generate today's attendance analytics report for
                    Tehsil {user?.adlg_profile?.tehsil}?
                </p>
                <div className="flex justify-center gap-3">
                    <Button onClick={download}>📥 Generate &amp; Download</Button>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Later
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
