import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "./contexts/theme/theme-provider";
import { router } from "./routes/routes.jsx";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/theme/AuthContext.jsx";
import { MatchProvider } from "./contexts/match/MatchContext.jsx";


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MatchProvider>
          <RouterProvider router={router} />
        </MatchProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
