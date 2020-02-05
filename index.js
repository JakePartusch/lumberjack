const { chromium } = require("playwright");
const Sitemapper = require("sitemapper");

const sitemap = new Sitemapper();

(async () => {
  const { sites } = await sitemap.fetch("https://jake.partus.ch/sitemap.xml");
  const maxSites = Math.min(sites.length, 5);
  const runOnSites = sites.slice(0, maxSites);
  const violations = [];
  for (const site of runOnSites) {
    console.log(`Running axe on ${site}`);
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(site);
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/3.4.1/axe.min.js"
    });
    const axeViolations = await page.evaluate(async () => {
      const axeResuls = await new Promise((resolve, reject) => {
        window.axe.run((err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });
      return {
        violations: axeResuls.violations
      };
    });
    violations.push({ url: site, ...axeViolations });
    await browser.close();
  }
  console.log(violations);
})();
