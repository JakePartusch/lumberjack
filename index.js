const { chromium } = require("playwright");
const Sitemapper = require("sitemapper");
const { chunks } = require("./src/util");

const MAX_PAGES = 100;

const fetchSitemapUrls = async baseUrl => {
  const sitemap = new Sitemapper();
  const { sites } = await sitemap.fetch(`${baseUrl}/sitemap.xml`);
  const maxSites = Math.min(sites.length, MAX_PAGES);
  //TODO: sort by sitemap priority
  if (maxSites === 0) {
    return [baseUrl];
  }
  return sites.slice(0, maxSites);
};

const runAccessibilityTestsOnUrl = async url => {
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
  await browser.close();
  return { url, ...axeViolations };
};

const runAllChecks = async (urls, spinner) => {
  const chunkedUrls = [...chunks(urls, 5)];
  const totalViolationsByPage = [];
  for (const urlChunk of chunkedUrls) {
    if (spinner) {
      spinner.text = `Running accessibility checks... (${totalViolationsByPage.length ||
        1} of ${urls.length} pages)`;
    }
    const violationPromises = [];
    for (const url of urlChunk) {
      violationPromises.push(runAccessibilityTestsOnUrl(url));
    }
    const resolvedViolationsByPage = await Promise.all(violationPromises);
    totalViolationsByPage.push(...resolvedViolationsByPage);
  }
  return totalViolationsByPage;
};

const lumberjack = async (baseUrl, spinner) => {
  const sitemapUrls = await fetchSitemapUrls(baseUrl);
  return runAllChecks(sitemapUrls, spinner);
};

module.exports = lumberjack;
