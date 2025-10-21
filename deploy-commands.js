require('dotenv-safe').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./src/commands/${file}`);
  commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Deploying commands...');

    if (process.env.GUILD_ID) {
      console.log('Deploying to specific guild for testing...');
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
      console.log('Commands deployed to guild!');
    } else {
      console.log('Deploying globally for multi-server use...');
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log('Commands deployed globally! (May take up to 1 hour to appear)');
    }
  } catch (err) {
    console.error('Error deploying commands:', err);
  }
})();
