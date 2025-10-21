const { setTimeout } = require('node:timers/promises');
const config = require('../config');

async function sendTranscriptFallback(guild, userId, transcriptPath, guildConfig = null) {
  const fallbackChannelId = guildConfig?.transcript_fallback_channel_id || config.ticket.transcriptFallbackChannelId || config.env.transcriptFallbackChannelId;
  if (!fallbackChannelId) return;

  try {
    const channel = await guild.channels.fetch(fallbackChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const msg = await channel.send({
      content: `<@${userId}> I couldn't send your transcript via DM. Here it is instead:`,
      files: [{ attachment: transcriptPath }]
    });

    // ✅ Configurable safety guard for auto-deletion
    const minutes = Math.max(1, config.ticket.transcriptAutoDeleteMinutes || 5); // ensure min 1 minute
    const deleteAfterMs = minutes * 60 * 1000;

    // Using Promise-based timeout (cleaner async)
    await setTimeout(deleteAfterMs);
    await msg.delete().catch(() => {});

  } catch (err) {
    console.error(`[TranscriptFallback] Failed for user ${userId}:`, err);
  }
}

module.exports = { sendTranscriptFallback };