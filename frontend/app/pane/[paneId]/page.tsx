"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
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
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import LogoutIcon from "@mui/icons-material/Logout";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import VpnLockIcon from "@mui/icons-material/VpnLock";
import DnsIcon from "@mui/icons-material/Dns";
import { API_LABEL, fetchPaneDetail, fetchSession, fetchSnapshot, logout, postAction, type PaneDetail } from "../../../lib/api";

const POLL_MS = 3000;

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#00639A" },
    secondary: { main: "#6D5E0F" },
    error: { main: "#B3261E" },
    background: {
      default: "#F7F9FC",
      paper: "#FFFFFF",
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Roboto", "Noto Sans JP", sans-serif',
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

function titleIcon(title?: string): ReactNode {
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

export default function PanePage() {
  const params = useParams<{ paneId: string }>();
  const router = useRouter();
  const paneIdParam = decodeURIComponent(params.paneId ?? "");

  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [detail, setDetail] = useState<PaneDetail | null>(null);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [keys, setKeys] = useState("");
  const [isKeysFocused, setIsKeysFocused] = useState(false);
  const keysInputRef = useRef<HTMLInputElement | null>(null);

  const allowed = useMemo(() => new Set(allowedActions), [allowedActions]);

  async function load() {
    if (!paneIdParam) {
      setError("paneId is required");
      return;
    }

    try {
      setError("");
      const [paneDetail, snapshot] = await Promise.all([fetchPaneDetail(paneIdParam), fetchSnapshot()]);
      setDetail(paneDetail);
      setAllowedActions(snapshot.allowed_actions);
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
    load();
    const timer = window.setInterval(() => {
      if (!isKeysFocused) {
        load();
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, paneIdParam, isKeysFocused]);

  async function runAction(action: string, payload: Record<string, unknown>) {
    try {
      setBusy(true);
      setError("");
      await postAction(action, payload);
      await load();
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
    if (!detail) {
      return;
    }
    const payloadKeys = keys.trim() === "" ? "C-u" : keys;
    runAction("send_keys", { target_pane: detail.pane.id, keys: payloadKeys });
  }

  function onSendEnter() {
    if (!detail) {
      return;
    }
    runAction("send_keys", { target_pane: detail.pane.id, keys: "Enter" });
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

  if (!authReady) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)" }}>
          <Typography>loading...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", pb: 6, background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)" }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: "blur(8px)", borderBottom: "1px solid #D8E2EE" }}>
          <Container maxWidth="xl" sx={{ minWidth: 0 }}>
            <Toolbar sx={{ gap: 1 }}>
              <IconButton color="primary" onClick={() => router.push("/")} aria-label="go to top">
                <TerminalIcon />
              </IconButton>
              <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                pane detail
              </Typography>
              {currentUser ? <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.main", fontSize: 13 }}>{currentUser.slice(0, 1).toUpperCase()}</Avatar> : null}
              <IconButton color="primary" onClick={onLogout} aria-label="logout">
                <LogoutIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3, minWidth: 0 }}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
            <Chip size="small" color="primary" variant="outlined" label={`API: ${API_LABEL}`} />
          </Stack>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          {!detail ? (
            <Typography>loading...</Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr", minWidth: 0 }}>
              <Box sx={{ minWidth: 0 }}>
                <Card sx={{ mb: 2, minWidth: 0 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Pane Info</Typography>
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
                  </CardContent>
                </Card>

                <Card sx={{ minWidth: 0 }}>
                  <CardContent>
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
                      target pane: <strong>{detail.pane.id}</strong>
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
              </Box>

            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}
