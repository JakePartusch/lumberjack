#!/usr/bin/env node
"use strict";

const arg = require("arg");
const ora = require("ora");
const chalk = require("chalk");
const lumberjack = require("../");
const { printResults } = require("../src/output");

const main = async () => {
  const args = arg({
    "--help": Boolean,
    "--url": String,
    "--strict": Boolean,
    "--baseUrlOnly": Boolean
  });
  const spinner = ora("Fetching sitemap").start();
  const baseUrl = args["--url"];
  if (!baseUrl) {
    spinner.stop();
    console.error(
      "Please specify a URL with the --url parameter (eg. --url https://example.com)"
    );
    process.exit(1);
  }
  const options = {
    strict: args["--strict"],
    baseUrlOnly: args["--baseUrlOnly"]
  };
  const totalViolationsByPage = await lumberjack(baseUrl, options, spinner);
  spinner.stop();
  printResults(totalViolationsByPage);
  const isStrict = args["--strict"];
  if (isStrict) {
    const hasViolations = totalViolationsByPage.some(page => {
      return page.violations.length > 0;
    });
    if (hasViolations) {
      console.error(
        chalk`{red.bold ERROR: Strict mode enabled and website has one or more issues.}`
      );
      process.exit(1);
    }
  }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
