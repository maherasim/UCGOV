<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UC Governance Platform | Government of Punjab</title>
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
