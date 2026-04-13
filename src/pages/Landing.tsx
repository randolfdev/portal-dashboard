import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-bold text-slate-800">Portal Dashboard</h1>
        <p className="text-slate-600">
          Acesse o painel do seu tenant pelo link fornecido pelo administrador.
        </p>
        <div className="pt-2">
          <Link
            to="/t/renal-vida/login"
            className="inline-block px-5 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
          >
            Entrar — Renal Vida
          </Link>
        </div>
      </div>
    </main>
  )
}
