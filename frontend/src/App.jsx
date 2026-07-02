function App() {
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5001/api/v1';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-blue-600">
          Phase 1 development environment
        </p>

        <h1 className="mb-4 text-4xl font-bold text-slate-900">
          WAM CRM AI
        </h1>

        <p className="leading-7 text-slate-600">
          Repository and local infrastructure are running.
        </p>

        <div className="mt-6 flex items-center gap-2 font-semibold text-slate-800">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          Frontend is running
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Backend URL:{' '}
          <code className="break-all rounded bg-slate-100 px-2 py-1">
            {apiBaseUrl}
          </code>
        </p>
      </section>
    </main>
  );
}

export default App;