import { JSX } from "react";
import TerminalIcon from "@mui/icons-material/Terminal";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import DnsIcon from "@mui/icons-material/Dns";

type TitleIconOptions = {
  active?: boolean;
};

export function titleIcon(title?: string, options: TitleIconOptions = {}): JSX.Element {
  const { active = true } = options;
  const inactiveColor = "text.primary";
  const normalized = (title ?? "").toLowerCase();
  if (normalized.includes("codex") || normalized.includes("claude code") || normalized.includes("gemini")) {
    return <SmartToyIcon fontSize="small" sx={{ color: active ? "success.main" : inactiveColor }} />;
  }
  if (normalized.includes("server") || normalized.includes("サーバー")) {
    return <DnsIcon fontSize="small" sx={{ color: active ? "primary.main" : inactiveColor }} />;
  }
  if (normalized.includes("tunnel") || normalized.includes("ssh")) {
    return <VpnLockIcon fontSize="small" sx={{ color: active ? "secondary.main" : inactiveColor }} />;
  }
  return <TerminalIcon fontSize="small" sx={{ color: active ? "text.secondary" : inactiveColor }} />;
}
