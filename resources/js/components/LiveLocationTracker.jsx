import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import client from '../api/client';
import { useMovementLog } from '../context/MovementLogContext';

const PING_INTERVAL_MS = 45000;

function isWorkingHours() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return day >= 0 && day <= 4 && hour >= 9 && hour < 17; // Sun–Thu 9AM–5PM
}

/**
 * Mounted once at the Secretary layout level (not the Attendance page) so it keeps running
 * no matter which tab the secretary is on — mirrors the prototype's initSEC() wiring, which
 * starts watchPosition at login, not when the Attendance tab is opened.
 *
 * Owns only the geolocation watch; the movement-log modal itself lives in
 * MovementLogContext so this auto-prompt and the sidebar's manual button share one modal.
 */
export default function LiveLocationTracker() {
    const { openMovementLog } = useMovementLog();
    const watchIdRef = useRef(null);
    const lastPingRef = useRef(0);
    const promptedRef = useRef(false);

    const pingMutation = useMutation({
        mutationFn: ({ lat, lng, accuracy }) => client.post('/api/sec/attendance/live-location', { lat, lng, accuracy }),
        onSuccess: ({ data }) => {
            if (data.inside_geofence === false) {
                if (!promptedRef.current) {
                    promptedRef.current = true;
                    openMovementLog(true);
                }
            } else {
                promptedRef.current = false;
            }
        },
    });

    useEffect(() => {
        if (!navigator.geolocation || !isWorkingHours()) return undefined;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now();
                if (now - lastPingRef.current < PING_INTERVAL_MS) return;
                lastPingRef.current = now;
                pingMutation.mutate({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
