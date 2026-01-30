#!/usr/bin/env node

/**
 * Script pour tester le token Webflow et ses permissions
 */

const TOKEN = process.env.WEBFLOW_TOKEN;

async function testToken() {
  console.log("🔑 Test du token Webflow...\n");

  try {
    if (!TOKEN) {
      console.error("❌ WEBFLOW_TOKEN manquant.");
      console.log("\n📋 Définis la variable d'environnement :");
      console.log("   export WEBFLOW_TOKEN=ton_token");
      process.exit(1);
    }

    const response = await fetch("https://api.webflow.com/v2/sites", {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        accept: "application/json",
      },
    });

    console.log(`📡 Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Token valide!\n");
      console.log(`📊 Sites trouvés: ${data.sites?.length || 0}\n`);

      if (data.sites && data.sites.length > 0) {
        data.sites.forEach((site) => {
          console.log(`  - ${site.displayName}`);
          console.log(`    ID: ${site.id}`);
          console.log(`    URL: ${site.shortName}.webflow.io\n`);
        });
      }
    } else {
      const error = await response.json();
      console.error("❌ Erreur:", error);

      if (error.code === "missing_scopes") {
        console.log("\n⚠️  Le token n'a pas les bonnes permissions.");
        console.log("\n📋 Pour créer un nouveau token:");
        console.log(
          "1. Va sur https://webflow.com/dashboard/account/applications",
        );
        console.log('2. Clique "Create App"');
        console.log("3. Coche ces scopes:");
        console.log("   ✅ sites:read");
        console.log("   ✅ cms:read");
        console.log("   ✅ cms:write");
        console.log("4. Copie le token généré");
        console.log("5. Remplace-le dans .vscode/mcp.json");
      }
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error.message);
  }
}

testToken();
