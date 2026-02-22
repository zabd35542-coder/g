# Gateway Module - Guardian Bot v4.0

The Gateway module provides a flexible, multi-method verification system for Discord servers with advanced features like trust scoring, raid protection, and customizable notification system.

## Features

✅ **5 Verification Methods:**
- Button clicks
- Message reactions  
- Trigger words
- Slash commands
- Join detection checks

✅ **Role Management:**
- Automatically add verified role upon successful verification
- Automatically remove penalty/unverified role
- Fully customizable via database

✅ **Trust Score System (V1):**
- Initial trust score: 30 points
- Join Age Penalty: Score decreases 1 point per day unverified (max -20 points at 20+ days)
- Trust score displayed in verification logs

✅ **Trigger Word System:**
- User types trigger word to verify
- Bot automatically reacts with ✅ confirmation
- No slash command needed

✅ **DM Notifications:**
- Sends customized private message to user upon successful verification
- Configurable message per guild
- Handles DM failures gracefully

✅ **Raid Shield (V1):**
- Account age validation
- Only activates if `raidMode: true` in database config
- Configurable minimum account age (default: 7 days)

## File Structure

```
src/modules/gateway/
├── schema.js          # Mongoose schema for gateway configurations
├── checker.js         # Verification logic & trust score calculations
├── actions.js         # Role management, DM sending, reactions
├── index.js           # Main entry point with event handlers
src/events/
├── interactionCreate.js  # Updated to route to gateway handlers
├── messageCreate.js      # Updated to route message triggers
src/commands/admin/
└── gateway.js         # Admin command for configuration
```

## Database Schema

The Gateway module uses MongoDB with the following structure:

```javascript
{
  guildId: String,                 // Unique guild ID
  verifiedRole: String,            // Role ID to add on verification
  unverifiedRole: String,          // Role ID to remove on verification (penalty role)
  channelId: String,               // Channel where verification happens
  method: String,                  // enum: 'button', 'reaction', 'trigger', 'slash', 'join-check'
  triggerWord: String,             // Word to type for verification
  successDM: String,               // Message sent in DM upon verification
  raidMode: Boolean,               // Enable Account Age check
  minAccountAge: Number,           // Minimum account age in days (default: 7)
  enabled: Boolean,                // Module enabled for this guild
  timestamps: {
    createdAt: Date,
    updatedAt: Date
  }
}
```

## Setup Instructions

### 1. Copy Environment Variables

```bash
cp .env.example .env
```

Update `.env` with your values:
```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_application_id
GUILD_ID=your_guild_id
MONGO_URI=mongodb://localhost:27017/guardian
```

### 2. Register Slash Commands

Run the registration script to clear old commands and register new ones:

```bash
npm run deploy
```

or directly:

```bash
node scripts/register.js
```

**What it does:**
- ✓ Reads all commands from `src/commands/`
- ✓ Clears all existing commands from Discord
- ✓ Registers only the NEW commands (including `/gateway`)
- ✓ Uses CLIENT_ID and GUILD_ID from .env

### 3. Start the Bot

```bash
npm start
```

or with auto-reload:

```bash
npm run dev
```

## Usage

### Configure Gateway via Admin Command

In your Discord server, administrators can configure the gateway module:

```
/gateway setup <method> <verified_role> <unverified_role> <channel> [trigger_word]
```

**Parameters:**
- `method`: Verification method (button, reaction, trigger, slash, join-check)
- `verified_role`: Role to add upon verification
- `unverified_role`: Role to remove upon verification (penalty role)
- `channel`: Channel where verification prompt appears
- `trigger_word`: (Optional) Word users type to verify (required for 'trigger' method)

**Example:**
```
/gateway setup trigger @Verified @Unverified #verification password123
```

### Disable Gateway

```
/gateway disable
```

## Verification Flow

1. **User Action:**
   - Clicks button, types trigger word, or reacts to message

2. **System Checks:**
   - Validates raid shield (account age if enabled)
   - Calculates trust score
   - Applies join age penalty

3. **Verification Granted:**
   - Adds verified role
   - Removes unverified role
   - Sends DM notification
   - Reacts with ✅ (for trigger method)
   - Logs verification event

4. **Verification Denied:**
   - User receives reason (e.g., "Account too new")
   - No roles are modified
   - No DM sent

## Trust Score Calculation

