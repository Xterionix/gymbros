import { Link } from "react-router-dom";
import { GiWeightLiftingUp } from "react-icons/gi";
import { IoPersonOutline } from "react-icons/io5";
import { HiHome } from "react-icons/hi";
import { IoMdNutrition } from "react-icons/io";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white dark:bg-[#1a202c] border-t border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 fixed bottom-0 left-0 w-full pb-safe z-50 overflow-hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <ul className="list-none flex justify-around items-center w-full max-w-md mx-auto py-2">
        <li>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-colors min-w-[64px] ${isActive ? "text-blue-600 dark:text-blue-400" : "hover:text-gray-900 dark:hover:text-gray-200"
              }`
            }
          >
            <HiHome className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Home</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/workout"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-colors min-w-[64px] ${isActive ? "text-blue-600 dark:text-blue-400" : "hover:text-gray-900 dark:hover:text-gray-200"
              }`
            }
          >
            <GiWeightLiftingUp className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Workout</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/nutrition"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-colors min-w-[64px] ${isActive ? "text-blue-600 dark:text-blue-400" : "hover:text-gray-900 dark:hover:text-gray-200"
              }`
            }
          >
            <IoMdNutrition className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Nutrition</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg transition-colors min-w-[64px] ${isActive ? "text-blue-600 dark:text-blue-400" : "hover:text-gray-900 dark:hover:text-gray-200"
              }`
            }
          >
            <IoPersonOutline className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-wider">Profile</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

