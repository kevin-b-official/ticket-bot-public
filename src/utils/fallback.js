const config = require('../config');

async function sendTranscriptFallback(guild, userId, transcriptPath) {
  const fallbackChannelId = config.ticket.transcriptFallbackChannelId || config.env.transcriptFallbackChannelId;
  if (!fallbackChannelId) return;

  try {
    const channel = await guild.channels.fetch(fallbackChannelId);
    if (!channel || !channel.isTextBased()) return;

    const msg = await channel.send({
      content: `<@${userId}> I couldn't send your transcript via DM. Here it is instead:`,
      files: [{ attachment: transcriptPath }]
    });

    // auto-delete after configured minutes
    const deleteAfterMs = (config.ticket.transcriptAutoDeleteMinutes || 5) * 60 * 1000;
    setTimeout(() => msg.delete().catch(() => {}), deleteAfterMs);

  } catch (err) {
    console.error("Transcript fallback failed:", err);
  }
}

module.exports = { sendTranscriptFallback };