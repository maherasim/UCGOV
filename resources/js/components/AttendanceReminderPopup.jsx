import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Button, Modal } from './ui';

const WORK_DAYS = [1, 2, 3, 4, 5, 6]; // Mon–Sat — matches LiveLocationTracker / AttendanceAnalyticsPopup

/**
 * Mounted once at the Secretary layout level so it fires on a schedule tied to login time,
 * not to visiting the Dashboard tab — mirrors ADLG's AttendanceAnalyticsPopup, just at 9AM
 * and skipped entirely once today's attendance is already marked.
 */
export default function AttendanceReminderPopup() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const shownRef = useRef(false);
    const timerRef = useRef(null);

    const { data } = useQuery({
        queryKey: ['sec-attendance'],
        queryFn: () => client.get('/api/sec/attendance').then((r) => r.data.data),
    });

    const today = new Date().toISOString().slice(0, 10);
    const attendedToday = data?.some((r) => r.attendance_date === today);

    useEffect(() => {
        const now = new Date();
        if (!WORK_DAYS.includes(now.getDay())) return undefined;

        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (attendedToday) return null;

    const goMark = () => {
        setOpen(false);
        navigate('/sec/attendance');
    };

    return (
        <Modal open={open} onClose={() => setOpen(false)} title="Mark Today's Attendance">
            <div className="py-2 text-center">
                <div className="mb-2 text-4xl">🕘</div>
                <p className="mb-5 text-sm leading-relaxed text-ink-muted">
                    It's 9:00 AM — please mark your attendance for today.
                </p>
                <div className="flex justify-center gap-3">
                    <Button onClick={goMark}>📍 Mark Attendance</Button>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Later
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
