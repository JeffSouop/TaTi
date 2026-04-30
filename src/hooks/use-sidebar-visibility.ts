import { useEffect, useState } from "react";

const KEY = "tati-sidebar-visible";

export function useSidebarVisibility() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "0") setVisible(false);
    } catch {
      // ignore
    }
  }, []);

  const update = (next: boolean) => {
    setVisible(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  return {
    visible,
    show: () => update(true),
    hide: () => update(false),
    toggle: () => update(!visible),
  };
}
