#!/usr/bin/env node
"use strict";

const arg = require("arg");
const ora = require("ora");
const lumberjack = require("../");
const { printResults } = require("../src/output");

const main = async () => {
  const args = arg({
    "--help": Boolean,
    "--url": String // --url <string> or --url=<string>
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
  const totalViolationsByPage = await lumberjack(baseUrl, spinner);
  spinner.stop();
  printResults(totalViolationsByPage);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
