import { createTheme } from "@mui/material";

export const dashboardTheme = createTheme({
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
