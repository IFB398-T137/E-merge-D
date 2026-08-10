const CLIENT_ID = process.env.MS_CLIENT_ID || "73add89f-a195-4a8a-9397-783d3c37489d";
const TENANT = process.env.MS_TENANT_ID || "common";

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT}`,
  },
};

const GRAPH_SCOPES = ["User.Read", "Mail.ReadWrite"];

module.exports = {
  msalConfig,
  GRAPH_SCOPES,
};
