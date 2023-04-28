const { decryptMedia } = require('@open-wa/wa-automate')
module.exports = {
    name: 'sticker',
    aliases: ['stiker', 'stickers', 'ستكر', 'ستيكر', 'استيكر', 'استكر'],
    description: 'Converts images or videos to stickers',
    execute: async(client, message, args) => {
        // Declare a few important variables
        const { id, from, isMedia, mimetype, quotedMsg } = message
        const uaOverride = process.env.UserAgent
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const isQuotedVideo = quotedMsg && quotedMsg.type === 'video'

        // Choose a cute reply
        const stickerWaitReplies = [
            'Adding 🧂 and 🌶\nPlease Wait..',
            'Preparing the sticker ⏳\nPlease Wait..',
            'Grilling The Sticker 🥩🔥\nPlease Wait..',
            'Cooking the sticker 🍳\nPlease wait a few seconds..',
            'Grilling The Sticker 🥩🔥\nPlease Wait..',
            'Creating the sticker masterpiece 🎨🖌️\nPlease hold on..',
            'Serving the sticker with love ❤️\nPlease Wait..',
            'Baking the sticker 🍪\nPlease wait a moment..',
            'Charging up the sticker-making machine ⚡\nPlease Wait..',
            'Sticker magic in progress ✨\nPlease wait..',
            'Sizzling the sticker 🍳🔥\nPlease wait a moment..',
            'Frying the sticker 🍳\nPlease hold on..',
            'Assembling the sticker puzzle 🧩\nPlease wait..',
            'Polishing the sticker 💎\nPlease wait a moment..',
            'Applying the finishing touches to the sticker 🎀\nPlease wait..',
            'Sprinkling some sticker magic ✨\nPlease hold on..',
            'Shaking up the sticker mix 🤝💥\nPlease wait..',
            'Whipping up the perfect sticker 🍰\nPlease hold on..',
            'Crafting the sticker with care 🧐\nPlease wait a moment..',
            'Brewing the perfect sticker blend ☕\nPlease wait..',
            'Gathering ingredients for the sticker recipe 🥚🍞🧀\nPlease hold on..',
            'Adding the final touches to the sticker masterpiece 🎨✨\nPlease wait a moment..',
            'Sticker in progress 🚧\nPlease hold on..',
            'Sprinkling some sticker love 💖\nPlease wait..',
            'Polishing the sticker to perfection 💎\nPlease hold on..',
            'Sticker creation in the works 🎉🎨\nPlease wait a moment..',
            'Please stand by while we make your sticker 🚨👀\nPlease wait..',
            'Cooking up something special just for you 🎁🎉\nPlease hold on..',
            'Building the perfect sticker from scratch 🛠️👷\nPlease wait..',
            'Assembling the ingredients for the perfect sticker recipe 🥕🍅🥬\nPlease hold on..',
            'Constructing the ultimate sticker 🏗️🚀\nPlease wait a moment..',
            'Brewing the perfect sticker blend ☕\nPlease wait..',
            'Adding the finishing touches to your sticker 🎀💅\nPlease hold on..',
            'Sticker creation in progress 🎨🎉\nPlease wait a moment..',
            'Putting the final touches on your custom sticker 🎨✨\nPlease hold on..',
            'Sticker creation in motion 🎨🚀\nPlease wait..',
            'Shaking up the perfect sticker recipe 🤝🧑‍🍳\nPlease hold on..'
        ]

        const chosenWaitReply = stickerWaitReplies[Math.floor(Math.random() * stickerWaitReplies.length)];

        // is the message valid (An image/video or is a qouted image/video?
        if (!(isMedia || isQuotedImage || isQuotedVideo)) {
            return await client.reply(from, `Umm, I can't find an image/video\n\nTo use *!sticker*\n\n\nSend an image/video/gif with *!sticker* as the caption.\nOr simply reply to an image/video/gif with *!sticker*`, id)
        }

        // Detect the type of media
        const _mimetype = isQuotedImage || isQuotedVideo ? quotedMsg.mimetype : mimetype

        // Get the media data
        const encryptedMedia = (isQuotedImage || isQuotedVideo) ? quotedMsg : message
        const mediaData = await decryptMedia(encryptedMedia, uaOverride)
        const mediaBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`

        await client.reply(from, chosenWaitReply, id)

        // If it is an image
        if (isQuotedImage || _mimetype == 'image/jpeg') {

            await client.sendImageAsSticker(from, mediaBase64, { author: 'Ahmed\'s Bot', pack: 'Insta: @710x', keepScale: true, discord: '295155004996714497' })
                .catch((err) => {
                    console.error('Image Sticker Error: ' + err.name)
                    client.reply(from, `Oh No 😰\nAn Error Occured While Proccessing The Sticker.\nPlease Try Again In A Few Seconds..\n\nError: ${err.name}`, id)
                })

            // Else if its a video/gif
        } else if (isQuotedVideo || _mimetype == 'video/mp4' || _mimetype == 'image/gif') {


            await client.sendMp4AsSticker(from, mediaBase64, { crop: false, fps: 15, startTime: '00:00:00.0', endTime: '00:00:7.0', loop: 0 }, { author: 'Ahmed\'s Bot', pack: 'Insta: @710x', discord: '295155004996714497' })
                .catch(async(err) => {

                    console.error('Video Sticker Error: ' + err.name)
                    if (err.name == 'STICKER_TOO_LARGE') {
                        client.reply(from, 'The File Is Too Big To Proccess.\nBut Give Me A Few Seconds And I\'ll Try Shortnening The Video.. ⏳', id)
                        await client.sendMp4AsSticker(from, mediaBase64, { crop: false, fps: 10, startTime: '00:00:00.0', endTime: '00:00:4.0', loop: 0 }, { author: 'Ahmed\'s Bot', pack: 'Insta: @710x', discord: '295155004996714497' }).then((result) => console.log('Sent Sticker!'))
                            .catch((err) => {

                                if (err.name == 'STICKER_TOO_LARGE') {
                                    client.reply(from, 'Nope!\nThe File Is Still Too Big To Proccess. 🤷🏻‍♂️\nMaybe Try Sending Another Video?', id)
                                } else {
                                    console.error('Nested Video Sticker Error: ' + err.name)
                                    client.reply(from, `Oh No 😰\nAn Error Occured While Proccessing The Sticker.\nPlease Try Again In A Few Seconds..\nOr Maybe Try Sending Another Video?\n\nError: ${err.name}`, id)
                                }
                            })
                    } else {
                        await client.reply(from, `Oh No 😰\nAn Error Occured While Proccessing The Sticker.\nPlease Try Again In A Few Seconds..\n\nError: ${err.name}`, id)
                    }
                })
        }


    },
};