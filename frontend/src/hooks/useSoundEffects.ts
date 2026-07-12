import { useEffect } from "react";
import { bind } from "cuelume";

export function useSoundEffects() {
  useEffect(() => {
    bind();
  }, []);
}
