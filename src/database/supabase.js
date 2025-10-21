const { createClient } = require('@supabase/supabase-js');
require('dotenv-safe').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

module.exports = {
  supabase,

  async getGuildConfig(guildId) {
    const cached = configCache.get(guildId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('guild_id', guildId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      configCache.set(guildId, { data, timestamp: Date.now() });
    }

    return data;
  },

  invalidateGuildCache(guildId) {
    configCache.delete(guildId);
  },

  async upsertGuildConfig(guildId, config) {
    const { data, error } = await supabase
      .from('guilds')
      .upsert({
        guild_id: guildId,
        ...config,
        updated_at: new Date().toISOString()
      }, { onConflict: 'guild_id' })
      .select()
      .single();

    if (error) throw error;

    this.invalidateGuildCache(guildId);

    return data;
  },

  async incrementTicketCounter(guildId) {
    const { data, error } = await supabase.rpc('increment_ticket_counter', {
      p_guild_id: guildId
    });

    if (error) {
      const config = await this.getGuildConfig(guildId);
      if (!config) throw new Error('Guild not configured');

      const newCounter = (config.ticket_counter || 0) + 1;
      await supabase
        .from('guilds')
        .update({ ticket_counter: newCounter })
        .eq('guild_id', guildId);

      return newCounter;
    }

    return data;
  },

  async insertTicket({ guildId, ticket_name, type, creator_id, creator_tag, channel_id }) {
    const ticketNumber = await this.incrementTicketCounter(guildId);

    const { data, error } = await supabase
      .from('tickets')
      .insert({
        guild_id: guildId,
        ticket_name,
        ticket_number: ticketNumber,
        type,
        creator_id,
        creator_tag,
        channel_id,
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTicketClosure({ ticket_name, support_id, support_tag, closed_at, transcript }) {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        support_id,
        support_tag,
        closed_at,
        transcript,
        status: 'closed'
      })
      .eq('ticket_name', ticket_name)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async assignSupport(ticket_name, support_id, support_tag) {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        support_id,
        support_tag,
        status: 'claimed'
      })
      .eq('ticket_name', ticket_name)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveLogEmbedInfo(ticket_name, channel_id, message_id) {
    const { data, error } = await supabase
      .from('tickets')
      .update({
        log_channel_id: channel_id,
        log_message_id: message_id
      })
      .eq('ticket_name', ticket_name)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLogEmbedInfo(ticket_name) {
    const { data, error } = await supabase
      .from('tickets')
      .select('log_channel_id, log_message_id')
      .eq('ticket_name', ticket_name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAllTickets(guildId) {
    const query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (guildId) {
      query.eq('guild_id', guildId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getTicketByName(ticket_name) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('ticket_name', ticket_name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getOpenTickets(guildId) {
    const query = supabase
      .from('tickets')
      .select('*')
      .eq('status', 'open');

    if (guildId) {
      query.eq('guild_id', guildId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getUnclaimedTickets(guildId) {
    const query = supabase
      .from('tickets')
      .select('*')
      .eq('status', 'open')
      .is('support_id', null);

    if (guildId) {
      query.eq('guild_id', guildId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getUserOpenTickets(guildId, userId) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('guild_id', guildId)
      .eq('creator_id', userId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    return data;
  }
};
