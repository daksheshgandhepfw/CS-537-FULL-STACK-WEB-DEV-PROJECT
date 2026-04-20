const { execSync } = require('child_process');
try {
  execSync('npx vite', { stdio: 'pipe' });
} catch (e) {
  const fs = require('fs');
  let errOutput = '';
  if (e.stderr) errOutput += 'STDERR:\n' + e.stderr.toString();
  if (e.stdout) errOutput += '\nSTDOUT:\n' + e.stdout.toString();
  fs.writeFileSync('vite_error.txt', errOutput);
}
