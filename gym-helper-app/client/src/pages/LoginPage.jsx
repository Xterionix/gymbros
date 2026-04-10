import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/theme/AuthContext.jsx';

function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [loading, navigate, user]);

  return (
    <main className="relative h-dvh overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/15" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <section className="relative grid h-full lg:grid-cols-[1fr_auto] xl:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden items-center px-10 xl:flex xl:px-14">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.35em] text-blue-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-blue-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Gym-Rat Control Center
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-600 dark:text-blue-400">
                Comm link ready
              </p>
              <h1 className="max-w-xl text-5xl font-black leading-tight 2xl:text-6xl">
                Train with a dashboard that feels as sharp as your sessions.
              </h1>
              <p className="max-w-xl text-lg leading-7 text-slate-600 dark:text-slate-300">
                Track workouts, calories, hydration, and consistency from a single command hub.
                Sign in with Google to sync your progress and pick up where you left off.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Workout split</p>
                <p className="mt-3 text-xl font-black text-blue-600 dark:text-blue-400">Daily</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Nutrition</p>
                <p className="mt-3 text-xl font-black text-emerald-600 dark:text-emerald-400">Live</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">Consistency</p>
                <p className="mt-3 text-xl font-black text-orange-500">Locked</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-6 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:bg-[#111827]/85 dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-7">
            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Welcome back</p>
              <div className="relative mt-4 flex h-40 w-40 items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-white">
                <img src="/assets/gymrat.png" alt="Gym-Rat mascot" className="relative h-28 w-28 object-contain drop-shadow-[0_14px_24px_rgba(15,23,42,0.18)]" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-900 dark:text-white">Sign in to continue</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Use your Google account to sync workouts, nutrition, and streaks across devices.
              </p>
            </div>

            <button
              type="button"
              aria-label="Sign in with Google"
              onClick={login}
              className="mt-6 inline-flex w-full items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.10)] transition-transform duration-300 hover:scale-[1.02] hover:shadow-[0_14px_34px_rgba(15,23,42,0.14)] active:scale-[0.98] dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
            >
              <img src="/assets/google.png" alt="" aria-hidden="true" className="h-5 w-5 shrink-0" />
              Sign in with Google
            </button>

            <p className="mt-5 text-center text-xs leading-6 text-slate-500 dark:text-slate-400">
              By continuing, you agree to our <a className="underline decoration-dotted" href="#">Terms</a> and{' '}
              <a className="underline decoration-dotted" href="#">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
