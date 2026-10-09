import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Home from "./pages/home.jsx";
import Authorize from "./pages/authorize.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Authorize />} />
                <Route path="/register" element={<Authorize />} />
                <Route path="/dashboard" element={<Home />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);