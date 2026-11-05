const { runConnectedJob } = require("./winglo-workflow.cjs");
runConnectedJob({ mobile: true }).catch((e) => {
  console.error(e);
  process.exit(1);
});
