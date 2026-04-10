import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import Home from "../pages/Home/Home.jsx";
import History from "../pages/History/History.jsx";
import Profile from "../pages/Profile/Profile.jsx";
import Workout from "../pages/Workout/Workout.jsx";
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";
import AuthGate from "../components/AuthGate.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import Gallery from "../pages/Gallery/Gallery.jsx";
import Nutrition from "../pages/Nutrition/Nutrition.jsx";

export const router = createBrowserRouter([
    {
    // routes inside here are private
    path: "/", 
    element: (
        <ProtectedRoute>
            <App />
        </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Home /> },
      { path: "history", element: <History /> },
      { path: "profile", element: <Profile /> },
      { path: "workout", element: <Workout /> },
      { path: "nutrition", element: <Nutrition /> },
      { path: "gallery", element: <Gallery /> },
      { path: "auth", element: <AuthGate /> },
    ],
    },
    // routes inside here are public
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
        path: "*",
        element: <h1>404 Not Found</h1>
    },
]);
