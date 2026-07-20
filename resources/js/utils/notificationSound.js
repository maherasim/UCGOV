import { APP_BASE_PATH } from './basePath';

/**
 * Custom notification sound (public/audio.mp3). Browsers block audio playback
 * until a user gesture, so we prime/unlock the element on the first click or
 * keypress anywhere on the page, and reuse one Audio instance for every chime.
 */
let audioEl = null;
let unlocked = false;

function getAudio() {
    if (!audioEl) {
        audioEl = new Audio(`${APP_BASE_PATH}/audio.mp3`);
        audioEl.volume = 0.6;
    }
    return audioEl;
}

function unlock() {
    if (unlocked) return;
    unlocked = true;
    const audio = getAudio();
    // Muted play+pause primes the element so later, un-muted plays aren't blocked.
    audio.muted = true;
    audio.play()
        .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
        })
        .catch(() => {
            audio.muted = false;
        });
}
document.addEventListener('click', unlock, { once: true });
document.addEventListener('keydown', unlock, { once: true });

export function playNotificationChime() {
    try {
        const audio = getAudio();
        audio.currentTime = 0;
        audio.play().catch(() => {
            // Autoplay blocked (no user gesture yet this session) — badge count still updates.
        });
    } catch {
        // Audio unsupported — ignore.
    }
}
