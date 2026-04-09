import React, { useState, useEffect } from "react";
import RoutineCard from "./components/RoutineCard";
import { HiPlus, HiX, HiPlay, HiStop, HiClock } from "react-icons/hi";
import { useAuth } from "../../contexts/theme/AuthContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function Workout() {
  const { user, setUser } = useAuth();

  // -- Templates State --
  const [routines, setRoutines] = useState(user?.workoutTemplates || []);

  useEffect(() => {
    if (user?.workoutTemplates) {
      setRoutines(user.workoutTemplates);
    }
  }, [user?.workoutTemplates]);

  // -- Modal State --
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formExercises, setFormExercises] = useState([]);
  const [exerciseInput, setExerciseInput] = useState("");
  const [formDays, setFormDays] = useState([]);

  const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // -- Event Handlers for Templates --
  const openCreateModal = () => { setEditingId(null); setFormName(""); setFormDesc(""); setFormExercises([]); setFormDays([]); setIsModalOpen(true); };
  const openEditModal = (r) => { setEditingId(r.id); setFormName(r.name); setFormDesc(r.description); setFormExercises(r.exercises || []); setFormDays(r.days || []); setIsModalOpen(true); };
  const handleAddExerciseTag = (e) => { if (e.key === "Enter" && exerciseInput.trim()) { if (!formExercises.includes(exerciseInput.trim())) setFormExercises([...formExercises, exerciseInput.trim()]); setExerciseInput(""); e.preventDefault(); } };
  const removeExerciseTag = (tag) => { setFormExercises(formExercises.filter((t) => t !== tag)); };
  const toggleDayTag = (day) => { if (formDays.includes(day)) setFormDays(formDays.filter((d) => d !== day)); else setFormDays([...formDays, day]); };

  const handleSave = async (e) => {
    e.preventDefault();
    const newRoutine = { id: editingId || Date.now(), name: formName, description: formDesc, exercises: formExercises, days: formDays };

    let updatedRoutines;
    if (editingId) {
      updatedRoutines = routines.map((r) => (r.id === editingId ? newRoutine : r));
    } else {
      updatedRoutines = [...routines, newRoutine];
    }

    setRoutines(updatedRoutines);
    setIsModalOpen(false);

    try {
      await fetch("http://localhost:5000/api/auth/me/workouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ routines: updatedRoutines })
      });
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete split?")) {
      const updated = routines.filter((r) => r.id !== id);
      setRoutines(updated);
      try {
        await fetch("http://localhost:5000/api/auth/me/workouts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ routines: updated })
        });
      } catch (err) { console.error(err); }
    }
  };

  // -- Active Session Timer --
  const [activeTemplate, setActiveTemplate] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    if (routines.length > 0 && !activeTemplate) {
      const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const defaultRoutine = routines.find(r => r.days?.includes(todayStr)) || routines[0];
      setActiveTemplate(defaultRoutine.id);
    }
  }, [routines, activeTemplate]);

  useEffect(() => {
    let interval;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedSecs(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  const startWorkout = () => {
    setIsTracking(true);
    setStartTime(Date.now());
    setElapsedSecs(0);
  };

  const endWorkout = async () => {
    setIsTracking(false);
    setIsLogging(true);
    // Floor calculation (for demo purposes we treat seconds roughly if we want to debug, but naturally log minutes)
    let durationMinutes = Math.floor(elapsedSecs / 60);
    if (durationMinutes === 0 && elapsedSecs > 0) durationMinutes = 1; // force at least 1 min if they tested for 5 seconds

    const activeRoutine = routines.find(r => String(r.id) === String(activeTemplate));

    try {
      const res = await fetch("http://localhost:5000/api/auth/me/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          duration: durationMinutes, 
          templateId: activeRoutine?.id || null,
          templateName: activeRoutine?.name || null,
          exercises: [] 
        })
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
        setElapsedSecs(0);
        setStartTime(null);
        alert("Training Ops Successfully Logged!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogging(false);
    }
  };

  // -- Manual Log State --
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [manualTemplate, setManualTemplate] = useState("");

  useEffect(() => {
    if (routines.length > 0 && !manualTemplate) {
      const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const defaultRoutine = routines.find(r => r.days?.includes(todayStr)) || routines[0];
      setManualTemplate(defaultRoutine.id);
    }
  }, [routines, manualTemplate]);

  const handleManualLog = async (e) => {
    e.preventDefault();
    setIsLogging(true);

    try {
      // Append midday to standard YYYY-MM-DD input string so timezone offsets don't kick it to the previous day 
      const safeDate = manualDate ? `${manualDate}T12:00:00` : null;
      const mRoutine = routines.find(r => String(r.id) === String(manualTemplate));

      const res = await fetch("http://localhost:5000/api/auth/me/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          duration: manualDuration, 
          date: safeDate, 
          templateId: mRoutine?.id || null,
          templateName: mRoutine?.name || null,
          exercises: [] 
        })
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
        setManualDate("");
        setManualDuration("");
        setIsManualModalOpen(false);
        alert("Manual Operation Logged!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogging(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // -- Graph Aggregation --
  const [graphMode, setGraphMode] = useState("weekly");
  const history = user?.workoutHistory || [];

  const getGraphData = () => {
    const now = new Date();

    if (graphMode === "yearly") {
      const data = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((name) => ({ name, Mins: 0 }));
      history.forEach(item => {
        const d = new Date(item.time);
        if (d.getFullYear() === now.getFullYear()) {
          data[d.getMonth()].Mins += item.duration || 0;
        }
      });
      return data;
    }

    if (graphMode === "monthly") {
      const data = [
        { name: "Week 4 (Past)", Mins: 0 },
        { name: "Week 3", Mins: 0 },
        { name: "Week 2", Mins: 0 },
        { name: "Week 1 (Now)", Mins: 0 },
      ];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      history.forEach(item => {
        const d = new Date(item.time);
        if (d >= thirtyDaysAgo) {
          const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) data[3].Mins += item.duration || 0;
          else if (diffDays <= 14) data[2].Mins += item.duration || 0;
          else if (diffDays <= 21) data[1].Mins += item.duration || 0;
          else data[0].Mins += item.duration || 0;
        }
      });
      return data;
    }

    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const targetDate = d.toISOString().split("T")[0];

      const mins = history.reduce((acc, curr) => {
        if (new Date(curr.time).toISOString().split("T")[0] === targetDate) {
          return acc + (curr.duration || 0);
        }
        return acc;
      }, 0);
      data.push({ name: dayName, Mins: mins });
    }
    return data;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-gray-100 p-4 lg:p-6 overflow-hidden max-w-full font-sans pb-safe font-inter">
      {/* Header */}
      <div className="shrink-0 mb-4 flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-500 mb-1 font-semibold">Training</p>
          <h1 className="text-3xl lg:text-4xl font-extrabold dark:text-white">Active Operations</h1>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-[auto_1fr] gap-4 flex-1 min-h-0">

        {/* ROW 1 */}
        {/* ACTIVE SESSION CARD */}
        <div className="bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm lg:col-span-1 p-5 flex flex-col justify-center gap-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full transition-colors ${isTracking ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-gray-100 dark:bg-[#0f1524]'}`}>
                <HiClock className={`w-6 h-6 ${isTracking ? 'text-white' : 'text-blue-500'}`} />
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold">Session Timer</h3>
                <div className="text-3xl font-mono font-bold dark:text-white">{formatTime(elapsedSecs)}</div>
              </div>
            </div>
            {routines.length > 0 && (
              <select 
                value={activeTemplate} 
                onChange={(e) => setActiveTemplate(e.target.value)}
                disabled={isTracking}
                title="Select Active Loadout"
                className="p-1.5 text-xs font-semibold border rounded-md border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0b101e] text-gray-700 dark:text-gray-300 outline-none w-[100px] lg:w-auto overflow-hidden text-ellipsis cursor-pointer transition-colors hover:border-gray-400"
              >
                {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
          </div>

          {isTracking ? (
            <button onClick={endWorkout} disabled={isLogging} className={`${isLogging ? "opacity-50" : ""} w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors`}>
              <HiStop className="w-5 h-5" /> {isLogging ? "Logging..." : "End & Log Workout"}
            </button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <button onClick={startWorkout} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
                <HiPlay className="w-5 h-5" /> Start Workout
              </button>
              <button onClick={() => setIsManualModalOpen(true)} className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-2.5 rounded-lg flex justify-center items-center transition-colors text-sm">
                Log Past Workout
              </button>
            </div>
          )}
        </div>

        {/* PERFORMANCE GRAPH */}
        <div className="bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm lg:col-span-2 p-5 flex flex-col min-h-[220px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold">Time Logged (mins)</h3>
            <div className="flex bg-gray-100 dark:bg-[#0b101e] rounded-lg p-1 border border-gray-200 dark:border-gray-800">
              {["weekly", "monthly", "yearly"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setGraphMode(mode)}
                  className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 font-bold rounded-md capitalize transition-colors ${graphMode === mode ? 'bg-white dark:bg-[#1a202c] shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getGraphData()} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
                  itemStyle={{ color: '#60a5fa' }}
                  cursor={{ stroke: '#374151', strokeWidth: 1 }}
                />
                <Line type="monotone" dataKey="Mins" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6, fill: '#fff', stroke: '#3b82f6', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 2 */}
        {/* RECENT FEED */}
        <div className="bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm lg:col-span-1 p-5 flex flex-col min-h-0 mt-4 lg:mt-0">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4 shrink-0">Recent Ops</h3>
          <div className="overflow-y-auto space-y-3 pr-1 pb-2 flex-1">
            {history.length > 0 ? (
              [...history].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10).map((h, i) => {
                const d = new Date(h.time);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-[#0b101e] border border-gray-100 dark:border-gray-800 transition-colors hover:border-gray-200 dark:hover:border-gray-700">
                    <span className="text-sm font-semibold dark:text-gray-300 truncate pr-2 flex items-center gap-2">
                      <span className="text-gray-500 text-xs shrink-0">{isToday ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span className="truncate">{h.templateName || "Free Session"}</span>
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono text-sm font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md shrink-0">
                      {h.duration} min
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500 text-center mt-6">No previous ops logged.</p>
            )}
          </div>
        </div>

        {/* WORKOUT TEMPLATES */}
        <div className="bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm lg:col-span-2 p-5 flex flex-col min-h-0 mt-4 lg:mt-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold">Mission Loadouts</h3>
            <button onClick={openCreateModal} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-[background,transform] active:scale-95 shadow-sm">
              <HiPlus className="w-4 h-4" /> New Loadout
            </button>
          </div>
          <div className="overflow-y-auto w-full pr-1 pb-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 auto-rows-max h-full">
              {routines.length > 0 ? (
                routines.map((r) => <RoutineCard key={r.id} routine={r} onEdit={openEditModal} onDelete={handleDelete} />)
              ) : (
                <p className="text-sm text-gray-500 col-span-full">No active loadouts found. Create one above.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans">
          <div className="bg-white dark:bg-[#1a202c] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold dark:text-white">{editingId ? "Edit Loadout" : "Create Loadout"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1"><HiX className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Protocol Name</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="e.g. Legs Hypertrophy" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Description</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Heavy compound focus..." />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Required Exercises</label>
                <div className="flex flex-wrap gap-2 p-3 border border-gray-300 dark:border-gray-700 rounded-lg min-h-[60px] dark:bg-[#0b101e] focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                  {formExercises.map((ex, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-md text-sm font-semibold flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                      {ex}
                      <button type="button" onClick={() => removeExerciseTag(ex)} className="hover:text-blue-900 dark:hover:text-blue-200 bg-transparent"><HiX className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <input type="text" placeholder="Type exercise & hit Enter" value={exerciseInput} onChange={(e) => setExerciseInput(e.target.value)} onKeyDown={handleAddExerciseTag} className="flex-1 bg-transparent outline-none min-w-[150px] text-sm dark:text-white" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Scheduled Days</label>
                <div className="flex flex-wrap gap-2">
                  {allDays.map((day) => (
                    <button key={day} type="button" onClick={() => toggleDayTag(day)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${formDays.includes(day) ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-gray-600 border-gray-300 dark:bg-transparent dark:border-gray-700 dark:text-gray-400 hover:border-gray-400"}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-2"></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors">Save Loadout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL LOG MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans">
          <div className="bg-white dark:bg-[#1a202c] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold dark:text-white">Log Past Session</h2>
              <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1"><HiX className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleManualLog} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Session Date</label>
                <input type="date" required value={manualDate} onChange={(e) => setManualDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Duration (Minutes)</label>
                <input type="number" min="1" required value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 45" />
              </div>

              {routines.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Workout Loadout</label>
                  <select value={manualTemplate} onChange={(e) => setManualTemplate(e.target.value)} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                    {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}

              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-2"></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsManualModalOpen(false)} className="px-5 py-2.5 text-sm font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={isLogging} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors">{isLogging ? "Logging..." : "Save Log"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}