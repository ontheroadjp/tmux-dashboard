"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import BoltIcon from "@mui/icons-material/Bolt";
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
  const [keys, setKeys] = useState("Enter");

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
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, paneIdParam]);

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
    runAction("send_keys", { target_pane: detail.pane.id, keys });
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
          <Toolbar sx={{ gap: 1 }}>
            <TerminalIcon color="primary" />
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              pane detail
            </Typography>
            <Chip size="small" color="primary" variant="outlined" label={`API: ${API_LABEL}`} />
            {currentUser ? <Chip size="small" color="primary" label={currentUser} /> : null}
            <Button size="small" variant="outlined" onClick={() => router.push("/")}>top</Button>
            <Button size="small" variant="outlined" onClick={onLogout}>logout</Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          {!detail ? (
            <Typography>loading...</Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" } }}>
              <Box>
                <Card sx={{ mb: 2 }}>
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
                    <Typography variant="body2">cmd: {detail.pane.current_command}</Typography>
                    <Typography variant="body2">path: {detail.pane.current_path}</Typography>
                    <Typography variant="body2">title: {detail.pane.title}</Typography>
                    {detail.pane.process.command ? <Typography variant="body2">process: {detail.pane.process.command}</Typography> : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>Current Output</Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap", maxHeight: 560, overflow: "auto", background: "#FCFDFF" }}>
                      {detail.output || "(empty)"}
                    </Paper>
                  </CardContent>
                </Card>
              </Box>

              <Box>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <BoltIcon color="secondary" />
                      <Typography variant="h6">Actions</Typography>
                    </Stack>

                    <Typography variant="body2" sx={{ mb: 1.5 }}>
                      target pane: <strong>{detail.pane.id}</strong>
                    </Typography>

                    <Stack component="form" spacing={1} onSubmit={onSendKeys} sx={{ mb: 2 }}>
                      <TextField size="small" label="keys" value={keys} onChange={(e) => setKeys(e.target.value)} placeholder="Enter" />
                      <Button type="submit" variant="contained" disabled={!allowed.has("send_keys") || busy}>send_keys</Button>
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      <Button size="small" variant="outlined" onClick={() => runAction("select_pane", { target_pane: detail.pane.id })} disabled={!allowed.has("select_pane") || busy}>select_pane</Button>
                      <Button size="small" variant="outlined" onClick={() => runAction("split_window", { target_pane: detail.pane.id, direction: "vertical" })} disabled={!allowed.has("split_window") || busy}>split_window</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => runAction("kill_pane", { target_pane: detail.pane.id })} disabled={!allowed.has("kill_pane") || busy}>kill_pane</Button>
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
