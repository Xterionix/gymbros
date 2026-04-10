import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/theme/AuthContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import DailyCaloriesDoughnut from "../Home/DailyCaloriesDoughnut";
import { HiOutlineCalendar, HiOutlineViewList, HiX, HiPlus } from "react-icons/hi";

export default function Nutrition() {
  const { user, setUser } = useAuth();
  
  const [timeRange, setTimeRange] = useState("weekly");
  const [activeChart, setActiveChart] = useState("calories");
  
  const [showLogModal, setShowLogModal] = useState(false);
  const [showIncrementModal, setShowIncrementModal] = useState(null); // 'calories' | 'protein' | 'carbs' | 'fats'
  const [incrementValue, setIncrementValue] = useState("");

  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    calories: "",
    hydration: "",
    protein: "",
    carbs: "",
    fats: ""
  });

  const handleInputChange = (e) => {
    setLogForm({ ...logForm, [e.target.name]: e.target.value });
  };

  const submitLog = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/me/nutrition/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(logForm),
      });

      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
        setShowLogModal(false);
        setLogForm({
            date: new Date().toISOString().split('T')[0],
            calories: "", hydration: "", protein: "", carbs: "", fats: ""
        });
      }
    } catch (err) {
      console.error("Manual Log failed", err);
    }
  };

  // --- Real Nutrition Data Logic ---
  const consumedCals = user?.dailyLog?.calories || 0;
  const consumedProtein = user?.dailyLog?.macros?.protein || 0;
  const consumedCarbs = user?.dailyLog?.macros?.carbs || 0;
  const consumedFats = user?.dailyLog?.macros?.fats || 0;
  
  const goalCals = user?.nutrition?.targetCalories ?? 2500;
  const goalProtein = user?.nutrition?.macros?.protein ?? 180;
  const goalCarbs = user?.nutrition?.macros?.carbs ?? 250;
  const goalFats = user?.nutrition?.macros?.fats ?? 70;

  const proteinPer = goalProtein > 0 ? Math.min((consumedProtein / goalProtein) * 100, 100) : 0;
  const carbsPer = goalCarbs > 0 ? Math.min((consumedCarbs / goalCarbs) * 100, 100) : 0;
  const fatsPer = goalFats > 0 ? Math.min((consumedFats / goalFats) * 100, 100) : 0;

  // --- Increment Specific Macros/Calories ---
  const handleIncrementSubmit = async (e) => {
      e.preventDefault();
      const val = Number(incrementValue);
      if (isNaN(val) || val <= 0) return;

      let payload = {
          calories: consumedCals,
          protein: consumedProtein,
          carbs: consumedCarbs,
          fats: consumedFats
      };

      if (showIncrementModal === 'calories') payload.calories += val;
      if (showIncrementModal === 'protein') payload.protein += val;
      if (showIncrementModal === 'carbs') payload.carbs += val;
      if (showIncrementModal === 'fats') payload.fats += val;

      try {
          const res = await fetch("http://localhost:5000/api/auth/me/nutrition", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(payload),
          });
          if (res.ok) {
              const json = await res.json();
              setUser(json.data);
              setShowIncrementModal(null);
              setIncrementValue("");
          }
      } catch (err) {
          console.error("Increment failed", err);
      }
  };

  // --- Hydration Widget ---
  const hydrationGoal = user?.nutrition?.hydrationGoal ?? 3000;
  const [hydration, setHydration] = useState(user?.dailyLog?.hydration || 0);

  useEffect(() => {
    if (user?.dailyLog?.hydration !== undefined) {
      setHydration(user.dailyLog.hydration);
    }
  }, [user?.dailyLog?.hydration]);

  const addHydration = async (amount) => {
    const newAmp = Math.min(hydration + amount, hydrationGoal);
    setHydration(newAmp); 

    try {
      const res = await fetch("http://localhost:5000/api/auth/me/hydration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hydration: newAmp }),
      });
      if (!res.ok) console.error("Failed to update hydration");
    } catch (err) {
      console.error(err);
    }
  };
  const hydrationPerc = Math.min((hydration / hydrationGoal) * 100, 100);

  // --- Recharts Graph Data Aggregation ---
  const graphData = useMemo(() => {
    if (!user) return [];

    const combinedData = [...(user.dailyTrackingHistory || [])];
    const todayStr = new Date().toDateString();
    const hasToday = combinedData.some((entry) => new Date(entry.date).toDateString() === todayStr);

    if (!hasToday && user.dailyLog) {
      combinedData.push({
        date: user.dailyLog.date || new Date(),
        calories: consumedCals,
        hydration: hydration,
        macros: {
          protein: consumedProtein,
          carbs: consumedCarbs,
          fats: consumedFats,
        },
      });
    }

    const historyByDay = new Map();
    combinedData.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (Number.isNaN(entryDate.getTime())) return;

      const dateKey = entryDate.toISOString().split("T")[0];
      const current = historyByDay.get(dateKey) || {
        calories: 0,
        hydration: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      };

      historyByDay.set(dateKey, {
        calories: current.calories + (typeof entry.calories === "number" ? entry.calories : 0),
        hydration: current.hydration + (typeof entry.hydration === "number" ? entry.hydration : 0),
        protein: current.protein + (entry.macros?.protein || 0),
        carbs: current.carbs + (entry.macros?.carbs || 0),
        fats: current.fats + (entry.macros?.fats || 0),
      });
    });

    const now = new Date();

    if (timeRange === "yearly") {
      const monthlyTotals = Array.from({ length: 12 }, (_, index) => ({
        name: new Date(now.getFullYear(), index, 1).toLocaleDateString("en-US", { month: "short" }),
        calories: 0,
        hydration: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      }));

      historyByDay.forEach((value, dateKey) => {
        const entryDate = new Date(dateKey);
        if (entryDate.getFullYear() === now.getFullYear()) {
          monthlyTotals[entryDate.getMonth()] = {
            ...monthlyTotals[entryDate.getMonth()],
            ...value,
          };
        }
      });

      return monthlyTotals;
    }

    const daysToShow = timeRange === "monthly" ? 30 : 7;
    return Array.from({ length: daysToShow }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (daysToShow - 1 - index));
      const dateKey = date.toISOString().split("T")[0];
      const values = historyByDay.get(dateKey) || {
        calories: 0,
        hydration: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      };

      return {
        name: `${date.getMonth() + 1}/${date.getDate()}`,
        ...values,
        rawDate: dateKey,
      };
    });

  }, [user, timeRange, consumedCals, hydration, consumedProtein, consumedCarbs, consumedFats]);


  const simpleCard = "bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm";

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-gray-100 p-4 lg:p-6 overflow-hidden max-w-full font-sans pb-safe">
      
      {/* ===== Header & Toolbar ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between shrink-0 mb-4 gap-4">
        <div>
           <p className="text-xs uppercase tracking-widest text-blue-500 mb-1 font-semibold">Dietary Command</p>
           <h1 className="text-3xl lg:text-4xl font-extrabold dark:text-white leading-tight">Nutrition</h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Time Range Selector */}
          <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-inner">
             {["weekly", "monthly", "yearly"].map(r => (
               <button
                 key={r}
                 onClick={() => setTimeRange(r)}
                 className={`px-3 py-1.5 text-xs font-bold capitalize transition-all rounded ${
                   timeRange === r 
                     ? "bg-white dark:bg-[#0b101e] text-slate-900 dark:text-white shadow" 
                     : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                 }`}
               >
                 {r}
               </button>
             ))}
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm text-sm whitespace-nowrap ml-auto"
          >
            <HiOutlineCalendar className="w-4 h-4" />
            <span className="hidden sm:inline">Log Entry</span>
            <span className="sm:hidden">Log</span>
          </button>
        </div>
      </div>

      {/* ===== Main Dashboard Layout ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 min-w-0">
         
         {/* Left Column (Charts - Dynamic Rendering) */}
         <div className="flex flex-col gap-4 min-w-0 overflow-y-auto lg:overflow-visible pr-1 pb-4">
             {/* Graph Tabs */}
             <div className="flex bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl p-1.5 shrink-0 shadow-sm">
                {[
                  { id: "calories", label: "Calories" },
                  { id: "macros", label: "Macros" },
                  { id: "hydration", label: "Hydration" }
                ].map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveChart(tab.id)}
                     className={`flex-1 py-2 text-sm font-bold capitalize transition-all rounded-lg ${
                       activeChart === tab.id 
                         ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" 
                         : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                     }`}
                   >
                     {tab.label}
                   </button>
                ))}
             </div>

             {/* Chart Renderer Container */}
             <div className={`${simpleCard} p-4 flex flex-col flex-1 min-h-[350px] lg:min-h-0 shrink-0`}>
                
                {activeChart === "calories" && (
                   <div className="flex-1 min-h-0 w-full relative flex flex-col">
                     <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 ml-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 block"></span> Caloric Intake
                     </h2>
                     <div className="flex-1 w-full relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={graphData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                           <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px', color: '#fff' }} itemStyle={{ fontSize: '12px' }} labelStyle={{ fontSize: '10px', color: '#a0aec0', marginBottom: '4px' }} />
                           <Line type="monotone" dataKey="calories" name="Total Calories" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} activeDot={{ r: 6 }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                )}

                {activeChart === "macros" && (
                   <div className="flex-1 min-h-0 w-full relative flex flex-col">
                     <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 ml-2 flex items-center gap-2">
                        <HiOutlineViewList className="text-gray-400 w-4 h-4" /> Macronutrient Split
                     </h2>
                     <div className="flex-1 w-full relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={graphData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                           <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px', color: '#fff' }} itemStyle={{ fontSize: '12px', padding: '0px' }} labelStyle={{ fontSize: '10px', color: '#a0aec0', marginBottom: '4px' }} />
                           <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                           <Line type="monotone" dataKey="protein" name="Protein (g)" stroke="#a855f7" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                           <Line type="monotone" dataKey="carbs" name="Carbs (g)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                           <Line type="monotone" dataKey="fats" name="Fats (g)" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                )}

                {activeChart === "hydration" && (
                   <div className="flex-1 min-h-0 w-full relative flex flex-col">
                     <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 ml-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-400 block"></span> Hydration Tracker
                     </h2>
                     <div className="flex-1 w-full relative">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={graphData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888' }} />
                           <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#2d3748', borderRadius: '8px', color: '#fff' }} itemStyle={{ fontSize: '12px' }} labelStyle={{ fontSize: '10px', color: '#a0aec0', marginBottom: '4px' }} />
                           <Line type="monotone" dataKey="hydration" name="Water (ml)" stroke="#60a5fa" strokeWidth={3} dot={{ fill: '#60a5fa', strokeWidth: 0, r: 2 }} activeDot={{ r: 6 }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                )}
             </div>
         </div>

         {/* Right Column (Widgets - Copied from Home + Incrementors added) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 pb-4 min-w-0">
             
             {/* ── Energy Doughnut Widget + Increments ── */}
             <div className={`${simpleCard} flex flex-col items-center justify-center p-5 shrink-0 relative group`}>
                <div className="absolute top-4 right-4 z-10">
                   <button 
                     onClick={() => setShowIncrementModal('calories')}
                     className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full transition-colors"
                   >
                     <HiPlus className="w-4 h-4 text-blue-500" />
                   </button>
                </div>

                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 shrink-0">Energy</h3>
                <div className="w-full flex items-center justify-center px-6">
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

             {/* ── Life Support (H2O) Widget ── */}
             <div className={`${simpleCard} flex flex-col items-center justify-center p-5 shrink-0`}>
                <h3 className="text-sm font-bold mb-3 w-full flex items-center justify-center gap-2 dark:text-white shrink-0">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                  Life Support (H2O)
                </h3>
                <div className="relative w-28 h-28 rounded-full border-4 border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                   <div 
                     className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-500"
                     style={{ height: `${hydrationPerc}%` }}
                   ></div>
                   <div className="relative flex flex-col items-center text-center px-2">
                     <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{hydration}</span>
                     <span className="text-xs text-slate-500 dark:text-gray-400 font-bold mt-1 leading-none">/ {hydrationGoal} ml</span>
                   </div>
                </div>
                <div className="mt-4 flex gap-3 w-full justify-center">
                   <button onClick={() => addHydration(250)} className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/40 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300 transition-colors">
                     +250 ml
                   </button>
                   <button onClick={() => addHydration(500)} className="flex-1 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800/40 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300 transition-colors">
                     +500 ml
                   </button>
                </div>
             </div>

             {/* ── Macro Bars Widget + Increments ── */}
             <div className={`${simpleCard} flex flex-col p-5 shrink-0 relative md:col-span-2`}>
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 dark:text-white shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Macros
                </h3>
                <div className="space-y-4 w-full flex flex-col justify-center">
                  {[
                    { id: 'protein', label: "Protein", color: "bg-purple-500", bg: "bg-gray-200 dark:bg-gray-800", consumed: consumedProtein, goal: goalProtein, per: proteinPer },
                    { id: 'carbs', label: "Carbs", color: "bg-blue-500", bg: "bg-gray-200 dark:bg-gray-800", consumed: consumedCarbs, goal: goalCarbs, per: carbsPer },
                    { id: 'fats', label: "Fats", color: "bg-orange-500", bg: "bg-gray-200 dark:bg-gray-800", consumed: consumedFats, goal: goalFats, per: fatsPer },
                  ].map(macro => (
                     <div key={macro.label} className="relative group">
                        <div className="absolute top-0 right-0 -translate-y-[2px]">
                           <button 
                             onClick={() => setShowIncrementModal(macro.id)}
                             className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-[#0b101e] dark:hover:bg-black text-gray-500 dark:text-gray-400 rounded-md transition-colors"
                           >
                             <HiPlus className="w-3.5 h-3.5" />
                           </button>
                        </div>
                        <div className="flex justify-between text-sm mb-2 font-semibold pr-8">
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

      {/* ===== Increment specific Macro/Calorie Modal ===== */}
      {showIncrementModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a202c] rounded-2xl w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-md font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">
                 <HiPlus className="text-blue-500 w-5 h-5"/> Log {showIncrementModal}
              </h2>
              <button 
                onClick={() => { setShowIncrementModal(null); setIncrementValue(""); }}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIncrementSubmit} className="flex flex-col p-5 gap-4">
               <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">
                     Amount to Add ({showIncrementModal === 'calories' ? 'kcal' : 'g'})
                  </label>
                  <input 
                    type="number"
                    required 
                    autoFocus
                    placeholder="E.g., 200"
                    value={incrementValue} 
                    onChange={e => setIncrementValue(e.target.value)}
                    className="w-full p-4 text-center text-xl font-bold bg-gray-50 dark:bg-[#0b101e] border-2 border-gray-200 dark:border-gray-700 rounded-xl dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
               </div>
               <button 
                 type="submit"
                 className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md text-sm mt-2 flex justify-center items-center gap-1"
               >
                 <HiPlus className="w-4 h-4"/> Add Value
               </button>
            </form>

          </div>
        </div>
      )}

      {/* ===== Manual Log Modal (Historical Past Date) ===== */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a202c] rounded-2xl w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0b101e]">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Log Archive Data</h2>
                <p className="text-xs text-gray-500 mt-0.5">Leave blank to skip</p>
              </div>
              <button 
                onClick={() => setShowLogModal(false)}
                className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <form id="historical-log" onSubmit={submitLog} className="flex flex-col gap-5">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Target Date</label>
                  <input 
                    type="date"
                    name="date"
                    required
                    value={logForm.date}
                    onChange={handleInputChange}
                    className="p-3 bg-white dark:bg-[#0b101e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Calories</label>
                    <input 
                      type="number" name="calories" placeholder="kcal" value={logForm.calories} onChange={handleInputChange}
                      className="p-3 bg-gray-50 dark:bg-[#0b101e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Water (ml)</label>
                    <input 
                      type="number" name="hydration" placeholder="ml" value={logForm.hydration} onChange={handleInputChange}
                      className="p-3 bg-gray-50 dark:bg-[#0b101e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-600"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Macronutrients (g)</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-center text-purple-500">Protein</label>
                      <input type="number" name="protein" placeholder="g" value={logForm.protein} onChange={handleInputChange} className="p-3 bg-purple-50 dark:bg-gray-900 border border-purple-200 dark:border-gray-700 rounded-lg text-sm text-center dark:text-white outline-none focus:ring-2 focus:ring-purple-500 placeholder-purple-300 dark:placeholder-gray-600" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-center text-blue-500">Carbs</label>
                      <input type="number" name="carbs" placeholder="g" value={logForm.carbs} onChange={handleInputChange} className="p-3 bg-blue-50 dark:bg-gray-900 border border-blue-200 dark:border-gray-700 rounded-lg text-sm text-center dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-300 dark:placeholder-gray-600" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-center text-orange-500">Fats</label>
                      <input type="number" name="fats" placeholder="g" value={logForm.fats} onChange={handleInputChange} className="p-3 bg-orange-50 dark:bg-gray-900 border border-orange-200 dark:border-gray-700 rounded-lg text-sm text-center dark:text-white outline-none focus:ring-2 focus:ring-orange-500 placeholder-orange-300 dark:placeholder-gray-600" />
                    </div>
                  </div>
                </div>
                
              </form>
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a202c]">
               <button 
                 type="submit" form="historical-log"
                 className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md text-sm uppercase tracking-wider"
               >
                 Append Archive
               </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
