import React from "react";

export default function DailyCaloriesDoughnut({ calories, goal }) {
  const percent = goal ? Math.min(Math.round((calories / goal) * 100), 100) : 0;
  
  const radius = 38; 
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (percent / 100);

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg width={100} height={100} className="-rotate-90">
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-800"
          strokeWidth={8}
        />
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-blue-500"
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="square"
        />
      </svg>
      {/* Inner percentage display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <div className="text-xl font-black text-slate-800 dark:text-white">
           {percent}%
         </div>
      </div>
    </div>
  );
}