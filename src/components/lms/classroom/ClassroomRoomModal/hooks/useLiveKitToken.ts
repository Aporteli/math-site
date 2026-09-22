"use client";

import { useEffect, useState } from "react";

export function useLiveKitToken(courseId: string) {
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** `true`, თუ იგივე ექაუნთით სხვა მოწყობილობა უკვე ოთახშია (ეს კავშირი მეორეულია). */
  const [secondary, setSecondary] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchToken() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/livekit?courseId=${encodeURIComponent(courseId)}`,
        );
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "ოთახში შესვლა ვერ მოხერხდა");
        }
        const data = await res.json();
        if (isMounted) {
          setToken(data.token);
          setSecondary(Boolean(data.secondary));
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "დაფიქსირდა შეცდომა");
          setLoading(false);
        }
      }
    }

    fetchToken();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  return { token, loading, error, secondary };
}