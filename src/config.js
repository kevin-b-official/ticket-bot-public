require('dotenv').config();

module.exports = {
  // --- Bot Presence Configuration ---
  presence: {
    status: 'online', // 'online' | 'idle' | 'dnd' | 'invisible'
    rotationInterval: 8000, // in milliseconds
    activities: [
      // Types: 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 4 = Custom, 5 = Competing
      { name: "your tickets", type: 3 },
      { name: 'v2.0.0', type: 2 }
    ]
  },

  // --- Ticket System Configuration ---
  ticket: {
    // Channel & Role IDs
    categoryId: process.env.TICKET_CATEGORY_ID,
    supportRoleId: process.env.SUPPORT_ROLE_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    transcriptFallbackChannelId: process.env.TRANSCRIPT_FALLBACK_CHANNEL_ID || null,

    // Ticket Behavior
    maxFetchBatch: 100, // for transcript message fetching
    channelDeleteDelay: 5000, // ms before deleting closed ticket channel
    namingPattern: 'ticket-{id}', // {id} will be replaced with ticket ID
    transcriptAutoDeleteMinutes: 5, // auto-delete fallback transcripts after X minutes

    // Permissions Configuration
    permissions: {
      allowTicketOwnerClose: false, // if true, ticket owner can close their own ticket
      allowTicketOwnerClaim: false, // if true, owner can claim (not recommended)
      requireClaimToForward: true // ticket must be claimed before forwarding
    },

    // Ticket Automation
    automation: {
      enabled: true, // master switch for all automation
      inactivityWarning: {
        enabled: true,
        thresholdMinutes: 60, // warn after 60 min of no messages
        message: '⚠️ This ticket has been inactive for a while. Please respond or it may be auto-closed.'
      },
      autoClose: {
        enabled: true,
        inactivityMinutes: 120, // auto-close after 120 min of inactivity
        notifyOwner: true
      },
      unclaimedReminder: {
        enabled: true,
        intervalMinutes: 15, // remind support every 15 min about unclaimed tickets
        channelId: '1295911446307278970' // where to send reminders (value null = logChannelId)
      },
      welcomeMessage: {
        enabled: true,
        delay: 1000, // ms delay before sending welcome
        useEmbed: true
      }
    },

    // Embed Configuration
    embed: {
      color: 0x5865f2,
      description: null, // custom description (null = use default)
      image: 'https://i.imgur.com/ifHx66U.png', // big image at the bottom of the embed
      thumbnail: null, // small image at top right
      footer: {
        text: 'Developed by Horizov',
        icon: true, // shows bot avatar if true
        iconURL: null // custom icon URL (overrides bot avatar)
      },
      closeFooter: 'Thank you for contacting support'
    },

    // Close DM Embed Configuration
    closeDm: {
      enabled: true,
      title: '✅ Your Ticket Has Been Closed',
      description: null, // null = use default dynamic description
      color: 0xff4d4d,
      includeTranscript: true
    },

    // Button Configuration
    buttons: {
      close: {
        id: 'ticket_close',
        label: 'Close Ticket',
        emoji: '🔒', // e.g., '🔒'
        style: 'Danger' // Primary | Secondary | Success | Danger
      },
      claim: {
        id: 'ticket_claim',
        label: 'Claim',
        emoji: '✋', // e.g., '✋'
        style: 'Primary'
      },
      forward: {
        id: 'ticket_forward',
        label: 'Forward',
        emoji: '➡️', // e.g., '➡️'
        style: 'Secondary'
      }
    },

    // Custom ID for forward select menu
    forwardSelectId: 'forward_ticket_select',

    // Messages Configuration
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
  },

  // --- Ticket Menu Message Configuration ---
  ticketMenu: {
    customId: 'ticket_type_select',
    placeholder: 'Select ticket type...',
    maxSelections: 1, // how many types user can select at once

    embed: {
      title: '🎫 Create a Ticket',
      description: 'Please select the ticket type from the menu below. Our support team will respond shortly.',
      color: 0x5865f2,
      image: 'https://i.imgur.com/ifHx66U.png',
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
        emoji: '❓'
      },
      {
        label: 'Report',
        id: 'reporting',
        description: 'Report a user',
        emoji: '🚩'
      },
      {
        label: 'Technical',
        id: 'technical',
        description: 'Report a bug or technical issue.',
        emoji: '🔧'
      }
    ]
  },

  // --- Ticket Logs Configuration ---
  ticketLogs: {
    pageSize: 5, // tickets per page in /ticketlogs command
    collectorTimeout: 120000, // ms before pagination buttons expire
    embedColor: 0x00FFFF,
    showTranscriptPath: false // show full transcript path in logs
  },

  // --- Transcript Configuration ---
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
  },

  // --- Database Configuration ---
  database: {
    path: './data/tickets.db',
    backup: {
      enabled: false,
      intervalHours: 24,
      location: './data/backups'
    }
  },

  // --- Logging Configuration ---
  logging: {
    level: 'log', // 'error' | 'warn' | 'log' | 'debug'
    timestampFormat: 'YYYY-MM-DD HH:mm:ss',
    colors: {
      error: '\x1b[31m', // red
      warn: '\x1b[33m',  // yellow
      log: '\x1b[36m',   // cyan
      debug: '\x1b[90m'  // gray
    }
  },

  // --- Environment Variable Mapping ---
  env: {
    discordToken: process.env.DISCORD_TOKEN,
    guildId: process.env.GUILD_ID,
    ticketMenuChannelId: process.env.TICKET_MENU_CHANNEL_ID,

    // Optional overrides (use config values if not set in .env)
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,
    supportRoleId: process.env.SUPPORT_ROLE_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    transcriptFallbackChannelId: process.env.TRANSCRIPT_FALLBACK_CHANNEL_ID
  }
};