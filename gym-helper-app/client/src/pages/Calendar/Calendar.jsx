import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, unknownUser } from "../../contexts/theme/AuthContext";

export default function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("weekly");
  const [focusDate, setFocusDate] = useState(() => new Date());

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date();
  const routines = user?.workoutTemplates || [];
  const displayUsername = user?.username ?? unknownUser.username ?? "Athlete";

  const getWorkoutForDay = (dayName) => routines.find((routine) => routine.days?.includes(dayName)) || null;
  const getWorkoutForDate = (date) => getWorkoutForDay(daysOfWeek[date.getDay()]);

  const startOfWeek = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
  };

  const shiftPeriod = (direction) => {
    setFocusDate((current) => {
      const next = new Date(current);
      if (viewMode === "monthly") {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setDate(next.getDate() + direction * 7);
      }
      return next;
    });
  };

  const weekStart = startOfWeek(focusDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const monthStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1);
  const monthEnd = new Date(focusDate.getFullYear(), focusDate.getMonth() + 1, 0);
  const leadingDays = monthStart.getDay();
  const totalDays = monthEnd.getDate();
  const monthCells = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => new Date(focusDate.getFullYear(), focusDate.getMonth(), index + 1)),
  ];

  const periodTitle =
    viewMode === "monthly"
      ? focusDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : `${weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const simpleCard = "bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm";

  return (
    <main className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-gray-100 p-4 lg:p-6 overflow-hidden font-sans">
      <div className="shrink-0 mb-4">
        <p className="text-xs uppercase tracking-widest text-blue-500 mb-1 font-semibold">Calendar</p>
        <h1 className="text-3xl lg:text-4xl font-extrabold dark:text-white">Schedule map for {displayUsername}</h1>
      </div>

      <section className={`${simpleCard} shrink-0 p-4 mb-4`}>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-[#0b101e]">
                <button
                  type="button"
                  onClick={() => setViewMode("weekly")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${viewMode === "weekly" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"}`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("monthly")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${viewMode === "monthly" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"}`}
                >
                  Monthly
                </button>
          </div>

          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-[#0b101e]">
                <button
                  type="button"
                  onClick={() => shiftPeriod(-1)}
                  aria-label={viewMode === "monthly" ? "Previous month" : "Previous week"}
                  className="flex h-10 w-10 items-center justify-center rounded-l-xl text-slate-600 transition hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <span className="text-xl leading-none">‹</span>
                </button>
                <div className="min-w-[180px] px-4 py-2 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    {viewMode === "monthly" ? "Month" : "Week"}
                  </p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{periodTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => shiftPeriod(1)}
                  aria-label={viewMode === "monthly" ? "Next month" : "Next week"}
                  className="flex h-10 w-10 items-center justify-center rounded-r-xl text-slate-600 transition hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <span className="text-xl leading-none">›</span>
                </button>
          </div>

          <button
            onClick={() => navigate("/workout")}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
          >
            Edit workout splits
          </button>
          </div>
      </section>

      {routines.length === 0 ? (
        <section className={`${simpleCard} flex min-h-0 flex-1 items-center justify-center border-dashed p-6 text-center`}>
            <div className="max-w-md">
              <p className="text-lg font-bold text-slate-900 dark:text-white">No workout splits yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Create workout templates in the Workout page and they will show up here as your calendar.
              </p>
              <button
                onClick={() => navigate("/workout")}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Go to Workout
              </button>
            </div>
        </section>
      ) : (
        <section className={`${simpleCard} min-h-0 p-4 lg:p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                    {viewMode === "monthly" ? "Month view" : "Week view"}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    {viewMode === "monthly" ? "Current month schedule" : "Planned training days"}
                  </h2>
                </div>
                <p className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:border-gray-700 dark:bg-[#0b101e] dark:text-slate-400">
                  {routines.length} splits
                </p>
              </div>

              {viewMode === "weekly" ? (
                <div className="grid h-[calc(100%-3.5rem)] min-h-0 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                  {weekDays.map((date, index) => {
                    const dayName = daysOfWeek[date.getDay()];
                    const workout = getWorkoutForDate(date);
                    const isToday = date.toDateString() === today.toDateString();

                    return (
                      <article
                        key={date.toDateString()}
                        className={`rounded-[1.5rem] border p-4 shadow-sm transition-colors ${
                          isToday
                            ? "border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
                            : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-[#0b101e]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                              {isToday ? "Today" : `Day ${index + 1}`}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{dayName}</h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                              {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${workout ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/10 text-slate-500 dark:text-slate-400"}`}>
                            {workout ? "Training" : "Rest"}
                          </span>
                        </div>

                        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-[#111827]">
                          {workout ? (
                            <>
                              <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Workout</p>
                              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{workout.name}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Rest day</p>
                              <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">Recovery</p>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid h-[calc(100%-3.5rem)] min-h-0 grid-rows-[auto_1fr] overflow-hidden">
                  <div className="grid grid-cols-7 gap-2 pb-2 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                    {daysOfWeek.map((dayName) => (
                      <div key={dayName}>{dayName.slice(0, 3)}</div>
                    ))}
                  </div>
                  <div className="grid min-h-0 grid-cols-7 gap-2 overflow-y-auto pr-1">
                    {monthCells.map((date, index) => {
                      if (!date) {
                        return (
                          <div
                            key={`empty-${index}`}
                              className="min-h-[110px] rounded-[1.25rem] border border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-[#0b101e]"
                          />
                        );
                      }

                      const workout = getWorkoutForDate(date);
                      const isToday = date.toDateString() === today.toDateString();

                      return (
                        <article
                          key={date.toDateString()}
                          className={`min-h-[110px] rounded-[1.25rem] border p-3 shadow-sm ${
                            isToday
                              ? "border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10"
                              : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-[#0b101e]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white">{date.getDate()}</span>
                            {workout ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                                Train
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                Rest
                              </span>
                            )}
                          </div>
                          {workout && (
                            <p className="mt-3 text-xs font-semibold leading-5 text-slate-700 dark:text-slate-300">
                              {workout.name}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
        </section>
      )}
    </main>
  );
}