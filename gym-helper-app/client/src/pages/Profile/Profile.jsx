import { HiOutlinePencilAlt, HiMoon, HiSun, HiCamera } from "react-icons/hi";
import { GrScorecard } from "react-icons/gr";
import { GrGallery } from "react-icons/gr";
import { LuCalendarFold } from "react-icons/lu";
import { useAuth, unknownUser } from "../../contexts/theme/AuthContext";
import { useTheme } from "../../contexts/theme/theme-context";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom"; 
import ImageUploader from "../../components/imageUploader";

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const fileInputRef = useRef(null);
  
  const navigate = useNavigate();

  const startEditing = () => {
    setEditName(user?.name || "");
    setEditUsername(user?.username || "");
    setIsEditing(true);
  };
  
  const saveProfileInfo = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editName, username: editUsername }),
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
        setIsEditing(false);
      }
    } catch (err) { console.error("Error updating profile:", err); }
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Only image files are allowed.");
    if (file.size > 2 * 1024 * 1024) return alert("File size must be under 2MB.");

    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch("http://localhost:5000/api/auth/me/avatar", {
        method: "PATCH", 
        body: formData, 
        credentials: "include", 
      });
      const json = await res.json();
      if (res.ok && json.data) setUser(json.data);
    } catch (err) {
      console.error("Upload failed.", err);
    }
  };

  // --- Goals Modal State ---
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalsForm, setGoalsForm] = useState({
    targetCalories: 0, hydrationGoal: 0, protein: 0, carbs: 0, fats: 0,
  });

  const openGoalsModal = () => {
    setGoalsForm({
      targetCalories: user?.nutrition?.targetCalories || 0,
      hydrationGoal: user?.nutrition?.hydrationGoal || 0,
      protein: user?.nutrition?.macros?.protein || 0,
      carbs: user?.nutrition?.macros?.carbs || 0,
      fats: user?.nutrition?.macros?.fats || 0,
    });
    setShowGoalsModal(true);
  };

  const handleGoalsChange = (e) => {
    setGoalsForm({ ...goalsForm, [e.target.name]: Number(e.target.value) });
  };

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/auth/me/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(goalsForm),
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
        setShowGoalsModal(false);
      }
    } catch (err) {
      console.error("Failed to save goals", err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 text-slate-900 dark:bg-[#0b101e] dark:text-gray-100 p-4 lg:p-6 overflow-hidden max-w-full font-sans pb-safe font-inter">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <p className="text-xs uppercase tracking-widest text-blue-500 mb-1 font-semibold">Account</p>
        <h1 className="text-3xl lg:text-4xl font-extrabold dark:text-white">Profile Central</h1>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 flex-1 min-h-0">
        
        {/* ROW/COL 1: SIDEBAR PROFILE CARD */}
        <div className="bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 flex flex-col items-center text-center relative max-h-full">
          {!isEditing && (
            <button
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 bg-gray-50 dark:bg-[#0b101e] rounded-full transition-colors border border-gray-200 dark:border-gray-800"
              onClick={startEditing}
              title="Edit Profile"
            >
              <HiOutlinePencilAlt className="w-5 h-5" />
            </button>
          )}

          <div className="relative mt-2 mb-4 group">
             <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
             <img
               src={user?.profilePicture ?? unknownUser.profilePicture}
               alt="Profile"
               className={`w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg relative z-10 transition-opacity ${isEditing ? "group-hover:opacity-50" : ""}`}
             />
             {isEditing && (
                <div 
                  className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HiCamera className="w-8 h-8 text-white drop-shadow-md" />
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarSelect} />
                </div>
             )}
          </div>

          {isEditing ? (
             <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-xl font-bold dark:text-white bg-gray-50 dark:bg-[#0b101e] border border-gray-300 dark:border-gray-700 rounded-md p-1.5 text-center mb-1 outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]" placeholder="Name" />
          ) : (
             <h2 className="text-xl font-bold dark:text-white">{user?.name ?? unknownUser.name}</h2>
          )}

          {isEditing ? (
             <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-[#0b101e] border border-gray-300 dark:border-gray-700 rounded-md p-1.5 text-center mb-6 outline-none focus:ring-2 focus:ring-blue-500 mt-2 max-w-[200px]" placeholder="Username" />
          ) : (
             <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-6 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full mt-2 truncate max-w-full">
               {user?.username ?? unknownUser.username}
             </p>
          )}

          {isEditing ? (
             <div className="w-full flex gap-2 mt-auto">
               <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">Cancel</button>
               <button onClick={saveProfileInfo} className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm">Save</button>
             </div>
          ) : (
             <>
               <div className="w-full bg-gray-50 dark:bg-[#0b101e] border border-gray-200 dark:border-gray-800 rounded-lg p-3 mb-4 flex items-center justify-between">
                 <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Appearance</span>
                 <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500">
                    {theme === "dark" ? <><HiSun className="w-4 h-4 text-yellow-500"/> Light</> : <><HiMoon className="w-4 h-4 text-blue-600"/> Dark</>}
                 </button>
               </div>
               <button onClick={logout} className="w-full py-2.5 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-bold rounded-lg transition-colors text-sm uppercase tracking-wider">
                 Sign Out
               </button>
             </>
          )}
        </div>

        {/* COL 2: DASHBOARD ACTIONS */}
        <div className="flex flex-col min-h-0 bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-6 overflow-y-auto">
           <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4 shrink-0">Dashboard Actions</h3>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-max">
              <button
                onClick={openGoalsModal}
                className="group flex flex-col border border-gray-200 dark:border-gray-800 items-start justify-center p-6 bg-gray-50 dark:bg-[#0b101e] hover:border-green-500 dark:hover:border-green-500 rounded-xl shadow-sm transition-all duration-300 cursor-pointer text-left"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                  <GrScorecard className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">Goals</span>
                <span className="text-xs font-semibold text-gray-500">Set nutritional targets</span>
              </button>

              <button
                onClick={() => navigate("/gallery")}
                className="group flex flex-col border border-gray-200 dark:border-gray-800 items-start justify-center p-6 bg-gray-50 dark:bg-[#0b101e] hover:border-purple-500 dark:hover:border-purple-500 rounded-xl shadow-sm transition-all duration-300 cursor-pointer text-left"
              >
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                  <GrGallery className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">Gallery</span>
                <span className="text-xs font-semibold text-gray-500">View progress photos</span>
              </button>

              <button
                onClick={() => navigate("/calendar")}
                className="group flex flex-col border border-gray-200 dark:border-gray-800 items-start justify-center p-6 bg-gray-50 dark:bg-[#0b101e] hover:border-yellow-500 dark:hover:border-yellow-500 rounded-xl shadow-sm transition-all duration-300 cursor-pointer text-left"
              >
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mb-4 group-hover:scale-110 transition-transform">
                  <LuCalendarFold className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white mb-1">Calendar</span>
                <span className="text-xs font-semibold text-gray-500">Review schedule map</span>
              </button>
           </div>
        </div>

      </div>



      {/* --- Goals Modal --- */}
      {showGoalsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans">
          <div className="bg-white dark:bg-[#1a202c] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-6 text-black dark:text-white">Nutrition Targets</h2>
            <form onSubmit={handleSaveGoals} className="grid gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Target Calories</label>
                <input type="number" name="targetCalories" value={goalsForm.targetCalories} onChange={handleGoalsChange} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Water Goal (ml)</label>
                  <input type="number" name="hydrationGoal" value={goalsForm.hydrationGoal} onChange={handleGoalsChange} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold text-center">Protein (g)</label>
                  <input type="number" name="protein" value={goalsForm.protein} onChange={handleGoalsChange} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold text-center">Carbs (g)</label>
                  <input type="number" name="carbs" value={goalsForm.carbs} onChange={handleGoalsChange} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold text-center">Fats (g)</label>
                  <input type="number" name="fats" value={goalsForm.fats} onChange={handleGoalsChange} className="p-3 border rounded-lg border-gray-300 dark:border-gray-700 dark:bg-[#0b101e] dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center" />
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 mt-2"></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowGoalsModal(false)} className="px-5 py-2.5 text-sm font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors">Set Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}