"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { reconcileStaleGalleryOperationsAction } from "../_actions/gallery-actions";

export function PendingOperationReconciler() {
  const started = useRef(false); const router = useRouter();
  useEffect(() => {
    if (started.current) return; started.current = true;
    void reconcileStaleGalleryOperationsAction().then((result) => { if (result.changed > 0) router.refresh(); }).catch(() => undefined);
  }, [router]);
  return null;
}
