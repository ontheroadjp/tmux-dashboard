import { ReactNode } from "react";
import TerminalIcon from "@mui/icons-material/Terminal";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import DnsIcon from "@mui/icons-material/Dns";

export function titleIcon(title?: string): ReactNode {
  const normalized = (title ?? "").toLowerCase();
  if (normalized.includes("codex") || normalized.includes("claude code") || normalized.includes("gemini")) {
    return <SmartToyIcon fontSize="small" sx={{ color: "success.main" }} />;
  }
  if (normalized.includes("server") || normalized.includes("サーバー")) {
    return <DnsIcon fontSize="small" sx={{ color: "primary.main" }} />;
  }
  if (normalized.includes("tunnel") || normalized.includes("ssh")) {
    return <VpnLockIcon fontSize="small" sx={{ color: "secondary.main" }} />;
  }
  return <TerminalIcon fontSize="small" sx={{ color: "text.secondary" }} />;
}
