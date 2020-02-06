const arg = require("arg");
const ora = require("ora");
const prettyjson = require("prettyjson");
const { chromium } = require("playwright");
const Sitemapper = require("sitemapper");
const sitemap = new Sitemapper();

const args = arg({
  "--help": Boolean,
  "--url": String // --url <string> or --url=<string>
});

const spinner = ora("Fetching sitemap").start();

(async () => {
  const url = args["--url"];
  const { sites } = await sitemap.fetch(`${url}/sitemap.xml`);
  const maxSites = Math.min(sites.length, 5);
  const runOnSites = sites.slice(0, maxSites);
  const violations = [];
  for (const site of runOnSites) {
    spinner.text = `Running accessibility checks on ${site}`;
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(site);
    await page.addScriptTag({
      url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/3.4.1/axe.min.js"
    });
    const axeViolations = await page.evaluate(async () => {
      const axeResults = await new Promise((resolve, reject) => {
        window.axe.run((err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(results);
          }
        });
      });

      return {
        violations: axeResults.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes.map(node => node.html)
        }))
      };
    });
    violations.push({ url: site, ...axeViolations });
    await browser.close();
  }
  spinner.stop();
  for (const violationSet of violations) {
    if (violationSet.violations.length > 0) {
      console.log(
        prettyjson.render(violationSet.url, {
          keysColor: "magenta",
          stringColor: "magenta"
        })
      );
      for (const violation of violationSet.violations) {
        console.log(
          prettyjson.render(violation, {
            dashColor: "magenta",
            stringColor: "white",
            multilineStringColor: "cyan"
          })
        );
      }
      console.log("\n");
    }
  }
})();
