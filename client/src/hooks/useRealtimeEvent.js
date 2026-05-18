import { useEffect, useRef, useState } from "react";

export const useRealtimeEvent = (eventName, handler) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!eventName) return undefined;

    const listener = (event) => {
      handlerRef.current?.(event.detail);
    };

    window.addEventListener(`dentacare:realtime:${eventName}`, listener);
    return () => window.removeEventListener(`dentacare:realtime:${eventName}`, listener);
  }, [eventName]);
};

export const useRealtimeRefresh = (events = []) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const eventsKey = events.join("|");

  useEffect(() => {
    if (events.length === 0) return undefined;

    const refresh = () => setRefreshKey((key) => key + 1);
    events.forEach((eventName) => {
      window.addEventListener(`dentacare:realtime:${eventName}`, refresh);
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(`dentacare:realtime:${eventName}`, refresh);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey]);

  return refreshKey;
};
