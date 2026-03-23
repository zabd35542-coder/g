# 🎯 EmbedVault System Integration Guide

## Overview

This document explains the comprehensive embedVault integration across all bot modules. Every customization made in the embedVault manager now reflects live in the server for all automated messages.

---

## 🏗️ Architecture

### Core Components

1. **EmbedVault Module** (`src/modules/embedVault/`)
   - Central storage for all custom embeds
   - MongoDB-backed persistence
   - Supports types: Welcome, Goodbye, Partner, Boost, Manual

2. **EmbedHelper Utility** (`src/utils/embedHelper.js`)
   - Centralized interface for all embed operations
   - Consistent placeholder replacement
   - Automatic context building

3. **Event Handlers**
   - `guildMemberAdd.js` → Welcome embeds via embedVault
   - `guildMemberRemove.js` → Goodbye embeds via embedVault  
   - `guildUpdate.js` → Boost embeds via embedVault
   - `messageCreate.js` → Gateway trigger word (uses gateway module)

4. **Modules**
   - Welcome Module: Handles member join/leave with embedVault integration
   - Gateway Module: Verification system (independent, can use embedVault for prompts)

---

## 🔄 Data Flow & Sync

### Welcome Embed Flow (Member Join)

```
Member Joins
    ↓
guildMemberAdd event fires
    ↓
Delegates to client.welcome.handleMemberAdd(member, usedInviteCode)
    ↓
Check if invite code used → Query embedVault.getByLinkedInvite(guildId, code)
    ↓
If found: Send vault embed + assign linkedPartnerRole
    ↓
Fallback: Query embedVault.getByType(guildId, 'Welcome')
    ↓
Send to channel from GuildConfig.welcome.channelId
    ↓
Apply autoRole from WelcomeConfig if configured
```

**Key Placeholders Support:**
- `{member}` → Member username
- `{server}` → Server name
- `{invite.code}` → The invite code used
- `{invite.uses}` → Total uses of that invite
- `{partner.name}` → Name of linked partner embed
- All standard user/server placeholders

### Goodbye Embed Flow (Member Leave)

```
Member Leaves
    ↓
guildMemberRemove event fires
    ↓
Delegates to client.welcome.handleMemberRemove(member)
    ↓
Query embedVault.getByType(guildId, 'Goodbye')
    ↓
If found: Send vault embed with member context
    ↓
Fallback: Use legacy WelcomeConfig.goodbyeEmbed
```

**Key Placeholders Support:**
- `{member}` → Member username
- `{server}` → Server name
- All standard user/server placeholders

### Boost Embed Flow (Server Boost)

```
Guild receives boost/tier change
    ↓
guildUpdate event fires (GatewayIntentBits.GuildModeration required)
    ↓
Detects premiumTier OR premiumSubscriptionCount increase
    ↓
Query embedVault.getByType(guildId, 'Boost')
    ↓
If found: Send to GuildConfig.boost.channelId
    ↓
Context includes boost_level, boost_count, member_count
```

**Key Placeholders Support:**
- `{boost_level}` → Tier number (0-3)
- `{boost_count}` → Active boost count
- `{server}` → Server name
- `{member_count}` → Total members

---

## 📋 Critical Data Sync Checklist

### ✅ Verification Points

1. **Embed Names Must Match**
   ```
   embedVault.name = "welcome_default"
   GuildConfig.welcome.embedName = "welcome_default"  ← MUST MATCH
   ```

2. **Embed Types Must Be Correct**
   ```
   embedVault.type = "Welcome"   // One of: Welcome, Goodbye, Partner, Boost, Manual
   ```

3. **Channel IDs Must Exist**
   ```
   GuildConfig.welcome.channelId = "123456789"  // Must be text channel ID
   GuildConfig.goodbye.channelId = "123456789"  // Nullable if no goodbye embeds
   GuildConfig.boost.channelId = "123456789"    // Nullable if no boost embeds
   ```

4. **Role IDs Must Exist (For Partners)**
   ```
   embedVault.linkedPartnerRole = "987654321"  // Must be a valid role ID
   embedVault.linkedInviteCode = "abc123"      // Must be active invite code
   ```

### Debugging Data Sync Issues

**Problem: Embed not showing up**
- Check channel exists and bot has permissions
- Verify embed name matches in GuildConfig
- Check embedVault.data is not empty
- Enable debug logs: `console.log('[EmbedHelper]', embed);`

