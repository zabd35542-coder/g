import GatewaySchema from "./schema.js";

const memory = new Map();

export async function init(client) {
      try {
            const configs = await GatewaySchema.find({});
                configs.forEach(cfg => memory.set(cfg.guildId, cfg));
      } catch (err) {}
}

export async function getGuildConfig(guildId) {
      if (memory.has(guildId)) return memory.get(guildId);
        const config = await GatewaySchema.findOne({ guildId });
          if (config) memory.set(guildId, config);
            return config;
}

export function updateCache(guildId, data) {
      memory.set(guildId, data);
}
