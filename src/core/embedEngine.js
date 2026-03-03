import { parsePlaceholders } from '../utils/placeholders.js';

function isObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val);
}

async function deepParse(value, member) {
  if (Array.isArray(value)) {
    const out = [];
    for (let item of value) {
      out.push(await deepParse(item, member));
    }
    return out;
  }

  if (isObject(value)) {
    const obj = {};
    for (const [k, v] of Object.entries(value)) {
      obj[k] = await deepParse(v, member);
    }
    return obj;
  }

  if (typeof value === 'string' && member) {
    // the placeholder parser is async, so we await here
    try {
      return await parsePlaceholders(value, member);
    } catch (e) {
      // parsing failure shouldn't break the engine, just return the
      // original string (caller may log separately)
      return value;
    }
  }

  return value;
}

/**
 * Render a JSON embed template into a plain object suitable for passing
 * to Discord's API.  The engine is purely data‑driven and has no
 * dependencies on any Discord builder classes.  Placeholder replacement
 * happens automatically for any string value if a member context is
 * provided.
 *
 * Supported structure is the same as the JSON that would be stored in
 * the database; it handles nested `fields` arrays, and nested objects
 * for author/thumbnail/image/footer, etc.  Every string within the
 * template is traversed and passed through the placeholder engine.
 *
 * @param {Object} template  The raw JSON template (may come from Mongo).
 * @param {GuildMember|null} member  Optional member context for placeholders.
 * @returns {Promise<Object>} Plain object representing the embed data.
 */
export async function render(template = {}, member = null) {
  // clone to avoid mutating the original template
  const copy = template && typeof template === 'object' ? JSON.parse(JSON.stringify(template)) : {};
  return await deepParse(copy, member);
}

export default { render };