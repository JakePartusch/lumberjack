const { firefox, chromium, webkit } = require("playwright");
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

const runAccessibilityTestsOnUrl = async (url, browser) => {
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
  return { url, ...axeViolations };
};

const runAllChecks = async (urls, spinner) => {
  const chunkedUrls = [...chunks(urls, 3)];
  const totalViolationsByPage = [];
  for (const urlChunk of chunkedUrls) {
    if (spinner) {
      spinner.text = `Running accessibility checks... (${totalViolationsByPage.length ||
        1} of ${urls.length} pages)`;
    }
    const browserPromises = [
      chromium.launch(),
      firefox.launch(),
      webkit.launch()
    ];
    const browsers = await Promise.all(browserPromises);
    const violationPromises = [];
    for (let i = 0; i < urlChunk.length; i++) {
      const url = urlChunk[i];
      const browser = browsers[i];
      violationPromises.push(runAccessibilityTestsOnUrl(url, browser));
    }
    const resolvedViolationsByPage = await Promise.all(violationPromises);

    const closedBrowserPromises = [];
    for (const browser of browsers) {
      closedBrowserPromises.push(browser.close());
    }
    await Promise.all(closedBrowserPromises);
    totalViolationsByPage.push(...resolvedViolationsByPage);
  }
  return totalViolationsByPage;
};

const lumberjack = async (baseUrl, spinner) => {
  const sitemapUrls = await fetchSitemapUrls(baseUrl);
  const results = runAllChecks(sitemapUrls, spinner);
  return results;
};

module.exports = lumberjack;
