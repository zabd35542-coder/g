import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from 'dotenv';
import { REST } from 'discord.js';

// load environment variables as early as possible
config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// basic sanity checks before attempting any API work
if (!process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error('CLIENT_ID and GUILD_ID are required in environment variables');
  process.exit(1);
}
if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is required for command deployment');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

/**
 * Recursively walk a directory tree and return every `.js` file found.
 * This does not depend on an `index.js` in each folder; it deep-scans
 * every subdirectory no matter how nested.
 */
async function collectCommandFiles(directory) {
  const results = [];
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectCommandFiles(fullPath)));
    } else if (entry.isFile() && fullPath.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Load command definitions from a list of files.  The returned array is
 * suitable for passing directly to the Discord REST API.
 */
async function loadDefinitions(files) {
  const commands = [];
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(file).href);
      const c = mod.default;
      if (!c) continue;
      if (c.data) {
        commands.push(c.data.toJSON());
      } else if (c.name) {
        commands.push({
          name: c.name,
          description: c.description || 'No description provided',
        });
      }
    } catch (e) {
      console.error('Failed to load command for deployment:', file, e);
    }
  }
  return commands;
}

(async () => {
  try {
    const commandsDir = path.join(__dirname, 'src', 'commands');
    if (!fs.existsSync(commandsDir)) {
      console.error('Commands directory not found:', commandsDir);
      process.exit(1);
    }

    const files = await collectCommandFiles(commandsDir);
    const commands = await loadDefinitions(files);
    console.log(`[DEPLOY] Found ${commands.length} command(s)`);

    // clear then re-register; splitting to make logs clearer
    await rest.put(
      `/applications/${process.env.CLIENT_ID}/guilds/${process.env.GUILD_ID}/commands`,
      { body: [] }
    );
    console.log('[DEPLOY] Cleared existing guild commands');

    await rest.put(
      `/applications/${process.env.CLIENT_ID}/guilds/${process.env.GUILD_ID}/commands`,
      { body: commands }
    );
    console.log('[DEPLOY] Registered commands successfully');
    process.exit(0);
  } catch (err) {
    console.error('[DEPLOY] Command deployment failed:', err);
    process.exit(1);
  }
})();
