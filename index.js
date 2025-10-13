require('dotenv-safe').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');

// ensure data folders
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
if (!fs.existsSync('./data/transcripts')) fs.mkdirSync('./data/transcripts', { recursive: true });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// load commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./src/commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./src/commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

// load events
const eventFiles = fs.readdirSync('./src/events').filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./src/events/${file}`);
  if (event.once) client.once(event.name, (...args) => event.execute(client, ...args));
  else client.on(event.name, (...args) => event.execute(client, ...args));
}

const config = require('./src/config');
const db = require('./src/database/db');
const { TicketAutomation } = require('./src/utils/automation');

// initialize automation after client is ready
client.once('ready', () => {
  const automation = new TicketAutomation(client, db);
  automation.start();
  client.automation = automation;
});

// graceful shutdown
process.on('SIGINT', () => {
  if (client.automation) client.automation.stop();
  process.exit(0);
});

client.login(config.env.discordToken);
