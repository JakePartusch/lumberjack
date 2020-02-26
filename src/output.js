const chalk = require("chalk");

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

const printResults = toalViolationsByPage => {
  for (const violationByPage of toalViolationsByPage) {
    if (violationByPage.error) {
      logUrl(violationByPage.url);
      console.log(chalk`{red ERROR: ${violationByPage.error}}`);
    }
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

module.exports = {
  printResults
};
