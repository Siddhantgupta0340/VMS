import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/inter";
import "./index.css";

import App from "./App";
import { SidebarProvider } from "./context/SidebarContext";
import { AuthProvider } from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
  <AuthProvider>
    <AppDataProvider>
  <SidebarProvider>
    <App />
  </SidebarProvider>
</AppDataProvider>
  </AuthProvider>
</BrowserRouter>
  </React.StrictMode>
);