**Problem: Placeholders not replacing**
- Verify placeholder syntax: `{placeholder.name}`
- Check all uppercase keys in embedEngine render context
- Look at embedEngine.js for supported placeholder list
- Test with simpler placeholders first (e.g., `{server}`)

**Problem: Role not assigning (Partner embeds)**
- Verify linkedPartnerRole is set on embed document
- Check invite code is linked: `embedVault.linkedInviteCode`
- Confirm role exists in guild
- Ensure bot has higher role position

**Problem: Boost embed not triggering**
- Confirm GatewayIntentBits.GuildModeration is enabled (✅ Added in src/index.js)
- Verify embed type is "Boost" (not "boost")
- Check boost channel ID in GuildConfig
- Ensure embed boost type exists in vault

---

## 🚀 Usage Instructions

### Setting Up a Welcome Embed

1. **Create embed in embedVault**
   ```
   /embed create
   → Name: "welcome_default"
   → Type: "Welcome"
   → Content: Your welcome message with {member}, {server}, {invite.code} if needed
   ```

2. **Link to guild config**
   ```
   /setup welcome channel:#welcome-channel
   → This sets GuildConfig.welcome.channelId
   ```

3. **Associate embed name**
   ```
   Database update or admin command to set:
   GuildConfig.welcome.embedName = "welcome_default"
   ```

4. **Verify in logs** when member joins

### Setting Up a Partner Embed

1. **Create embed in embedVault**
   ```
   /embed create
   → Name: "partner_xyz"
   → Type: "Partner"
   → Content with {partner.name}, {invite.code}, {invite.uses}
   ```

2. **Bind invite code and role**
   ```
   /embed bind 
   → name: "partner_xyz"
   → invite_code: "abc123xyz"
   → partner_role: @PartnerRole
   ```

3. **Verify in logs** when someone joins via that invite

### Setting Up a Goodbye Embed

1. **Create embed in embedVault**
   ```
   /embed create
   → Name: "goodbye_farewell"  
   → Type: "Goodbye"
   → Content with {member}, {server}
   ```

2. **Link to guild config**
   ```
   GuildConfig.goodbye.channelId = "channel_id"
   GuildConfig.goodbye.embedName = "goodbye_farewell"
   ```

3. **Verify in logs** when member leaves

### Setting Up a Boost Embed

1. **Create embed in embedVault**
   ```
   /embed create
   → Name: "boost_celebration"
   → Type: "Boost"
   → Content with {boost_level}, {boost_count}, {server}
   ```

2. **Link to guild config**
   ```
   GuildConfig.boost.channelId = "announcements_channel_id"
   GuildConfig.boost.embedName = "boost_celebration"
   ```

3. **Verify in logs** when someone boosts the server

---

## 📝 Available Placeholders

### User Placeholders (from member object)
- `{user}` or `{user.name}` → Username
- `{user.id}` → User ID
- `{user.mention}` → Mention format `<@ID>`
- `{user.tag}` → Username#Discriminator (if available)
- `{user.avatar}` → Avatar URL
- `{user.roles}` → Comma-separated role names
- `{user.top_role}` → Highest role
- `{account_age}` → Days since account creation
- `{join_pos}` → Member's join position in guild

### Server Placeholders (from guild object)
- `{server}` or `{server.name}` → Server name
- `{server.id}` → Server ID
- `{server.icon}` → Server icon URL
- `{server.created_at}` → Server creation date
- `{server.owner_id}` → Owner's user ID
- `{member_count}` → Total members
- `{boost_level}` → Boost tier (0-3)
- `{boost_count}` → Active boosts

### Invite Placeholders (for join embeds)
- `{invite.code}` → Invite code used
- `{invite.uses}` → Total uses of that invite

### Channel Placeholders (if context provided)
- `{channel.name}` → Channel name
- `{channel.id}` → Channel ID
- `{channel.mention}` → Mention format `<#ID>`

### Partner Placeholders
- `{partner.name}` → Name of partner embed

---

## 🔧 Module Methods Reference

### client.embedVault Methods

```javascript
// Get embed by name
vault.getByName(guildId, name)

// Get embed by type
vault.getByType(guildId, type)  // type: "Welcome"|"Goodbye"|"Partner"|"Boost"|"Manual"

// Get embed by linked invite
vault.getByLinkedInvite(guildId, inviteCode)

// Create/update embed
vault.upsert(guildId, name, data, type, metadata)

// Delete embed
vault.delete(guildId, name)

// Bind invite to embed
vault.bindInvite(guildId, name, inviteCode)

// Bind invite + role to embed
vault.bindInviteWithRole(guildId, name, inviteCode, roleId)
```

