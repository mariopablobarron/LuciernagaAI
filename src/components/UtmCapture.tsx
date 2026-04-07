"use client";

import { useEffect } from "react";
import { captureUtmParams } from "@/lib/utm";

/**
 * Captures UTM parameters from the URL on mount and stores them in sessionStorage.
 * Renders nothing visible.
 */
export default function UtmCapture() {
  useEffect(() => {
    captureUtmParams();
  }, []);

  return null;
}
