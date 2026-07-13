import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import App from './router';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false },
    },
});

// No <StrictMode> — its dev-only double-invoked effects collide with datatables.net-react's
// imperative DOM cleanup (jQuery-plugin-style libraries + StrictMode is a known bad mix),
// producing "Cannot reinitialise DataTable" on every page using components/DataTable.jsx.
// StrictMode's double-invoke only ever ran in dev anyway — no production behavior changes.
createRoot(document.getElementById('app')).render(
    <QueryClientProvider client={queryClient}>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </QueryClientProvider>
);