### client.embedHelper Methods

```javascript
// Get embed by type
embedHelper.getEmbedByType(guildId, type)

// Get embed by name
embedHelper.getEmbedByName(guildId, embedName)

// Get embed by invite
embedHelper.getEmbedByInvite(guildId, inviteCode)

// Send embed to channel
embedHelper.sendEmbed(channel, embedData, context, label)

// Send welcome embed
embedHelper.sendWelcomeEmbed(member, usedInviteCode, channel)

// Send goodbye embed
embedHelper.sendGoodbyeEmbed(member, channel)

// Send boost embed
embedHelper.sendBoostEmbed(guild, channel)

// Verify embed type matches
embedHelper.verifyEmbedType(guildId, embedName, expectedType)
```

---

## ✅ Implementation Summary

### What Was Integrated

1. **✅ Welcome System**
   - Fetches from embedVault by name or type
   - Supports partner invite linking
   - Auto-assigns linked roles

2. **✅ Goodbye/Leave System**
   - Fetches from embedVault by type
   - Full placeholder support for {member}, {server}
   - Integrated into guildMemberRemove event

3. **✅ Boost System**
   - New guildUpdate event handler
   - Detects tier changes and subscription increases
   - Sends custom embeds with boost context

4. **✅ Centralized Helper**
   - Single source of truth for embed operations
   - Consistent placeholder resolution
   - Error handling and fallbacks

5. **✅ Intents & Events**
   - Added GatewayIntentBits.GuildModeration for guildUpdate
   - All event handlers properly delegated

### Live Sync Behavior

**Everything is now live-synced:**
- Change embed name → Updates immediately for next event
- Change embed content → Next member join/leave uses new content  
- Add/remove partner role → Applied to next joiner from that invite
- Change channel ID → Next message sends to new channel
- Disable embed in vault → Falls back to legacy config

---

## 🐛 Troubleshooting

### Member joins but no embed sent
1. Check GuildConfig.welcome.channelId exists
2. Verify bot has perms in that channel
3. Check embedVault has a "Welcome" type embed
4. Look at console for [WelcomeModule] errors

### Member leaves but no embed sent
1. Check GuildConfig.goodbye.channelId exists
2. Verify vault has "Goodbye" type embed
3. Look at console for [WelcomeModule] errors

### Partner role not assigned
1. Verify embedVault.linkedPartnerRole is set
2. Confirm invite code matches linked code
3. Check role still exists and bot can assign it
4. Look for [WelcomeModule] Assigned partner role logs

### Boost embed doesn't trigger
1. Confirm someone actually boosted
2. Check GuildConfig.boost settings exist
3. Verify embedVault "Boost" type embed exists
4. Check console for [GuildUpdate] logs

### Placeholders not being replaced
1. Use correct format: `{placeholder}`
2. Check placeholder list above
3. Don't mix case: use `{server}` not `{Server}`
4. Look at embedEngine.js for all supported keys

---

## 📊 Database Schema References

### EmbedVault Document
```javascript
{
  guildId: String,
  name: String,              // "welcome_default"
  data: Object,              // Full embed JSON
  type: String,              // "Welcome" | "Goodbye" | "Partner" | "Boost" | "Manual"
  linkedInviteCode: String,  // "abc123" for partner embeds
  linkedPartnerRole: String, // "roleId" to assign on join
  authorName: String,
  authorIcon: String,
  footerText: String,
  footerIcon: String,
  includeTimestamp: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### GuildConfig Document
```javascript
{
  guildId: String,
  welcome: {
    channelId: String,      // Where to send welcome embeds
    embedName: String,      // "welcome_default" - must match vault name
    autoRoleId: String      // Auto role on join
  },
  goodbye: {
    channelId: String,      // Where to send goodbye embeds
    embedName: String       // "goodbye_farewell" - must match vault name
  },
  boost: {
    channelId: String,      // Where to announce boosts
    embedName: String       // "boost_celebration" - must match vault name
  },
  logs: {
    channelId: String       // Audit logs
  }
}
```

---

## 🎓 Next Steps

1. **Test each embed type** with sample members/boosts
2. **Verify all placeholders** render correctly
3. **Check role assignments** for partner embeds
4. **Monitor logs** for any [Error] messages
5. **Document your embed naming convention** for consistency

All customizations in the manager now reflect **instantly in the server** ✨
