module.exports = {
    name: 'add',
    aliases: ['اضافة'],
    description: 'Adds a new member to the group',
    groupOnly: true,
    mustBeAdmin: true,
    roles: ['admin'],
    execute: async(client, message, args) => {

        const body = (message.type === 'chat') ? message.body : ((message.type === 'image' && message.caption || message.type === 'video' && message.caption)) ? message.caption : ''
        const isQuotedText = message.quotedMsg && message.quotedMsg.type === 'chat'


        const regex = /\d+/gm;
        let text = isQuotedText ? message.quotedMsg.body : body;
        text = text.replace(/ /g, '').replace(/ /g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\-/g, '').replace(/ /g, '').replace(/\+/g, '').replace(/\-/g, '').replace(/\-/g, '')
        const match = regex.exec(text)
        let phoneNumber = match ? match[0] : null

        if (phoneNumber == null) return client.reply(message.from, `To use *!add*, Send: *!add <number>* \nExample: *!add 974xxxxxxxx*`, message.id)
        if (phoneNumber.length == 8) {
            phoneNumber = `974${phoneNumber}`
        }
        phoneNumber = `${phoneNumber}@c.us`
        try {


            // Check if number is already a member

            const groupMembers = await client.getGroupMembersId(message.from)
                // console.log(groupMembers)
                // console.log(`${phoneNumber}`)
            if (groupMembers.includes(phoneNumber)) return await client.sendReplyWithMentions(message.from, `That member is already a member of this group 😑\nSay hi @${phoneNumber.replace(/@c.us/g, '')}`, message.id)


            await client.sendText(phoneNumber, "Hello 👋,\nI am a bot and I will try adding you to a group.")
            await client.addParticipant(message.from, phoneNumber)
            await client.sendTextWithMentions(message.from, 'Welcome aboard 👋\n' + `@${phoneNumber.replace(/@c.us/g, '')} `)
        } catch (err) {
            console.error(err)
            client.reply(message.from, `Something went wrong 😯\nI could not add +${phoneNumber.replace(/@c.us/g, '')}`, message.id)
        }



    },
};