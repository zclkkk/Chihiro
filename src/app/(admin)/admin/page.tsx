export default function AdminPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 dark:border-zinc-700 dark:bg-zinc-900/70">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Admin
        </h1>
        <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          This route is reserved for the management console. We will build the
          article management workflow here in a later step.
        </p>
      </div>
    </main>
  );
}
