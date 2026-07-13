import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const SIZE_CLASSES = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-14 w-14 text-xl',
    lg: 'h-20 w-20 text-2xl',
};

export function Avatar({ user, size = 'md', className = '' }) {
    const sizeClass = SIZE_CLASSES[size] || size;

    if (user?.avatar_url) {
        return (
            <img
                src={user.avatar_url}
                alt={user.name}
                className={`${sizeClass} flex-shrink-0 rounded-full object-cover ${className}`}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} flex flex-shrink-0 items-center justify-center rounded-full bg-primary-500 font-bold text-white ${className}`}
        >
            {user?.name?.charAt(0) || '?'}
        </div>
    );
}

export function AvatarUpload({ size = 'lg' }) {
    const { user, refresh } = useAuth();
    const queryClient = useQueryClient();
    const inputRef = useRef(null);
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: (file) => {
            const formData = new FormData();
            formData.append('avatar', file);
            return client.post('/api/profile/avatar', formData);
        },
        onSuccess: async () => {
            setError('');
            await refresh();
            queryClient.invalidateQueries();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not upload photo.'),
    });

    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) mutation.mutate(file);
    };

    return (
        <div>
            <div className="relative inline-block">
                <Avatar user={user} size={size} />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={mutation.isPending}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary-500 text-white shadow-sm hover:bg-primary-600 disabled:opacity-60"
                    aria-label="Change photo"
                >
                    <CameraIcon className="h-3.5 w-3.5" />
                </button>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleChange} />
            </div>
            {mutation.isPending && <p className="mt-1.5 text-xs text-ink-muted">Uploading…</p>}
            {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
        </div>
    );
}
