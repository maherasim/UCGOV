<!DOCTYPE html>
<html lang="en">
<head>
    @php
        // APP_URL may include a subdirectory (e.g. https://migalo.de/ucgov) when this app
        // isn't served from its domain's root — every absolute path the SPA builds must be
        // prefixed with this, since the browser otherwise resolves them against the domain root.
        $basePath = rtrim(parse_url(config('app.url'), PHP_URL_PATH) ?? '', '/');
    @endphp
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="app-base-path" content="{{ $basePath }}">
    <title>UC Governance Platform</title>
    <link rel="icon" type="image/png" href="{{ $basePath }}/localgovrment.png">
    @if (app()->environment('local'))
        {{-- Blade isn't processed through Vite's HTML transform, so @vitejs/plugin-react's
             automatic Fast Refresh preamble injection never fires — add it manually. --}}
        <script type="module">
            import RefreshRuntime from 'http://127.0.0.1:5173/@react-refresh'
            RefreshRuntime.injectIntoGlobalHook(window)
            window.$RefreshReg$ = () => {}
            window.$RefreshSig$ = () => (type) => type
            window.__vite_plugin_react_preamble_installed__ = true
        </script>
    @endif
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>
    <div id="app"></div>
</body>
</html>
