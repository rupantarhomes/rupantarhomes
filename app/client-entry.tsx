import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import { RupantarSite } from "./rupantar/site";

const root = document.getElementById("root");

if (!root) throw new Error("Rupantar Homes root element was not found.");

createRoot(root).render(
  <StrictMode>
    <RupantarSite />
  </StrictMode>,
);
