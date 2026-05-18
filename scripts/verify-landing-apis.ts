
const BASE_URL = "http://localhost:4000";

const endpoints = [
  "/api/content/site-settings",
  "/api/content/navigation",
  "/api/content/hero",
  "/api/content/products",
  "/api/content/partners",
  "/api/content/voice-scenarios",
  "/api/content/automation-engines",
  "/api/content/capabilities",
  "/api/content/roi-industries",
  "/api/content/process-steps",
  "/api/content/product-features",
  "/api/content/callers",
  "/api/content/testimonials",
  "/api/content/faq",
  "/api/content/integrations",
  "/api/content/support-form",
  "/api/content/footer",
  "/api/content/rating-summary",
  "/api/content/section-config",
  "/api/content/home"
];

async function verify() {
  console.log("🚀 Starting API Verification...\n");
  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`✅ [200] ${endpoint}`);
        // Basic structure check
        if (json && (json.data !== undefined || Array.isArray(json))) {
           passed++;
        } else {
           console.log(`   ⚠️  Warning: Unexpected response structure for ${endpoint}`);
           failed++;
        }
      } else {
        console.log(`❌ [${res.status}] ${endpoint}`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ [ERR] ${endpoint}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Verification Summary: ${passed} passed, ${failed} failed.`);
}

verify();
