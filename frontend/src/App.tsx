import React, { useState } from "react";
import { CodonButton, CodonTooltip } from "@codongit/codon-component-library";
import { initI18n } from "@codongit/codon-component-library";

initI18n("en");

function App() {
  const [count, setCount] = useState<number>(0);

  return (
    <div className="flex h-screen w-screen bg-codon-bg-beige flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <p className="text-2xl">Codon Frontend Template</p>
        <div className="flex flex-row items-center justify-center gap-2">
          <CodonTooltip text="Click to increment">
            <CodonButton onClick={() => setCount(count + 1)}>
              Click me
            </CodonButton>
          </CodonTooltip>
          <p>{count}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
