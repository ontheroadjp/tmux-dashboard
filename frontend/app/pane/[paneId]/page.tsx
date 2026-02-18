"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TerminalIcon from "@mui/icons-material/Terminal";
import LogoutIcon from "@mui/icons-material/Logout";
import { API_LABEL, fetchPaneDetail, fetchSession, fetchSnapshot, logout, postAction, type PaneDetail } from "../../../lib/api";
import { dashboardTheme } from "../../../lib/theme";
import { titleIcon } from "../../../lib/titleIcon";

const POLL_MS = 3000;

type PaneTab = PaneDetail["pane"];
type WindowTab = {
  id: string;
  index: number;
  name: string;
  active: boolean;
  panes: PaneTab[];
};

export default function PanePage() {
  const params = useParams<{ paneId: string }>();
  const router = useRouter();
  const paneIdParam = decodeURIComponent(params.paneId ?? "");

  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [detail, setDetail] = useState<PaneDetail | null>(null);
  const [windowPanes, setWindowPanes] = useState<PaneTab[]>([]);
  const [sessionWindows, setSessionWindows] = useState<WindowTab[]>([]);
  const [activePaneId, setActivePaneId] = useState("");
  const [windowTitle, setWindowTitle] = useState("pane detail");
  const [windowMenuAnchorEl, setWindowMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keys, setKeys] = useState("");
  const [isKeysFocused, setIsKeysFocused] = useState(false);
  const [paneInfoExpanded, setPaneInfoExpanded] = useState(true);
  const keysInputRef = useRef<HTMLTextAreaElement | null>(null);

  const allowed = useMemo(() => new Set(allowedActions), [allowedActions]);

  async function load(targetPaneId: string) {
    if (!targetPaneId) {
      setError("paneId is required");
      return;
    }

    try {
      setError("");
      const [paneDetail, snapshot] = await Promise.all([fetchPaneDetail(targetPaneId), fetchSnapshot()]);
      setDetail(paneDetail);
      setWindowTitle(paneDetail.window.name || "pane detail");
      setAllowedActions(snapshot.allowed_actions);

      const session = snapshot.tmux.sessions.find((item) => item.name === paneDetail.session.name);
      const windows: WindowTab[] = (session?.windows ?? []).map((window) => ({
        id: window.id,
        index: window.index,
        name: window.name,
        active: window.active,
        panes: window.panes as PaneTab[],
      }));
      const hasCurrentWindow = windows.some((window) => window.id === paneDetail.window.id);
      if (!hasCurrentWindow) {
        windows.push({
          id: paneDetail.window.id,
          index: paneDetail.window.index,
          name: paneDetail.window.name,
          active: paneDetail.window.active,
          panes: [paneDetail.pane],
        });
      }
      setSessionWindows(windows);

      const currentWindow = windows.find((window) => window.id === paneDetail.window.id);
      const panes = currentWindow?.panes ?? [paneDetail.pane];
      setWindowPanes(panes);

      if (!panes.some((pane) => pane.id === targetPaneId)) {
        setActivePaneId(panes[0]?.id ?? targetPaneId);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "failed to load pane";
      if (message === "unauthorized") {
        setIsAuthenticated(false);
        setCurrentUser("");
        return;
      }
      setError(message);
    }
  }

  useEffect(() => {
    setActivePaneId(paneIdParam);
  }, [paneIdParam]);

  useEffect(() => {
    async function checkSession() {
      try {
        const session = await fetchSession();
        setIsAuthenticated(session.authenticated);
        setCurrentUser(session.user);
      } finally {
        setAuthReady(true);
      }
    }
    checkSession();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const targetPaneId = activePaneId || paneIdParam;
    if (!targetPaneId) {
      return;
    }

    void load(targetPaneId);
    const timer = window.setInterval(() => {
      if (!isKeysFocused) {
        void load(targetPaneId);
      }
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, activePaneId, paneIdParam, isKeysFocused]);

  async function runAction(action: string, payload: Record<string, unknown>) {
    const resolvedTargetPaneId = String(
      payload.target_pane ?? (activePaneId || detail?.pane.id || paneIdParam || "")
    ).trim();
    const normalizedPayload =
      action === "send_keys"
        ? { ...payload, target_pane: resolvedTargetPaneId }
        : payload;

    if (action === "send_keys" && !resolvedTargetPaneId) {
      setError("target pane is unavailable");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await postAction(action, normalizedPayload);
      const rawTargetPaneId =
        normalizedPayload.target_pane ?? (activePaneId || detail?.pane.id || paneIdParam);
      const targetPaneId = String(rawTargetPaneId);
      await load(targetPaneId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "action failed";
      if (message === "unauthorized") {
        setIsAuthenticated(false);
        setCurrentUser("");
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function onSendKeys(e: FormEvent) {
    e.preventDefault();
    const targetPaneId = activePaneId || detail?.pane.id || paneIdParam;
    if (!targetPaneId) {
      return;
    }

    const payloadKeys =
      keys.trim() === ""
        ? ["C-u"]
        : ["-l", keys];
    void runAction("send_keys", { target_pane: targetPaneId, keys: payloadKeys });
  }

  function onSendEnter() {
    const targetPaneId = activePaneId || detail?.pane.id || paneIdParam;
    if (!targetPaneId) {
      return;
    }

    void runAction("send_keys", { target_pane: targetPaneId, keys: ["Enter"] });
  }

  function onClearPrompt() {
    setKeys("");
  }

  async function onLogout() {
    await logout();
    setIsAuthenticated(false);
    setCurrentUser("");
    router.push("/");
  }

  const tabs = useMemo(() => {
    if (windowPanes.length > 0) {
      return windowPanes;
    }
    return detail ? [detail.pane] : [];
  }, [windowPanes, detail]);

  const targetPaneId = activePaneId || detail?.pane.id || paneIdParam;
  const activeTabsValue = useMemo(() => {
    if (activePaneId && tabs.some((pane) => pane.id === activePaneId)) {
      return activePaneId;
    }
    if (detail?.pane.id && tabs.some((pane) => pane.id === detail.pane.id)) {
      return detail.pane.id;
    }
    return false;
  }, [activePaneId, detail, tabs]);
  const activeWindowId = detail?.window.id ?? "";
  const sortedWindows = useMemo(
    () => [...sessionWindows].sort((a, b) => a.index - b.index),
    [sessionWindows]
  );
  const isWindowMenuOpen = Boolean(windowMenuAnchorEl);

  function handlePaneTabChange(nextPaneId: string) {
    setActivePaneId(nextPaneId);
    void load(nextPaneId);
  }

  function openWindowMenu(e: ReactMouseEvent<HTMLElement>) {
    setWindowMenuAnchorEl(e.currentTarget);
  }

  function closeWindowMenu() {
    setWindowMenuAnchorEl(null);
  }

  function handleWindowChange(nextWindowId: string) {
    closeWindowMenu();
    const nextWindow = sortedWindows.find((window) => window.id === nextWindowId);
    if (!nextWindow) {
      return;
    }
    const nextPane = nextWindow?.panes.find((pane) => pane.active) ?? nextWindow?.panes[0];
    if (!nextPane) {
      return;
    }
    setWindowPanes(nextWindow.panes);
    setWindowTitle(nextWindow.name || "pane detail");
    setActivePaneId(nextPane.id);
    router.push(`/pane/${encodeURIComponent(nextPane.id)}`);
    void load(nextPane.id);
  }

  if (!authReady) {
    return (
      <ThemeProvider theme={dashboardTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)" }}>
          <Typography>loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={dashboardTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)", p: 2 }}>
          <Card sx={{ width: "100%", maxWidth: 460 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>unauthorized</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ログインセッションがありません。トップページでログインしてください。
              </Typography>
              <Button variant="contained" onClick={() => router.push("/")}>go to top</Button>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", pb: 6, background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)" }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: "1px solid #D8E2EE", backgroundColor: "#edf5ff" }}
        >
          <Container maxWidth="xl" sx={{ minWidth: 0 }}>
            <Toolbar sx={{ gap: 1 }}>
              <IconButton color="primary" onClick={() => router.push("/")} aria-label="go to top">
                <TerminalIcon />
              </IconButton>
              <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flexGrow: 1 }}>
                <Typography variant="h6" component="h1" sx={{ minWidth: 0 }}>
                  {windowTitle}
                </Typography>
                <IconButton
                  size="small"
                  onClick={openWindowMenu}
                  aria-label="switch window"
                  sx={{ ml: 0.25, p: 0.25, color: "text.primary", borderRadius: 1 }}
                >
                  <Typography variant="caption" component="span" sx={{ lineHeight: 1 }}>
                    ▼
                  </Typography>
                </IconButton>
                <Menu
                  anchorEl={windowMenuAnchorEl}
                  open={isWindowMenuOpen}
                  onClose={closeWindowMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                >
                  {sortedWindows.map((window) => (
                    <MenuItem
                      key={window.id}
                      selected={window.id === activeWindowId}
                      onClick={() => handleWindowChange(window.id)}
                    >
                      {`#${window.index} ${window.name || "(no name)"}`}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
              <Chip size="small" color="primary" variant="outlined" label={`API: ${API_LABEL}`} />
              {currentUser ? <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>{currentUser.slice(0, 1).toUpperCase()}</Avatar> : null}
              <IconButton color="primary" onClick={onLogout} aria-label="logout">
                <LogoutIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 0, minWidth: 0 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          {!detail ? (
            <Typography>loading...</Typography>
          ) : (
            <>
              <Box
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: (theme) => theme.zIndex.appBar,
                  mt: 0,
                  mb: 2,
                  backgroundColor: "#edf5ff",
                }}
              >
                <Tabs
                  value={activeTabsValue}
                  onChange={(_, value) => handlePaneTabChange(String(value))}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ px: 1, borderBottom: "1px solid #D8E2EE" }}
                >
                  {tabs.map((pane) => {
                    const isActive = pane.id === (activePaneId || detail.pane.id);
                    return (
                      <Tab
                        key={pane.id}
                        value={pane.id}
                        icon={titleIcon(pane.title, { active: isActive })}
                        iconPosition="start"
                        label={pane.title || pane.id}
                        sx={{ textTransform: "none" }}
                      />
                    );
                  })}
                </Tabs>
              </Box>

              <Card sx={{ minWidth: 0 }}>
              <CardContent>
                <Accordion
                  expanded={paneInfoExpanded}
                  onChange={(_, expanded) => setPaneInfoExpanded(expanded)}
                  disableGutters
                  sx={{
                    mb: 2,
                    boxShadow: "none",
                    border: "none",
                    background: "transparent",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Pane Info</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      <Chip label={`session ${detail.session.name}`} />
                      <Chip label={`window #${detail.window.index} ${detail.window.name}`} />
                      <Chip label={`pane No.${detail.pane.index}`} color="primary" />
                      <Chip label={detail.pane.id} />
                      {detail.pane.active ? <Chip label="active" color="primary" /> : null}
                      <Chip label={`pid ${detail.pane.pid}`} />
                    </Stack>
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>cmd: {detail.pane.current_command}</Typography>
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>path: {detail.pane.current_path}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ overflowWrap: "anywhere" }}>
                      {titleIcon(detail.pane.title)}
                      <Typography variant="body2">title: {detail.pane.title}</Typography>
                    </Stack>
                    {detail.pane.process.command ? <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>process: {detail.pane.process.command}</Typography> : null}
                  </AccordionDetails>
                </Accordion>

                <Typography variant="h6" sx={{ mb: 1 }}>Current Output</Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    minWidth: 0,
                    fontFamily: "monospace",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    maxHeight: 560,
                    overflowX: "hidden",
                    overflowY: "auto",
                    background: "#FCFDFF",
                    mb: 2,
                  }}
                >
                  {detail.output || "(empty)"}
                </Paper>

                <Typography variant="body2" sx={{ mb: 1.5, overflowWrap: "anywhere" }}>
                  target pane: <strong>{targetPaneId}</strong>
                </Typography>

                <Stack component="form" direction="column" spacing={1} onSubmit={onSendKeys}>
                  <TextField
                    size="small"
                    label="keys"
                    multiline
                    minRows={3}
                    value={keys}
                    onChange={(e) => setKeys(e.target.value)}
                    onFocus={() => setIsKeysFocused(true)}
                    onBlur={() => setIsKeysFocused(false)}
                    inputRef={keysInputRef}
                    slotProps={{
                      htmlInput: {
                        autoCapitalize: "none",
                        autoCorrect: "off",
                        autoComplete: "off",
                        spellCheck: false,
                      },
                    }}
                    fullWidth
                    placeholder="Enter"
                  />
                  <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 1 }}>
                    <Button type="submit" variant="contained" fullWidth disabled={!allowed.has("send_keys") || busy}>send key</Button>
                    <Button type="button" variant="contained" color="error" fullWidth disabled={!allowed.has("send_keys") || busy} onClick={onClearPrompt}>clear</Button>
                  </Box>
                  <Button type="button" variant="outlined" fullWidth disabled={!allowed.has("send_keys") || busy} onClick={onSendEnter}>send enter</Button>
                </Stack>
                </CardContent>
              </Card>
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
