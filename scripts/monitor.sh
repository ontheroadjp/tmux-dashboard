#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

icon_ok="${GREEN}●${NC}"
icon_err="${RED}✗${NC}"
icon_stopped="${DIM}○${NC}"

launchd_status() {
  local label="$1"
  launchctl list 2>/dev/null | awk -v l="$label" '$3==l {print $1, $2}'
}

port_pid() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $2}' | head -1
}

print_launchd_row() {
  local label_short="$1"
  local label_full="$2"
  local port="$3"

  local raw pid exit_code port_pid_val
  raw="$(launchd_status "$label_full")"
  port_pid_val="$(port_pid "$port" 2>/dev/null || true)"

  local status_col port_col

  if [ -z "$raw" ]; then
    status_col="${icon_stopped} ${DIM}stopped${NC}"
    port_col="${RED}:${port} ✗${NC}"
  else
    pid="$(echo "$raw" | awk '{print $1}')"
    exit_code="$(echo "$raw" | awk '{print $2}')"

    if [ "$pid" != "-" ] && [ "$exit_code" = "0" ]; then
      status_col="${icon_ok} ${GREEN}running${NC}  pid:${pid}"
      if [ -n "$port_pid_val" ]; then
        port_col="${GREEN}:${port} ✓${NC}"
      else
        port_col="${YELLOW}:${port} ?${NC}"
      fi
    else
      status_col="${icon_err} ${RED}error${NC}    exit:${exit_code}"
      port_col="${RED}:${port} ✗${NC}"
    fi
  fi

  printf "  %-12s %b  %b\n" "$label_short" "$status_col" "$port_col"
}

print_port_row() {
  local label="$1"
  local port="$2"

  local pid
  pid="$(port_pid "$port" 2>/dev/null || true)"

  local status_col port_col
  if [ -n "$pid" ]; then
    status_col="${icon_ok} ${GREEN}running${NC}  pid:${pid}"
    port_col="${GREEN}:${port} ✓${NC}"
  else
    status_col="${icon_stopped} ${DIM}stopped${NC}"
    port_col="${DIM}:${port} ✗${NC}"
  fi

  printf "  %-12s %b  %b\n" "$label" "$status_col" "$port_col"
}

print_tunnel_row() {
  local label_full="jp.ontheroad.tmux-dashboard.tunnel.prod"
  local raw pid exit_code status_col

  raw="$(launchd_status "$label_full")"

  if [ -z "$raw" ]; then
    status_col="${icon_stopped} ${DIM}stopped${NC}"
  else
    pid="$(echo "$raw" | awk '{print $1}')"
    exit_code="$(echo "$raw" | awk '{print $2}')"

    if [ "$pid" != "-" ] && [ "$exit_code" = "0" ]; then
      status_col="${icon_ok} ${GREEN}running${NC}  pid:${pid}"
    else
      status_col="${icon_err} ${RED}error${NC}    exit:${exit_code}"
    fi
  fi

  printf "  %-12s %b\n" "tunnel" "$status_col"
}

echo
printf "${BOLD}tmux-dashboard monitor${NC}  ${DIM}$(date '+%Y-%m-%d %H:%M:%S')${NC}\n"
echo

printf "${BOLD}PROD (launchd)${NC}\n"
print_launchd_row "backend"  "jp.ontheroad.tmux-dashboard.backend.prod"  "10323"
print_launchd_row "frontend" "jp.ontheroad.tmux-dashboard.frontend.prod" "10322"
print_tunnel_row
echo

printf "${BOLD}DEV${NC}\n"
print_port_row "backend"  "5001"
print_port_row "frontend" "4000"
echo

print_env_row() {
  local path="$1"
  local rel="${path#"$REPO_ROOT/"}"
  if [ -f "$path" ]; then
    printf "  %-28s %b\n" "$rel" "${GREEN}✓${NC}"
  else
    printf "  %-28s %b\n" "$rel" "${RED}✗ not found${NC}"
  fi
}

printf "${BOLD}ENV FILES${NC}\n"
printf "  ${DIM}PROD${NC}\n"
print_env_row "$REPO_ROOT/backend/.env.prod"
print_env_row "$REPO_ROOT/frontend/.env.prod"
print_env_row "$REPO_ROOT/tunnel/.env.prod"
printf "  ${DIM}DEV${NC}\n"
print_env_row "$REPO_ROOT/backend/.env.dev"
print_env_row "$REPO_ROOT/frontend/.env.dev"
print_env_row "$REPO_ROOT/tunnel/.env.dev"
echo
