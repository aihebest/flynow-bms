/**
 * get-sharepoint-ids.js
 * Discovers the SharePoint Site ID and Document Library Drive ID
 * needed for the SHAREPOINT_SITE_ID and SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID
 * environment variables in Azure App Service.
 *
 * Prerequisites:
 *   1. The App Registration used for GRAPH_CLIENT_ID must have these
 *      APPLICATION permissions (not delegated) with Admin Consent granted:
 *        - Sites.ReadWrite.All
 *        - Files.ReadWrite.All
 *
 * Usage (PowerShell):
 *   $env:GRAPH_TENANT_ID   = "your-tenant-id"
 *   $env:GRAPH_CLIENT_ID   = "your-graph-app-client-id"
 *   $env:GRAPH_CLIENT_SECRET = "your-graph-app-client-secret"
 *   node backend/db/get-sharepoint-ids.js
 */

const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require(
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
);

const TENANT_ID     = process.env.GRAPH_TENANT_ID;
const CLIENT_ID     = process.env.GRAPH_CLIENT_ID;
const CLIENT_SECRET = process.env.GRAPH_CLIENT_SECRET;

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  Set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET first.');
  process.exit(1);
}

const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});
const graph = Client.initWithMiddleware({ authProvider });

async function main() {
  console.log('🔍  Discovering SharePoint sites and document libraries…\n');

  // ── 1. List all sites ───────────────────────────────────────────────────────
  let sites;
  try {
    const resp = await graph.api('/sites?search=*').get();
    sites = resp.value;
  } catch (err) {
    console.error('❌  Failed to list sites:', err.message);
    console.error('    Make sure the app has Sites.ReadWrite.All application permission with admin consent.');
    process.exit(1);
  }

  console.log(`Found ${sites.length} SharePoint site(s):\n`);
  sites.forEach((s, i) => {
    console.log(`  [${i + 1}] Name: ${s.displayName}`);
    console.log(`       URL:  ${s.webUrl}`);
    console.log(`       ID:   ${s.id}\n`);
  });

  // ── 2. For each site, list drives (document libraries) ──────────────────────
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Document Libraries (Drives) per site:\n');

  for (const site of sites) {
    let drives;
    try {
      const dr = await graph.api(`/sites/${site.id}/drives`).get();
      drives = dr.value;
    } catch {
      continue;
    }

    if (!drives.length) continue;
    console.log(`  Site: ${site.displayName} (${site.webUrl})`);
    drives.forEach(d => {
      console.log(`    Drive: ${d.name}`);
      console.log(`    ID:    ${d.id}\n`);
    });
  }

  console.log('─────────────────────────────────────────────────────────────');
  console.log('\n📋  Copy the values above and set them in Azure App Service:');
  console.log('    SHAREPOINT_SITE_ID              = <site id from above>');
  console.log('    SHAREPOINT_CUSTOMER_DOCS_DRIVE_ID = <drive id from above>\n');
  console.log('    Use the site where you want FlyNow BMS to store documents.');
  console.log('    Use the "Documents" drive (default document library) or create');
  console.log('    a dedicated "FlyNow BMS Docs" library and use its drive ID.\n');
}

main().catch(err => {
  console.error('❌  Unexpected error:', err.message);
  process.exit(1);
});
