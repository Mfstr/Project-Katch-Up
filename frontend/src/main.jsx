import React from "react";
import ReactDOM from "react-dom/client";

function App() {
    return (
        <div className = "app">
            <SmartFocusUI />
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);