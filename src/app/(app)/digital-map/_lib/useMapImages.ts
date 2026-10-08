"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

/** Images use authenticated requests; private files never become public storage URLs. */
export function useMapImages(ids: string[]) {
  const cache = useRef(new Map<string, string>());
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const signature = [...new Set(ids)].sort().join("|");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const pending = signature.split("|").filter(id => id && !cache.current.has(id));
    const failed: string[] = [];
    async function worker() {
      while (pending.length && active) {
        const id = pending.shift()!;
        try {
          const blob = await authedFetch("/digital-map/images/" + encodeURIComponent(id), { signal: controller.signal }, "blob") as Blob;
          if (!active) return;
          if (!blob.type.startsWith("image/")) throw new Error("Invalid image");
          const url = URL.createObjectURL(blob);
          cache.current.set(id, url);
          setUrls(current => ({ ...current, [id]: url }));
        } catch { if (active) failed.push(id); }
      }
    }
    void Promise.all([worker(), worker(), worker()]).then(() => { if (active) setErrors(failed); });
    return () => { active = false; controller.abort(); };
  }, [signature, retry]);
  useEffect(() => {
    const entries = cache.current;
    return () => { for (const url of entries.values()) URL.revokeObjectURL(url); entries.clear(); };
  }, []);
  const remember = useCallback((id: string, file: Blob) => {
    const prior = cache.current.get(id);
    if (prior) URL.revokeObjectURL(prior);
    const url = URL.createObjectURL(file);
    cache.current.set(id, url);
    setUrls(current => ({ ...current, [id]: url }));
  }, []);
  return { urls, errors, remember, retry: () => setRetry(value => value + 1) };
}
