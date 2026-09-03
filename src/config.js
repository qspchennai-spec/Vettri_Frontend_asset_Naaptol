// Centralized environment configuration.
//
// API_BASE previously lived as a hardcoded literal copied into 29+ files
// across the app — meaning every environment (local dev, staging, a future
// white-label deployment) required manually editing every one of those
// files. This is now the single source of truth: set REACT_APP_API_URL in
// your environment (e.g. .env.local for local dev pointing at
// http://localhost:8080) and every page picks it up automatically. The
// literal below is kept only as the fallback for existing deployments that
// haven't set the env var yet, so nothing breaks on first upgrade.
export const API_BASE =
  process.env.REACT_APP_API_URL || "https://vettri-backend-asset-naaptol.onrender.com";

// OAuth 2.0 Web Client ID from Google Cloud Console (Credentials -> OAuth
// client ID -> Web application). Must match app.google.client-id on the
// backend — GoogleTokenVerifier rejects any token whose audience doesn't
// equal that same value. Required for the "Continue with Google" button;
// left unset, that button is hidden rather than shown broken.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

// Branding / build-time overrides for the Vettri Asset Naaptol deployment.
export const COMPANY_NAME = process.env.REACT_APP_COMPANY_NAME || "Vettri";
export const COMPANY_DISPLAY = process.env.REACT_APP_COMPANY_DISPLAY || "Vettri Asset";
export const COMPANY_SUBTITLE = process.env.REACT_APP_COMPANY_SUBTITLE || "IT Asset Management";

// Naaptol does not have the AWS/infrastructure required by these features.
// Other client deployments remain enabled by setting REACT_APP_CLIENT.
export const CLIENT_ID = (process.env.REACT_APP_CLIENT || "naaptol").toLowerCase();
export const CLIENT_FEATURES = {
  serviceBilling: CLIENT_ID !== "naaptol",
  pulse: CLIENT_ID !== "naaptol",
};
export const VETTRI_CONTACT_EMAIL = process.env.REACT_APP_VETTRI_CONTACT_EMAIL || "support@vettri.com";

// Public asset paths can still be overridden per deployment.
export const PAY_LOGO_PATH = process.env.REACT_APP_PAY_LOGO_PATH || "/vettri-pay-logo.png";
export const WALLET_ICON_PATH = process.env.REACT_APP_WALLET_ICON_PATH || "/vettri-pay-logo.png";
export const GROUP_LOGO_PATH = process.env.REACT_APP_GROUP_LOGO_PATH || "/vettri-pay-logo.png";
export const ICON_PATH = process.env.REACT_APP_ICON_PATH || "/vettri-pay-logo.png";
