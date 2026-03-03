import GatewayConfig from '../modules/gateway/schema.js';

/**
 * Simple task scheduler that periodically scans the gateway configuration
 * documents for expired temporary roles and purges them.  This is intended
 * to run as part of the bot process and keep the state map clean.
 */
class TaskScheduler {
  constructor() {
    this.interval = null;
  }

  start() {
    // guard clause: don't start if we've already scheduled an interval
    if (this.interval) return;

    // ensure the database connection is healthy before beginning work
    if (!GatewayConfig.db || GatewayConfig.db.readyState !== 1) {
      console.warn('[Scheduler] MongoDB not connected; scheduler will not start');
      return;
    }

    // run every minute; the callback itself is wrapped in a try/catch so
    // issues within the loop won't crash the process or spam the console.
    this.interval = setInterval(async () => {
      if (!GatewayConfig.db || GatewayConfig.db.readyState !== 1) {
        console.warn('[Scheduler] MongoDB disconnected; stopping scheduler');
        clearInterval(this.interval);
        this.interval = null;
        return;
      }

      try {
        const now = new Date();
        const configs = await GatewayConfig.find({});
        for (const cfg of configs) {
          if (cfg.userStates && cfg.userStates.size) {
            let changed = false;
            for (const [userId, state] of cfg.userStates.entries()) {
              if (state.tempRoles && state.tempRoles.length) {
                const originalLength = state.tempRoles.length;
                state.tempRoles = state.tempRoles.filter((r) => {
                  return r.expiresAt && r.expiresAt > now;
                });
                if (state.tempRoles.length !== originalLength) {
                  changed = true;
                }
              }
            }
            if (changed) {
              try {
                await cfg.save();
              } catch (e) {
                // log at debug level, not throw – failure to persist one
                // config shouldn't flood the console
                console.warn('[Scheduler] could not save gateway config', e);
              }
            }
          }
        }
      } catch (e) {
        // swallow and log once; we don't want repetitive noise
        console.warn('[Scheduler] error checking temp roles (will continue running)', e);
      }
    }, 60 * 1000);
  }
}

export default new TaskScheduler();
