import { createContext, useContext } from "react";
import type { Snap } from "./useSheetDrag";

/** Lets content inside a BottomSheet open it to at least a snap, never shrinking it. No-op outside a sheet. */
export const SheetRaiseContext = createContext<(snap: Snap) => void>(() => {});

export const useSheetRaiseTo = () => useContext(SheetRaiseContext);
