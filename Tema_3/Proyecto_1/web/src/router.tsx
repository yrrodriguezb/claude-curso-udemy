import { createBrowserRouter, Navigate } from "react-router";
import { GuestOnly, RequireAuth } from "./auth/guards";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";

export const router = createBrowserRouter(
  [
    { path: "/", element: <Navigate to="/dashboard" replace /> },
    { path: "/login", element: <GuestOnly><LoginPage /></GuestOnly> },
    { path: "/register", element: <GuestOnly><RegisterPage /></GuestOnly> },
    { path: "/dashboard", element: <RequireAuth><DashboardPage /></RequireAuth> },
    { path: "*", element: <NotFoundPage /> },
  ],
  { basename: "/app" }
);
