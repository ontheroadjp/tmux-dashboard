"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  IconButton,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import HubIcon from "@mui/icons-material/Hub";
import LanIcon from "@mui/icons-material/Lan";
import BoltIcon from "@mui/icons-material/Bolt";
import LogoutIcon from "@mui/icons-material/Logout";
import { API_LABEL, fetchSession, fetchSnapshot, login, logout, type Snapshot } from "../lib/api";

const POLL_MS = 3000;

function sessionOrder(name: string): [number, string] {
  const m = name.match(/\d+/);
  if (!m) {
    return [Number.POSITIVE_INFINITY, name];
  }
  return [Number.parseInt(m[0], 10), name];
}

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
    h4: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

export default function Page() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>("");
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [loginUser, setLoginUser] = useState<string>("");
  const [loginPass, setLoginPass] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  const [selectedSessionName, setSelectedSessionName] = useState("");
  const [selectedWindowId, setSelectedWindowId] = useState("");
  const router = useRouter();

  async function load() {
    try {
      setError("");
      const data = await fetchSnapshot();
      setSnapshot(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "failed to fetch snapshot";
      if (message === "unauthorized") {
        setIsAuthenticated(false);
        setCurrentUser("");
        setSnapshot(null);
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
  }, [isAuthenticated]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginUser.trim() || !loginPass.trim()) {
      setLoginError("ユーザー名とパスワードを入力してください。");
      return;
    }
    try {
      setAuthBusy(true);
      setLoginError("");
      const result = await login(loginUser.trim(), loginPass.trim());
      setIsAuthenticated(true);
      setCurrentUser(result.user);
      setLoginPass("");
      setSnapshot(null);
      await load();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "login failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    setIsAuthenticated(false);
    setCurrentUser("");
    setSnapshot(null);
  }

  const sortedSessions = useMemo(() => {
    const sessions = snapshot?.tmux.sessions ?? [];
    return [...sessions].sort((a, b) => {
      const [aNum, aName] = sessionOrder(a.name);
      const [bNum, bName] = sessionOrder(b.name);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
      return aName.localeCompare(bName);
    });
  }, [snapshot?.tmux.sessions]);

  const selectedSession = useMemo(
    () => sortedSessions.find((session) => session.name === selectedSessionName) ?? null,
    [sortedSessions, selectedSessionName]
  );

  const sortedWindows = useMemo(() => {
    const windows = selectedSession?.windows ?? [];
    return [...windows].sort((a, b) => a.index - b.index);
  }, [selectedSession]);

  const selectedWindow = useMemo(
    () => sortedWindows.find((window) => window.id === selectedWindowId) ?? null,
    [sortedWindows, selectedWindowId]
  );

  useEffect(() => {
    if (!sortedSessions.length) {
      if (selectedSessionName) {
        setSelectedSessionName("");
      }
      if (selectedWindowId) {
        setSelectedWindowId("");
      }
      return;
    }

    const sessionExists = sortedSessions.some((session) => session.name === selectedSessionName);
    const nextSessionName = sessionExists ? selectedSessionName : sortedSessions[0].name;
    if (nextSessionName !== selectedSessionName) {
      setSelectedSessionName(nextSessionName);
    }

    const currentSession = sortedSessions.find((session) => session.name === nextSessionName);
    const windows = [...(currentSession?.windows ?? [])].sort((a, b) => a.index - b.index);

    if (!windows.length) {
      if (selectedWindowId) {
        setSelectedWindowId("");
      }
      return;
    }

    const windowExists = windows.some((window) => window.id === selectedWindowId);
    const nextWindowId = windowExists ? selectedWindowId : windows[0].id;
    if (nextWindowId !== selectedWindowId) {
      setSelectedWindowId(nextWindowId);
    }
  }, [sortedSessions, selectedSessionName, selectedWindowId]);

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
          <Card sx={{ width: "100%", maxWidth: 420 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <TerminalIcon color="primary" />
                <Typography variant="h6">tmux dashboard login</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                ダッシュボードを表示するにはログインしてください。
              </Typography>
              {loginError ? <Alert severity="error" sx={{ mb: 1 }}>{loginError}</Alert> : null}
              <Stack component="form" spacing={1.5} onSubmit={onLogin}>
                <TextField
                  size="small"
                  label="user"
                  autoComplete="username"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
                <TextField
                  size="small"
                  label="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
                <Button type="submit" variant="contained" disabled={authBusy}>
                  {authBusy ? "logging in..." : "login"}
                </Button>
              </Stack>
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
                tmux dashboard
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

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, minWidth: 0 }}>
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <BoltIcon color="secondary" />
                    <Typography variant="h6">Allowed Actions</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {snapshot?.allowed_actions.map((item) => (
                      <Chip key={item} label={item} color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <HubIcon color="primary" />
                    <Typography variant="h6">tmux</Typography>
                  </Stack>
                  {!snapshot ? <Typography>loading...</Typography> : null}
                  {snapshot?.tmux.available === false ? <Alert severity="warning">tmux not available</Alert> : null}
                  {snapshot?.tmux.running === false ? <Alert severity="info">{snapshot.tmux.error || "tmux server is not running"}</Alert> : null}

                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1,
                        gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(auto-fill, minmax(180px, 1fr))" },
                        minWidth: 0,
                      }}
                    >
                      {sortedSessions.map((session) => (
                        <Card
                          key={session.name}
                          variant={session.name === selectedSessionName ? "elevation" : "outlined"}
                          sx={{
                            cursor: "pointer",
                            borderColor: session.name === selectedSessionName ? "primary.main" : "divider",
                            bgcolor: session.name === selectedSessionName ? "#00639A" : "background.paper",
                            color: session.name === selectedSessionName ? "#FFFFFF" : "text.primary",
                          }}
                          onClick={() => {
                            setSelectedSessionName(session.name);
                            const minWindow = [...session.windows].sort((a, b) => a.index - b.index)[0];
                            setSelectedWindowId(minWindow?.id ?? "");
                          }}
                        >
                          <CardContent sx={{ pb: "16px !important" }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle2">{session.name}</Typography>
                              {session.attached ? <Chip size="small" color="success" label="attached" /> : null}
                            </Stack>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              windows: {session.window_count}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>

                    {selectedSession ? (
                      <Paper variant="outlined" sx={{ p: 1.25, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          session: {selectedSession.name}
                        </Typography>

                        <Tabs
                          value={selectedWindowId || false}
                          onChange={(_, value) => setSelectedWindowId(String(value))}
                          variant="scrollable"
                          scrollButtons="auto"
                          sx={{ mb: 1 }}
                        >
                          {sortedWindows.map((window) => (
                            <Tab key={window.id} value={window.id} label={`#${window.index} ${window.name}`} />
                          ))}
                        </Tabs>

                        {selectedWindow ? (
                          <Stack spacing={0.75}>
                            {selectedWindow.panes.map((pane) => (
                              <Paper
                                key={pane.id}
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  minWidth: 0,
                                  bgcolor: "#FFFFFF",
                                  cursor: "pointer",
                                  "&:hover": { borderColor: "primary.main" },
                                }}
                                onClick={() => router.push(`/pane/${encodeURIComponent(pane.id)}`)}
                              >
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <Typography variant="body2">pane No.{pane.index}</Typography>
                                  <Chip size="small" label={pane.id} />
                                  {pane.active ? <Chip size="small" color="primary" label="active" /> : null}
                                  <Chip size="small" label={`pid ${pane.pid}`} />
                                </Stack>
                                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                  cmd: {pane.current_command}
                                </Typography>
                                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                  path: {pane.current_path}
                                </Typography>
                                <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                  title: {pane.title}
                                </Typography>
                                {pane.process.command ? (
                                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                                    process: {pane.process.command}
                                  </Typography>
                                ) : null}
                              </Paper>
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="body2">window not selected</Typography>
                        )}
                      </Paper>
                    ) : (
                      <Typography variant="body2">session not selected</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <LanIcon color="primary" />
                    <Typography variant="h6">Network</Typography>
                  </Stack>

                  <Typography variant="subtitle2">Listening Servers</Typography>
                  <List dense>
                    {snapshot?.network.listening_servers.map((item, idx) => (
                      <ListItem key={`${item.pid}-${idx}`} disableGutters>
                        <ListItemText primary={`${item.command} (${item.pid})`} secondary={`${item.user} ${item.address}`} />
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2">SSH Connections</Typography>
                  <List dense>
                    {snapshot?.network.ssh_connections.map((item) => (
                      <ListItem key={item.pid} disableGutters>
                        <ListItemText primary={`pid ${item.pid}`} secondary={item.command} />
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2">SSH Tunnels</Typography>
                  <List dense>
                    {snapshot?.network.ssh_tunnels.map((item) => (
                      <ListItem key={item.pid} disableGutters>
                        <ListItemText primary={`pid ${item.pid}`} secondary={item.command} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
