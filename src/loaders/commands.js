import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Recursively list all `.js` files under a directory.  This is a true
 * deep walker and does not depend on an `index.js` in each folder.
 */
async function listJSFiles(root) {
  const results = [];
  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listJSFiles(full)));
    } else if (entry.isFile() && full.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

export default async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  if (!fs.existsSync(commandsPath)) return;

  const files = await listJSFiles(commandsPath);
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(file).href);
      const c = mod.default;
      if (!c) continue;
      if (c.data && typeof c.execute === 'function') {
        client.commands.set(c.data.name, c);
      } else if (c.name && typeof c.execute === 'function') {
        client.commands.set(c.name, c);
      }
    } catch (err) {
      console.error(`Failed to load command ${file}:`, err);
    }
  }
}

