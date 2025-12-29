"use client";

import { ReactFlowProvider } from "@xyflow/react";
import MainGraph from "../lib/MainGraph";

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <div className="w-screen h-screen">
        <MainGraph />
      </div>
    </ReactFlowProvider>
  );
}
