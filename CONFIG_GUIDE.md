# Configuration Guide

This guide explains all customization options available in `src/config.js`.

## Table of Contents

1. [Bot Presence](#bot-presence)
2. [Ticket System](#ticket-system)
3. [Automation Features](#automation-features)
4. [Ticket Menu](#ticket-menu)
5. [Ticket Logs](#ticket-logs)
6. [Transcripts](#transcripts)
7. [Database](#database)
8. [Logging](#logging)

---

## Bot Presence

Configure the bot's online status and activity rotation.

```javascript
presence: {
  status: 'online', // 'online' | 'idle' | 'dnd' | 'invisible'
  rotationInterval: 8000, // milliseconds between activity changes
  activities: [
    { name: "your tickets", type: 3 }, // 0=Playing, 1=Streaming, 2=Listening, 3=Watching, 4=Custom, 5=Competing
    { name: 'v2.0.0', type: 2 }
  ]
}
```

---

## Ticket System

### Channel & Role Configuration

```javascript
ticket: {
  categoryId: process.env.TICKET_CATEGORY_ID,
  supportRoleId: process.env.SUPPORT_ROLE_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  transcriptFallbackChannelId: process.env.TRANSCRIPT_FALLBACK_CHANNEL_ID,
}
```

### Ticket Behavior

```javascript
ticket: {
  maxFetchBatch: 100,           // messages fetched per batch for transcripts
  channelDeleteDelay: 5000,     // ms delay before deleting closed ticket channel
  namingPattern: 'ticket-{id}', // ticket channel naming pattern
  transcriptAutoDeleteMinutes: 5 // auto-delete fallback transcripts after X minutes
}
```

### Permissions

```javascript
permissions: {
  allowTicketOwnerClose: false,    // if true, ticket owner can close their own ticket
  allowTicketOwnerClaim: false,    // if true, owner can claim (not recommended)
  requireClaimToForward: true      // ticket must be claimed before forwarding
}
```

### Button Configuration

```javascript
buttons: {
  close: {
    id: 'ticket_close',
    label: 'Close Ticket',
    emoji: null,        // e.g., '🔒'
    style: 'Danger'     // Primary | Secondary | Success | Danger
  },
  claim: {
    id: 'ticket_claim',
    label: 'Claim',
    emoji: null,        // e.g., '✋'
    style: 'Primary'
  },
  forward: {
    id: 'ticket_forward',
    label: 'Forward',
    emoji: null,        // e.g., '➡️'
    style: 'Secondary'
  }
}
```

### Embed Styling

```javascript
embed: {
  color: 0x5865f2,              // hex color
  description: null,             // custom description (null = use default)
  image: '',                     // big image at bottom of embed
  thumbnail: null,               // small image at top right
  footer: {
    text: 'Developed by Horizov',
    icon: true,                  // shows bot avatar if true
    iconURL: null                // custom icon URL (overrides bot avatar)
  },
  closeFooter: 'Thank you for contacting support'
}
```

### Close DM Configuration

```javascript
closeDm: {
  enabled: true,
  title: '✅ Your Ticket Has Been Closed',
  description: null,             // null = use default dynamic description
  color: 0xff4d4d,
  includeTranscript: true
}
```

### Custom Messages

```javascript
messages: {
  alreadyOpen: '⚠️ You already have an open ticket!',
  ticketCreated: '✅ Ticket created: {channel}',
  ticketClosed: '✅ Ticket closed and transcript saved. Deleting channel...',
  notTicket: '⚠️ This is not a ticket channel.',
  onlySupport: 'Only support members can claim tickets.',
  noOtherSupport: 'No other support members found.',
  cannotClaimOwn: '❌ You cannot claim your own ticket.',
  alreadyClaimed: '⚠️ Already claimed by {user}.',
  notAuthorized: '❌ You are not authorized to use this.',
  mustBeClaimedFirst: '⚠️ Ticket must be claimed first.',
  forwardOnlyClaimer: '❌ Only the current claimer can forward this ticket.',
  supportTeamName: 'Support Team'
}
```

---

## Automation Features

Enable powerful automation to reduce manual work.

### Master Switch

```javascript
automation: {
  enabled: false, // set to true to enable all automation features
}
```

### Inactivity Warning

Automatically warn about inactive tickets:

```javascript
inactivityWarning: {
  enabled: false,
  thresholdMinutes: 60, // warn after 60 min of no messages
  message: '⚠️ This ticket has been inactive for a while. Please respond or it may be auto-closed.'
}
```

### Auto-Close

Automatically close inactive tickets:

```javascript
autoClose: {
  enabled: false,
  inactivityMinutes: 120, // auto-close after 120 min of inactivity
  notifyOwner: true       // DM the ticket owner when auto-closed
}
```

### Unclaimed Ticket Reminders

Send reminders about unclaimed tickets:

```javascript
unclaimedReminder: {
  enabled: false,
  intervalMinutes: 30,    // remind support every 30 min
  channelId: null         // where to send reminders (defaults to logChannelId)
}
```

### Welcome Message

Customize the initial ticket welcome message:

```javascript
welcomeMessage: {
  enabled: true,
  delay: 1000,    // ms delay before sending welcome
  useEmbed: true
}
```

---

## Ticket Menu

Configure the ticket creation menu.

```javascript
ticketMenu: {
  customId: 'ticket_type_select',
  placeholder: 'Select ticket type...',
  maxSelections: 1, // how many types user can select at once

  embed: {
    title: '🎫 Create a Ticket',
    description: 'Please select the ticket type from the menu below.',
    color: 0x5865f2,
    image: 'https://placehold.co/1280x720/png?text=Ticket+Support+Image&font=roboto',
    thumbnail: null,
    footer: {
      text: 'Developed by Horizov',
      icon: true,
      iconURL: null
    }
  },

  ticketTypes: [
    {
      label: 'General Support',
      id: 'general_support',
      description: 'Get help with general questions.',
      emoji: null // e.g., '❓'
    },
    {
      label: 'Report',
      id: 'reporting',
      description: 'Report a user.',
      emoji: null // e.g., '🚩'
    },
    {
      label: 'Technical',
      id: 'technical',
      description: 'Report a bug or technical issue.',
      emoji: null // e.g., '🔧'
    }
  ]
}
```

---

## Ticket Logs

Configure the `/ticketlogs` command display.

```javascript
ticketLogs: {
  pageSize: 5,              // tickets per page
  collectorTimeout: 120000, // ms before pagination buttons expire
  embedColor: 0x00FFFF,
  showTranscriptPath: false // show full transcript path in logs
}
```

---

## Transcripts

Customize ticket transcript generation.

```javascript
transcript: {
  saveLocation: './data/transcripts',
  format: 'html', // future: could support txt, pdf, etc.

  styling: {
    backgroundColor: '#0f172a',
    textColor: '#d1d5db',
    accentColor: '#60a5fa',
    fontFamily: 'Arial, Helvetica, sans-serif'
  },

  includeAttachments: true,
  includeEmbeds: false // future feature
}
```

---

## Database

Configure database settings and backups.

```javascript
database: {
  path: './data/tickets.db',
  backup: {
    enabled: false,
    intervalHours: 24,
    location: './data/backups'
  }
}
```

---

## Logging

Configure console logging behavior.

```javascript
logging: {
  level: 'log', // 'error' | 'warn' | 'log' | 'debug'
  timestampFormat: 'YYYY-MM-DD HH:mm:ss',
  colors: {
    error: '\x1b[31m', // red
    warn: '\x1b[33m',  // yellow
    log: '\x1b[36m',   // cyan
    debug: '\x1b[90m'  // gray
  }
}
```

---

## Environment Variables

All environment variables are mapped in the config for easy access:

```javascript
env: {
  discordToken: process.env.DISCORD_TOKEN,
  guildId: process.env.GUILD_ID,
  ticketMenuChannelId: process.env.TICKET_MENU_CHANNEL_ID,

  // Optional overrides
  ticketCategoryId: process.env.TICKET_CATEGORY_ID,
  supportRoleId: process.env.SUPPORT_ROLE_ID,
  logChannelId: process.env.LOG_CHANNEL_ID,
  transcriptFallbackChannelId: process.env.TRANSCRIPT_FALLBACK_CHANNEL_ID
}
```

---

## Quick Start Examples

### Enable Auto-Close for Inactive Tickets

```javascript
ticket: {
  automation: {
    enabled: true,
    autoClose: {
      enabled: true,
      inactivityMinutes: 180, // 3 hours
      notifyOwner: true
    }
  }
}
```

### Customize Button Appearance

```javascript
ticket: {
  buttons: {
    close: {
      id: 'ticket_close',
      label: 'Close',
      emoji: '🔒',
      style: 'Danger'
    }
  }
}
```

### Change Ticket Naming

```javascript
ticket: {
  namingPattern: 'support-{id}', // creates channels like "support-1", "support-2"
}
```

---

## Tips

1. Always restart the bot after changing config values
2. Keep `automation.enabled` false during testing
3. Use environment variables for sensitive IDs
4. Test automation features in a development server first
5. Adjust `channelDeleteDelay` if you need more time to review closed tickets