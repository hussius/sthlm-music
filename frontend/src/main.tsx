import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@codongit/codon-component-library/styles.css";
import "@codongit/codon-component-library/index.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
