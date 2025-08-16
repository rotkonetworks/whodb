import { readFileSync, writeFileSync } from 'fs';

function parseEnvFile(filePath) {
  const env = {};
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let line of lines) {
    line = line.trim();
    // Skip blank lines and full-line comments
    if (line === '' || line.startsWith('#')) continue;

    // Split on the first '='
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.substring(0, index).trim();
    let value = line.substring(index + 1).trim();

    // If value is quoted, remove quotes and preserve inner content
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      // Remove inline comments for unquoted values (only remove when preceded by a space)
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      }
    }
    env[key] = value;
  }
  return env;
}

function substituteVars(env) {
  const varPattern = /\${([^}]+)}/g;
  let changed = true;
  while (changed) {
    changed = false;
    for (const key in env) {
      const newValue = env[key].replace(varPattern, (_, varName) => env[varName] || '');
      if (newValue !== env[key]) {
        env[key] = newValue;
        changed = true;
      }
    }
  }
  return env;
}

// Adjust the file path as necessary; here we assume .env.example is in the project root.
const envVars = parseEnvFile('./.env.example');
const finalEnv = substituteVars(envVars);

let output = '';
for (const key in finalEnv) {
  output += `${key}="${finalEnv[key]}"\n`;
}
writeFileSync('./.env', output);
