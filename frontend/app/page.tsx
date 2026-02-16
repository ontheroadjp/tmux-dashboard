"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import HubIcon from "@mui/icons-material/Hub";
import LanIcon from "@mui/icons-material/Lan";
import BoltIcon from "@mui/icons-material/Bolt";
import { API_BASE, fetchSnapshot, postAction, type Snapshot } from "../lib/api";

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
    h4: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
});

export default function Page() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [targetPane, setTargetPane] = useState("");
  const [keys, setKeys] = useState("Enter");
  const [targetWindow, setTargetWindow] = useState("");
  const [targetSession, setTargetSession] = useState("");

  async function load() {
    try {
      setError("");
      const data = await fetchSnapshot();
      setSnapshot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to fetch snapshot");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  async function runAction(action: string, payload: Record<string, unknown>) {
    try {
      setBusy(true);
      setError("");
      await postAction(action, payload);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    } finally {
      setBusy(false);
    }
  }

  function onSendKeys(e: FormEvent) {
    e.preventDefault();
    runAction("send_keys", { target_pane: targetPane, keys });
  }

  function onSelectWindow(e: FormEvent) {
    e.preventDefault();
    runAction("select_window", { target_window: targetWindow });
  }

  function onSwitchSession(e: FormEvent) {
    e.preventDefault();
    runAction("switch_client", { target_session: targetSession });
  }

  const allowed = useMemo(() => new Set(snapshot?.allowed_actions ?? []), [snapshot?.allowed_actions]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", pb: 6, background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)" }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: "blur(8px)", borderBottom: "1px solid #D8E2EE" }}>
          <Toolbar sx={{ gap: 1 }}>
            <TerminalIcon color="primary" />
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              tmux dashboard
            </Typography>
            <Chip size="small" color="primary" variant="outlined" label={`API: ${API_BASE}`} />
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" } }}>
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

            <Box>
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
                    {snapshot?.tmux.sessions.map((session) => (
                      <Paper key={session.name} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle1">{session.name}</Typography>
                          {session.attached ? <Chip size="small" color="success" label="attached" /> : null}
                        </Stack>

                        <Stack spacing={1}>
                          {session.windows.map((window) => (
                            <Paper key={window.id} variant="outlined" sx={{ p: 1.25, bgcolor: "#FAFBFD" }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle2">#{window.index} {window.name}</Typography>
                                {window.active ? <Chip size="small" color="primary" label="active" /> : null}
                              </Stack>
                              <Stack spacing={0.75}>
                                {window.panes.map((pane) => (
                                  <Paper key={pane.id} variant="outlined" sx={{ p: 1, bgcolor: "#FFFFFF" }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                      <Typography variant="body2">pane {pane.id}</Typography>
                                      {pane.active ? <Chip size="small" color="primary" label="active" /> : null}
                                      <Chip size="small" label={`pid ${pane.pid}`} />
                                    </Stack>
                                    <Typography variant="body2">cmd: {pane.current_command}</Typography>
                                    <Typography variant="body2">path: {pane.current_path}</Typography>
                                    <Typography variant="body2">title: {pane.title}</Typography>
                                    {pane.process.command ? <Typography variant="body2">process: {pane.process.command}</Typography> : null}
                                  </Paper>
                                ))}
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box>
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

              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>Actions</Typography>

                  <Stack component="form" spacing={1} onSubmit={onSendKeys} sx={{ mb: 2 }}>
                    <TextField size="small" label="target pane" value={targetPane} onChange={(e) => setTargetPane(e.target.value)} placeholder="%1" />
                    <TextField size="small" label="keys" value={keys} onChange={(e) => setKeys(e.target.value)} placeholder="Enter" />
                    <Button type="submit" variant="contained" disabled={!allowed.has("send_keys") || busy}>send_keys</Button>
                  </Stack>

                  <Stack component="form" spacing={1} onSubmit={onSelectWindow} sx={{ mb: 2 }}>
                    <TextField size="small" label="target window" value={targetWindow} onChange={(e) => setTargetWindow(e.target.value)} placeholder="session:1" />
                    <Button type="submit" variant="contained" disabled={!allowed.has("select_window") || busy}>select_window</Button>
                  </Stack>

                  <Stack component="form" spacing={1} onSubmit={onSwitchSession} sx={{ mb: 2 }}>
                    <TextField size="small" label="target session" value={targetSession} onChange={(e) => setTargetSession(e.target.value)} placeholder="session-name" />
                    <Button type="submit" variant="contained" disabled={!allowed.has("switch_client") || busy}>switch_client</Button>
                  </Stack>

                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Button size="small" variant="outlined" onClick={() => runAction("kill_pane", { target_pane: targetPane })} disabled={!allowed.has("kill_pane") || busy}>kill_pane</Button>
                    <Button size="small" variant="outlined" onClick={() => runAction("kill_window", { target_window: targetWindow })} disabled={!allowed.has("kill_window") || busy}>kill_window</Button>
                    <Button size="small" variant="outlined" onClick={() => runAction("kill_session", { target_session: targetSession })} disabled={!allowed.has("kill_session") || busy}>kill_session</Button>
                    <Button size="small" variant="outlined" onClick={() => runAction("new_window", { target_session: targetSession })} disabled={!allowed.has("new_window") || busy}>new_window</Button>
                    <Button size="small" variant="outlined" onClick={() => runAction("split_window", { target_pane: targetPane, direction: "vertical" })} disabled={!allowed.has("split_window") || busy}>split_window</Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
