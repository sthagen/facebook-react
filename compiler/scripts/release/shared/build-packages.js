const ora = require('ora');
const {execHelper} = require('./utils');

async function buildPackages(pkgNames) {
  const spinner = ora(`Building packages`).info();
  for (const pkgName of pkgNames) {
    const command = `NODE_ENV=production yarn workspace ${pkgName} run build --dts`;
    spinner.start(`Running: ${command}\n`);
    try {
      await execHelper(command);
    } catch (e) {
      spinner.fail(e.toString());
      throw e;
    }
    spinner.succeed(`Successfully built ${pkgName}`);
  }
  spinner.stop();
}

module.exports = {
  buildPackages,
};
