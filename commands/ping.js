const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Qatar').locale('en')

module.exports = {
    name: 'ping',
    aliases: ['pingtest', 'latency'],
    description: 'Returns the bot\'s ping speed',
    execute: async(client, message, args) => {
        const processTime = (timestamp, now) => {
            return moment.duration(now - moment(timestamp * 1000)).asSeconds()
        }
        const latency = processTime(message.t, moment());
        await client.reply(message.from, `Pong 🏓\nSpeed: ${latency} _Second_ 💨`, message.id)
    },
};