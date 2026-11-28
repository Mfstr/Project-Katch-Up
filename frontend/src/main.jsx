import "./styles/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Home from "./pages/home.jsx";
import Authorize from "./pages/authorize.jsx";
import { getAuthToken } from "./services/apiClient.js";
import { ThemeProvider } from "./context/ThemeContext.jsx";

const ProtectedRoute = ({ children }) => {
    const token = getAuthToken();
    return token ? children : <Navigate to="/login" replace />;
};

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Authorize />} />
                    <Route path="/register" element={<Authorize />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    </StrictMode>
);