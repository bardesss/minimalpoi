import { createContext, useContext } from "react";
import type { Snap } from "./useSheetDrag";

/** Lets content inside a BottomSheet move the sheet (e.g. open it to half). No-op outside a sheet. */
export const SheetSnapContext = createContext<(snap: Snap) => void>(() => {});

export const useSheetSnapTo = () => useContext(SheetSnapContext);
