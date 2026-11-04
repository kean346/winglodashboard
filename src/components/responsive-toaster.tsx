"use client";
import { useEffect, useState } from "react";

import { Toaster } from "@/components/ui/sonner";
/** Phone notifications stay away from the guided demo's bottom action controls. */
export function ResponsiveToaster() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <Toaster position={mobile ? "top-center" : "bottom-right"} />;
}
