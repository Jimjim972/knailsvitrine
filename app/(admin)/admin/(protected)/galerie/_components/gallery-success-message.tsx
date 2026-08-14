"use client";

import { useEffect, useRef } from "react";

export function GallerySuccessMessage({ children }: { children: string }) {
  const message = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const timeout = window.setTimeout(() => message.current?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [children]);
  return <p ref={message} className="admin-status success" role="status" tabIndex={-1}>{children}</p>;
}
