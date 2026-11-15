"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{ style: { background: "#191927", border: "1px solid #29293B", color: "#F8FAFC" } }}
    />
  );
}
