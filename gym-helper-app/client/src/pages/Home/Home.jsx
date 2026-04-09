import React, { useState, useEffect } from "react";
import DailyCaloriesDoughnut from "./DailyCaloriesDoughnut";
import { useAuth, unknownUser } from "../../contexts/theme/AuthContext";

export default function Home() {
  const { user } = useAuth();

  // --- Feature 1: Determine Split by Day of Week (Dynamic from LocalStorage) ---
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayIndex = new Date().getDay();
  const currentDayName = daysOfWeek[currentDayIndex];

  const [todaysWorkoutName, setTodaysWorkoutName] = useState("Rest Day");

  useEffect(() => {
    const savedSplits = localStorage.getItem("mySplits");
    if (savedSplits) {
      const parsedSplits = JSON.parse(savedSplits);
      const foundSplit = parsedSplits.find(split => 
        split.days && split.days.includes(currentDayName)
      );
      if (foundSplit) {
        setTodaysWorkoutName(foundSplit.name);
      } else {
        setTodaysWorkoutName("Rest Day");
      }
    }
  }, [currentDayName]);

  // --- Feature 3: Connect Real Nutrition Data ---
  const consumedCals = user?.dailyLog?.calories || 0;
  const consumedProtein = user?.dailyLog?.macros?.protein || 0;
  const consumedCarbs = user?.dailyLog?.macros?.carbs || 0;
  const consumedFats = user?.dailyLog?.macros?.fats || 0;

  const goalCals = user?.nutrition?.targetCalories || 2500;
  const goalProtein = user?.nutrition?.macros?.protein || 180;
  const goalCarbs = user?.nutrition?.macros?.carbs || 250;
  const goalFats = user?.nutrition?.macros?.fats || 70;

  const proteinPer = goalProtein > 0 ? Math.min((consumedProtein / goalProtein) * 100, 100) : 0;
  const carbsPer = goalCarbs > 0 ? Math.min((consumedCarbs / goalCarbs) * 100, 100) : 0;
  const fatsPer = goalFats > 0 ? Math.min((consumedFats / goalFats) * 100, 100) : 0;

  // --- Feature 2: Weekly Activity Data ---
  const [weeklyActivity, setWeeklyActivity] = useState(() => {
    const savedData = localStorage.getItem("weeklyActivityData");
    if (savedData) return JSON.parse(savedData);
    return Array(7).fill(0).map((_, i) => ({ 
        day: ["S", "M", "T", "W", "Th", "F", "S"][i], 
        minutes: 0 
    }));
  });

  useEffect(() => {
    localStorage.setItem("weeklyActivityData", JSON.stringify(weeklyActivity));
  }, [weeklyActivity]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logMinutes, setLogMinutes] = useState("");

  const maxMinutes = Math.max(...weeklyActivity.map((d) => d.minutes), 60);

  const handleSaveLog = (e) => {
    e.preventDefault();
    const minutes = parseInt(logMinutes) || 0;
    const updatedActivity = weeklyActivity.map((day, index) => {
      if (index === currentDayIndex) return { ...day, minutes: minutes };
      return day;
    });
    setWeeklyActivity(updatedActivity);
    setLogMinutes("");
    setIsLogModalOpen(false);
  };

  const displayUsername = user?.username ?? unknownUser?.username ?? "Astronaut";

  // --- New Feature: Hydration ---
  const hydrationGoal = 3000;
  const [hydration, setHydration] = useState(() => {
     const data = localStorage.getItem("hydrationData");
     return data ? parseInt(data) : 1000; // Mock starting data
  });
  const addHydration = (amount) => {
    const newAmp = Math.min(hydration + amount, hydrationGoal);
    setHydration(newAmp);
    localStorage.setItem("hydrationData", newAmp);
  };
  const hydrationPerc = Math.min((hydration / hydrationGoal) * 100, 100);

  // --- New Feature: PRs ---
  const [prs] = useState(() => {
    return [
      { exercise: "Bench Press", weight: "225 lbs", metric: "+5 lbs" },
      { exercise: "Squat", weight: "315 lbs", metric: "+10 lbs" },
      { exercise: "Deadlift", weight: "405 lbs", metric: "+15 lbs" },
    ];
  });

  // --- New Feature: Consistency Streak ---
  const [streak] = useState(12);

  // Simplified Card Style - NO blur, NO animations, NO heavy shadows
  const simpleCard = "bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-gray-100 p-4 lg:p-6 overflow-hidden font-sans">
      
      {/* Header */}
      <div className="shrink-0 mb-4">
        <p className="text-xs uppercase tracking-widest text-blue-500 mb-1 font-semibold">Comm Link Active</p>
        <h1 className="text-3xl lg:text-4xl font-extrabold dark:text-white">
          Welcome back, {displayUsername}
        </h1>
      </div>

      {/* ===== 2-Row Grid ===== */}
      <div className="grid grid-cols-3 grid-rows-2 gap-4 flex-1 min-h-0">
        
        {/* ── ROW 1, COL 1-2: Mission + Streak + PRs ── */}
        <div className={`${simpleCard} col-span-2 flex flex-col border-l-4 border-l-blue-500 p-4`}>
           {/* Top section: Mission + Streak side by side */}
           <div className="flex items-center gap-6 pb-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
             {/* Mission */}
             <div className="flex-1 min-w-0">
               <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-0.5 font-bold">Current Mission</h3>
               <h2 className="text-xl lg:text-2xl font-bold dark:text-white leading-tight truncate">
                 {currentDayName}: <span className="text-blue-600 dark:text-blue-400">{todaysWorkoutName}</span>
               </h2>
             </div>
             {/* Streak */}
             <div className="flex items-center gap-3 flex-shrink-0 pl-6 border-l border-gray-200 dark:border-gray-800">
               <svg className="w-7 h-7 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
               </svg>
               <div>
                 <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Streak</p>
                 <div className="flex items-baseline gap-1">
                   <span className="text-3xl font-extrabold text-orange-500 leading-none">{streak}</span>
                   <span className="text-xs text-gray-500 font-medium">days</span>
                 </div>
               </div>
             </div>
           </div>

           {/* Bottom section: PRs (vertical list) */}
           <div className="pt-3 flex-1 flex flex-col min-h-0">
             <h4 className="text-[10px] font-bold flex items-center gap-1.5 text-gray-500 uppercase tracking-wider mb-2 shrink-0">
               <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a.75.75 0 01.67.41l2.45 5.09h5.5l-4 3.9.95 5.53a.75.75 0 01-1.07.78L10 15.2l-4.5 2.5a.75.75 0 01-1.07-.78l.95-5.53-4-3.9h5.5l2.45-5.09A.75.75 0 0110 2z" clipRule="evenodd" /></svg>
               Personal Records
             </h4>
             <div className="flex flex-col gap-2 flex-1 min-h-0">
               {prs.slice(0, 2).map(pr => (
                 <div key={pr.exercise} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 px-3 flex items-center justify-between shrink-0">
                   <div className="truncate pr-2">
                     <h5 className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-none truncate mb-0.5">{pr.exercise}</h5>
                     <p className="text-base font-black text-slate-800 dark:text-white leading-none">{pr.weight}</p>
                   </div>
                   <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-md">{pr.metric}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* ── ROW 1, COL 3: Life Support (H2O) ── */}
        <div className={`${simpleCard} col-span-1 flex flex-col items-center justify-center p-5`}>
          <h3 className="text-sm font-bold mb-3 w-full flex items-center justify-center gap-2 dark:text-white shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            Life Support (H2O)
          </h3>
          <div className="relative w-28 h-28 rounded-full border-4 border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0">
             <div 
               className="absolute bottom-0 left-0 right-0 bg-blue-500"
               style={{ height: `${hydrationPerc}%` }}
             ></div>
             <div className="relative flex flex-col items-center text-center px-2">
               <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{hydration}</span>
               <span className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1 leading-none">/ {hydrationGoal} ml</span>
             </div>
          </div>
          <div className="mt-4 flex gap-3 w-full justify-center">
             <button onClick={() => addHydration(250)} className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/40 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300">
               +250 ml
             </button>
             <button onClick={() => addHydration(500)} className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/40 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300">
               +500 ml
             </button>
          </div>
        </div>

        {/* ── ROW 2, COL 1: Weekly Orbit ── */}
        <div className={`${simpleCard} col-span-1 flex flex-col p-5`}>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2 dark:text-white shrink-0">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            Weekly Orbit
          </h3>
          <div className="flex flex-1 justify-between items-end relative min-h-0">
            <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between items-stretch pointer-events-none opacity-20 mb-6">
                <div className="border-b border-gray-400 border-dashed flex-1"></div>
                <div className="border-b border-gray-400 border-dashed flex-1"></div>
                <div className="flex-1"></div>
            </div>
            {weeklyActivity.map((d, x) => {
              const heightPerc = maxMinutes > 0 ? (d.minutes / maxMinutes) * 100 : 0;
              const isToday = x === currentDayIndex;
              return (
                <div key={x} className="flex flex-col items-center group relative w-full px-0.5 h-full justify-end">
                  <div className="hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded absolute bottom-full mb-1 whitespace-nowrap shadow-md z-20">
                    {d.minutes}m
                  </div>
                  <div className="w-full max-w-[28px] h-[calc(100%-1.5rem)] flex items-end justify-center">
                    <div
                      className={`w-full rounded-t-md ${isToday ? "bg-blue-500" : "bg-indigo-300 dark:bg-indigo-800 hover:bg-indigo-400"}`}
                      style={{ height: `${Math.max(heightPerc, 3)}%` }} 
                    />
                  </div>
                  <h6 className={`mt-1.5 text-xs font-semibold uppercase ${isToday ? "text-blue-500 font-bold" : "text-gray-500"}`}>{d.day}</h6>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ROW 2, COL 2: Energy ── */}
        <div className={`${simpleCard} col-span-1 flex flex-col items-center justify-center p-5`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 shrink-0">Energy</h3>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <DailyCaloriesDoughnut calories={consumedCals} goal={goalCals} />
          </div>
          <div className="text-center mt-3 shrink-0">
            <div className="text-2xl font-bold dark:text-white flex items-baseline justify-center gap-1.5 leading-none">
              {Math.round(consumedCals)}
              <span className="text-sm text-gray-500 font-medium">/ {goalCals}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">Calories</p>
          </div>
        </div>

        {/* ── ROW 2, COL 3: Macros ── */}
        <div className={`${simpleCard} col-span-1 flex flex-col p-5`}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2 dark:text-white shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            Macros
          </h3>
          <div className="space-y-4 w-full flex-1 flex flex-col justify-center">
            {[
              { label: "Protein", color: "bg-purple-500", bg: "bg-gray-200 dark:bg-gray-800", consumed: consumedProtein, goal: goalProtein, per: proteinPer },
              { label: "Carbs", color: "bg-blue-500", bg: "bg-gray-200 dark:bg-gray-800", consumed: consumedCarbs, goal: goalCarbs, per: carbsPer },
              { label: "Fats", color: "bg-orange-500", bg: "bg-gray-200 dark:bg-gray-800", consumed: consumedFats, goal: goalFats, per: fatsPer },
            ].map(macro => (
               <div key={macro.label}>
                  <div className="flex justify-between text-sm mb-2 font-semibold">
                    <span className="text-gray-600 dark:text-gray-400">{macro.label}</span>
                    <span className="text-slate-800 dark:text-white">{macro.consumed}g <span className="text-gray-500 font-normal">/ {macro.goal}g</span></span>
                  </div>
                  <div className={`h-2.5 w-full ${macro.bg} rounded-full overflow-hidden`}>
                    <div className={`h-full ${macro.color}`} style={{ width: `${macro.per}%` }} />
                  </div>
               </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}