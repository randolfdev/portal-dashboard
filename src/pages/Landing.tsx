export default function Landing() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-3xl font-bold text-slate-800">Portal Dashboard</h1>
        <p className="text-slate-600">
          Acesse pelo subdomínio do seu tenant — ex:{' '}
          <code className="bg-slate-200 px-1 rounded">acme.localhost:5173</code> — ou{' '}
          <code className="bg-slate-200 px-1 rounded">admin.localhost:5173</code> para o
          painel da plataforma.
        </p>
      </div>
    </main>
  )
}
