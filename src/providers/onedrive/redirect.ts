import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

void broadcastResponseToMainFrame().catch(() => {
  document.body.textContent = "OneDrive sign-in could not be completed.";
});
