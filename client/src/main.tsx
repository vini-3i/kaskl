import React from "react";
import { createRoot, Root } from "react-dom/client";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    __KASKL_REACT_ROOT__?: Root;
  }
}

const container = document.getElementById("root");
if (!container) throw new Error("Elemento #root não encontrado");

// Evita o warning do Vite/HMR: createRoot chamado mais de uma vez no mesmo container.
const root = window.__KASKL_REACT_ROOT__ ?? createRoot(container);
window.__KASKL_REACT_ROOT__ = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
