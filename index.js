const arg = require("arg");
const ora = require("ora");
const chalk = require("chalk");
const { chromium } = require("playwright");
const Sitemapper = require("sitemapper");
const sitemap = new Sitemapper();

const args = arg({
  "--help": Boolean,
  "--url": String // --url <string> or --url=<string>
});

const spinner = ora("Fetching sitemap").start();

const logUrl = url => {
  console.log(chalk`
  {magenta.bold ${url}}`);
};

const logViolation = violation => {
  console.log(chalk`
  {red ${violation.impact.toUpperCase()}}
  {cyan ${violation.id}}: {white ${violation.description}}`);
  for (const node of violation.nodes) {
    console.log(chalk`      {white.bold ${node}}`);
  }
};

const sortViolationsBySeverity = violations => {
  const sortedViolations = [...violations];
  sortedViolations.sort((a, b) => {
    const impacts = ["SERIOUS", "MODERATE", "MINOR"];
    const indexOfA = a.impact ? impacts.indexOf(a.impact.toUpperCase()) : 3;
    const indexOfB = b.impact ? impacts.indexOf(b.impact.toUpperCase()) : 3;
    return indexOfA > indexOfB ? 1 : -1;
  });
  return sortedViolations;
};

const fetchSitemapUrls = async baseUrl => {
  const { sites } = await sitemap.fetch(`${baseUrl}/sitemap.xml`);
  const maxSites = Math.min(sites.length, 10);
  //TODO: sort by sitemap priority
  //TODO: if no sitemap, return baseUrl
  return sites.slice(0, maxSites);
};

const printResults = toalViolationsByPage => {
  for (const violationByPage of toalViolationsByPage) {
    if (violationByPage.violations.length > 0) {
      logUrl(violationByPage.url);
      const sortedViolations = sortViolationsBySeverity(
        violationByPage.violations
      );
      for (const violation of sortedViolations) {
        logViolation(violation);
      }
    }
  }
};

(async () => {
  const baseUrl = args["--url"];
  const sitemapUrls = await fetchSitemapUrls(baseUrl);
  const toalViolationsByPage = [];
  for (const url of sitemapUrls) {
    spinner.text = `Running accessibility checks on ${url}`;
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
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
    toalViolationsByPage.push({ url, ...axeViolations });
    await browser.close();
  }
  spinner.stop();
  printResults(toalViolationsByPage);
})();
