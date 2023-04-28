const fs = require('fs');

module.exports = {
    name: 'help',
    aliases: ['مساعدة', 'commands', 'menu'],
    description: 'Lists all available commands and their descriptions',
    execute: (client, message, args) => {
        const commands = {};
        const commandFiles = fs.readdirSync(`${__dirname}/`).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`${__dirname}/${file}`);
            commands[command.name] = command;
        }

        let reply = 'Available Commands 💻:\n\n';
        Object.values(commands).forEach((command) => {
            reply += `🔘 *!${command.name}*: ${command.description}\n\n`;
        });
        reply += '*Made With <3 By Ahmed ( @710x )*'
        client.reply(message.from, reply, message.id);
    },
};