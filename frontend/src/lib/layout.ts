import { useMediaQuery } from "./useMediaQuery";

export const SIDEBAR_WIDTH = 480;
export const SIDEBAR_WIDTH_WIDE = 640;

/** Width (px) of the desktop sidebar/docked form: wider on very wide viewports. */
export function useSidebarWidth(): number {
  const wide = useMediaQuery("(min-width: 1600px)");
  return wide ? SIDEBAR_WIDTH_WIDE : SIDEBAR_WIDTH;
}
