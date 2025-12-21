import { Suspense } from "react";
import MainGraph from "../lib/MainGraph";

export default function GraphPage() {
  return (
    <div className="w-screen h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <MainGraph />
      </Suspense>
    </div>
  );
}
