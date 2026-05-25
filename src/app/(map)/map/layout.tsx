import type { ReactNode } from "react";
import { AppChrome } from "@/components/AppChrome";

export default function MapLayout({ children }: { children: ReactNode }) {
  return <AppChrome showFooter={false}>{children}</AppChrome>;
}
