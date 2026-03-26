import GuildConfig from './GuildConfig.js';

export default (client) => {
  return {
    GuildConfig,
    async initialize() {
      // Any initialization logic for the config module can go here
      console.log('[CONFIG] Module initialized.');
    },
  };
};
