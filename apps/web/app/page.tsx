export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 text-gray-100">
      <div className="text-3xl font-bold text-yellow-400">Golkar Profiling</div>
      <p className="text-gray-400">By Golkarpedia</p>

      <div className="flex gap-4">
        <button className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold text-gray-900">
          Login
        </button>
        <button className="rounded-lg border border-yellow-400 px-4 py-2 font-semibold text-yellow-400">
          Register
        </button>
      </div>
    </main>
  )
}
