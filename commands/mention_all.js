module.exports = {
    name: 'all',
    aliases: ['all', 'everyone', 'mention', 'الكل'],
    description: 'Mentions everyone in the group',
    groupOnly: true,
    roles: ['admin'],
    execute: async(client, message, args) => {


        const groupMem = await client.getGroupMembers(message.from)
        let reply = '〘 HEADS UP EVERYONE 〙'
        for (let i = 0; i < groupMem.length; i++) {
            reply += `@${groupMem[i].id.replace(/@c.us/g, '')} `
        }
        await client.sendTextWithMentions(message.from, reply, true)


    },
};