import { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './css/globals.css'
import App from './App.tsx'
import Spinner from './views/spinner/Spinner.tsx'
import { AuthProvider } from './contexts/AuthContext'; // Importa AuthProvider


createRoot(document.getElementById('root')!).render(
<Suspense fallback={<Spinner />}>
    <AuthProvider> {/* Envuelve App con AuthProvider */}
        <App />
    </AuthProvider>
</Suspense>
    ,
)