```
Initial Score: 30 points

Penalties:
- Join Age Penalty: -1 point per day unverified (max -20)
- Raid Shield Check: -100 (denied if account too new)

Final Score Range: 0-100
```

### Example:
- User joins server and verifies immediately → Trust Score: 30
- User joins server, waits 10 days to verify → Trust Score: 20 (30 - 10 penalty)
- User joins server, waits 25 days to verify → Trust Score: 10 (30 - 20 max penalty)
- User's account is only 3 days old, raidMode enabled → Verification DENIED

## Module Architecture

The Gateway module follows the Modular Architecture pattern:

1. **schema.js**: Data layer - Defines MongoDB schema
2. **checker.js**: Business logic - Verification checks & calculations
3. **actions.js**: Actions layer - Role changes, DMs, reactions
4. **index.js**: Controller - Event handlers & main logic

## Event Integration

### InteractionCreate Event
- Routes button interactions to `gateway.handleInteraction()`
- Handles button clicks for verification

### MessageCreate Event  
- Routes messages to `gateway.handleMessage()`
- Detects trigger words and verifies users

## Error Handling

All operations are wrapped in try-catch blocks:

- Role failures → Verification fails with error message
- DM failures → Non-fatal (user may have DMs disabled), verification continues
- Database failures → Graceful degradation with console logging
- Invalid member/guild data → Safe-fail, no action taken

## Security Features

✅ **Permission Checks:**
- Admin-only configuration commands
- Safe-fail if no config exists for guild

✅ **Bot Permissions:**
- Validates role IDs exist before attempting changes
- Checks member state before modifications

✅ **Raid Protection:**
- Account age validation
- Configurable minimum account age

## Monitoring & Logs

All events are logged with timestamps:

```
[Gateway] User username#0000 verified via button. Trust Score: 30
[Gateway] User verification denied: Account too new (3 days, minimum 7)
[Gateway] Config updated for guild 1234567890
```

## Troubleshooting

### Bot Can't Add Roles
- ✓ Check bot has "Manage Roles" permission
- ✓ Verify role IDs in database config
- ✓ Ensure bot role is higher than target roles

### Users Not Receiving DMs
- ✓ DM failures are non-fatal (logged but don't block verification)
- ✓ Check if user has DMs enabled
- ✓ User must have mutual server with bot

### Trigger Word Not Working
- ✓ Ensure method is set to "trigger"
- ✓ Check triggerWord is set in config
- ✓ Word matching is case-insensitive

### Raid Shield Not Activating
- ✓ Verify `raidMode: true` in database config
- ✓ Check `minAccountAge` value
- ✓ Should block users with newer accounts

## API Reference

### Main Module Functions

```javascript
// Get gateway config for a guild
await client.gateway.getConfig(guildId);

// Create or update gateway config
await client.gateway.setConfig(guildId, configData);

// Run setup (creates config and sends prompt)
await client.gateway.setupCommand(
  guildId, 
  method,      // 'button', 'trigger', etc.
  verifiedRoleId,
  unverifiedRoleId,
  channelId,
  triggerWord  // optional
);

// Disable gateway for a guild
await client.gateway.disableCommand(guildId);

// Handle interaction (button clicks)
await client.gateway.handleInteraction(interaction);

// Handle messages (trigger words)
await client.gateway.handleMessage(message);
```

### Checker Functions

```javascript
// Calculate trust score
calculateTrustScore(user, config);

// Get account age in days
getAccountAgeDays(user);

// Check if message contains trigger word
checkTriggerWord(messageContent, triggerWord);

// Validate raid shield
validateRaidShield(user, config);

// Comprehensive verification check
performVerificationCheck(user, member, config);
```

### Action Functions

```javascript
// Add/remove roles
await grantRoles(member, config);

// Send DM to user
await sendVerificationDM(user, message, config);

// React to message with checkmark
await reactWithCheckmark(message);

// Full verification workflow
await performVerificationFlow(member, triggerMessage, config);

// Send verification prompt to channel
await sendVerificationPrompt(channel, config);
```

## Future Enhancements

- [ ] Trust Score V2: Multiple factors (account age, server history, etc.)
- [ ] Custom expiring verification tokens
- [ ] Audit logs for verification events
- [ ] Dashboard for monitoring
- [ ] A/B testing different verification methods
- [ ] Webhook notifications
- [ ] Rate limiting

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review console logs for error messages
3. Verify .env variables are set correctly
4. Ensure MongoDB is running and accessible
