"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
} from "@mui/material";
import TerminalIcon from "@mui/icons-material/Terminal";
import LogoutIcon from "@mui/icons-material/Logout";
import { fetchSession, logout } from "../../lib/api";
import {
  createCertLink,
  createCertRequest,
  listCertAudit,
  listCertDevices,
  listCertLinks,
  listCertRequests,
  markCertIssued,
  revokeCertLink,
} from "../../lib/certDashboardApi";
import { dashboardTheme } from "../../lib/theme";

export default function CertDashboardPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const [newDeviceName, setNewDeviceName] = useState("");
  const [newPlatform, setNewPlatform] = useState("ios");
  const [newNote, setNewNote] = useState("");

  const [issueRequestId, setIssueRequestId] = useState("");
  const [issueCn, setIssueCn] = useState("");
  const [issueIssuedAt, setIssueIssuedAt] = useState("");
  const [issueExpiresAt, setIssueExpiresAt] = useState("");

  const [linkRequestId, setLinkRequestId] = useState("");
  const [linkExpiresSec, setLinkExpiresSec] = useState("600");
  const [linkNote, setLinkNote] = useState("");

  async function loadAll() {
    const [deviceList, requestList, linkList, auditList] = await Promise.all([
      listCertDevices(),
      listCertRequests(),
      listCertLinks(),
      listCertAudit(),
    ]);
    setDevices(deviceList);
    setRequests(requestList);
    setLinks(linkList);
    setAudit(auditList.slice(0, 20));
  }

  useEffect(() => {
    async function init() {
      try {
        const session = await fetchSession();
        setIsAuthenticated(session.authenticated);
        if (session.authenticated) {
          await loadAll();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to load");
      } finally {
        setAuthReady(true);
      }
    }
    init();
  }, []);

  async function onCreateRequest(e: FormEvent) {
    e.preventDefault();
    if (!newDeviceName.trim()) {
      setError("device_name is required");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await createCertRequest({
        device_name: newDeviceName.trim(),
        platform: newPlatform.trim(),
        note: newNote.trim(),
      });
      setNewDeviceName("");
      setNewNote("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "request create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onMarkIssued(e: FormEvent) {
    e.preventDefault();
    if (!issueRequestId.trim() || !issueCn.trim() || !issueIssuedAt.trim() || !issueExpiresAt.trim()) {
      setError("request_id, cert_cn, issued_at, expires_at are required");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await markCertIssued({
        request_id: issueRequestId.trim(),
        cert_cn: issueCn.trim(),
        issued_at: issueIssuedAt.trim(),
        expires_at: issueExpiresAt.trim(),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "mark issued failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateLink(e: FormEvent) {
    e.preventDefault();
    if (!linkRequestId.trim()) {
      setError("request_id is required");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await createCertLink({
        request_id: linkRequestId.trim(),
        expires_in_sec: Number(linkExpiresSec) || 600,
        note: linkNote.trim(),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create link failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRevokeLink(linkId: string) {
    try {
      setBusy(true);
      setError("");
      await revokeCertLink(linkId);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "revoke failed");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    router.push("/");
  }

  if (!authReady) {
    return <Typography sx={{ p: 3 }}>loading...</Typography>;
  }

  if (!isAuthenticated) {
    return <Typography sx={{ p: 3 }}>unauthorized</Typography>;
  }

  return (
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #EDF5FF 0%, #F7F9FC 65%)", pb: 6 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: "1px solid #D8E2EE" }}>
          <Container maxWidth="xl">
            <Toolbar>
              <IconButton color="primary" onClick={() => router.push("/")}>
                <TerminalIcon />
              </IconButton>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Certificate Dashboard (Phase 1)</Typography>
              <IconButton color="primary" onClick={onLogout}>
                <LogoutIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 2 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <Stack spacing={2}>
            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>New Request</Typography>
              <Stack component="form" direction={{ xs: "column", md: "row" }} gap={1} onSubmit={onCreateRequest}>
                <TextField size="small" label="device_name" value={newDeviceName} onChange={(e) => setNewDeviceName(e.target.value)} />
                <TextField size="small" label="platform" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} />
                <TextField size="small" label="note" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <Button type="submit" variant="contained" disabled={busy}>create</Button>
              </Stack>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Mark Issued (manual signing result)</Typography>
              <Stack component="form" direction={{ xs: "column", md: "row" }} gap={1} onSubmit={onMarkIssued}>
                <TextField size="small" label="request_id" value={issueRequestId} onChange={(e) => setIssueRequestId(e.target.value)} />
                <TextField size="small" label="cert_cn" value={issueCn} onChange={(e) => setIssueCn(e.target.value)} />
                <TextField size="small" label="issued_at (ISO8601)" value={issueIssuedAt} onChange={(e) => setIssueIssuedAt(e.target.value)} />
                <TextField size="small" label="expires_at (ISO8601)" value={issueExpiresAt} onChange={(e) => setIssueExpiresAt(e.target.value)} />
                <Button type="submit" variant="contained" disabled={busy}>mark issued</Button>
              </Stack>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Create Distribution Link (manual delivery)</Typography>
              <Stack component="form" direction={{ xs: "column", md: "row" }} gap={1} onSubmit={onCreateLink}>
                <TextField size="small" label="request_id" value={linkRequestId} onChange={(e) => setLinkRequestId(e.target.value)} />
                <TextField size="small" label="expires_in_sec" value={linkExpiresSec} onChange={(e) => setLinkExpiresSec(e.target.value)} />
                <TextField size="small" label="note" value={linkNote} onChange={(e) => setLinkNote(e.target.value)} />
                <Button type="submit" variant="contained" disabled={busy}>create link</Button>
              </Stack>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Devices</Typography>
              <Table size="small"><TableHead><TableRow><TableCell>name</TableCell><TableCell>cert_cn</TableCell><TableCell>issued</TableCell><TableCell>expires</TableCell><TableCell>status</TableCell></TableRow></TableHead><TableBody>
                {devices.map((d) => <TableRow key={d.id}><TableCell>{d.name}</TableCell><TableCell>{d.cert_cn}</TableCell><TableCell>{d.issued_at}</TableCell><TableCell>{d.expires_at}</TableCell><TableCell>{d.status}</TableCell></TableRow>)}
              </TableBody></Table>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Requests</Typography>
              <Table size="small"><TableHead><TableRow><TableCell>id</TableCell><TableCell>device</TableCell><TableCell>platform</TableCell><TableCell>status</TableCell><TableCell>requested_at</TableCell></TableRow></TableHead><TableBody>
                {requests.map((r) => <TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell>{r.device_name}</TableCell><TableCell>{r.platform}</TableCell><TableCell>{r.status}</TableCell><TableCell>{r.requested_at}</TableCell></TableRow>)}
              </TableBody></Table>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Links</Typography>
              <Table size="small"><TableHead><TableRow><TableCell>id</TableCell><TableCell>request_id</TableCell><TableCell>status</TableCell><TableCell>expires_at</TableCell><TableCell>path</TableCell><TableCell /></TableRow></TableHead><TableBody>
                {links.map((l) => <TableRow key={l.id}><TableCell>{l.id}</TableCell><TableCell>{l.request_id}</TableCell><TableCell>{l.status}</TableCell><TableCell>{l.expires_at}</TableCell><TableCell>{l.distribution_url_path}</TableCell><TableCell>{l.status === "active" ? <Button size="small" onClick={() => onRevokeLink(l.id)}>revoke</Button> : null}</TableCell></TableRow>)}
              </TableBody></Table>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Audit (latest 20)</Typography>
              <Table size="small"><TableHead><TableRow><TableCell>at</TableCell><TableCell>actor</TableCell><TableCell>action</TableCell><TableCell>target</TableCell><TableCell>detail</TableCell></TableRow></TableHead><TableBody>
                {audit.map((a) => <TableRow key={a.id}><TableCell>{a.at}</TableCell><TableCell>{a.actor}</TableCell><TableCell>{a.action}</TableCell><TableCell>{a.target_type}:{a.target_id}</TableCell><TableCell>{a.detail}</TableCell></TableRow>)}
              </TableBody></Table>
            </CardContent></Card>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
