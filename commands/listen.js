const fs = require("fs")
const { decryptMedia } = require('@open-wa/wa-automate')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: "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",
});
async function convertOgaToMp3(filePath) {
    return new Promise((resolve, reject) => {
        // const mp3FilePath = `${__dirname}/1681688479.mp3`
        ffmpeg()
            .input(filePath + ".oga")
            .audioCodec('libmp3lame')
            .on('error', (err) => {
                console.error(err);
                reject(err);
            })
            .on('end', () => {
                resolve(filePath + ".mp3");
            })
            .save(filePath + ".mp3");
    });
}
module.exports = {
    name: 'listen',
    aliases: ['listen', 'transcribe', 'اسمع', 'أسمع'],
    description: 'Listens to a voice-note and transcribe it.',
    roles: ["modeer"],
    execute: async(client, message, args) => {

        const { id, from, quotedMsg } = message
        const uaOverride = process.env.UserAgent
        const isQuotedPtt = quotedMsg && (quotedMsg.type === 'ptt' || quotedMsg.type === 'audio' )
        
        const language = (args.length > 0) ? args[0] : "en"
        if (!isQuotedPtt) return client.reply(from, "To use this command, you must reply to a voice-note. \nExample: !listen <language-code>", id)

        const listenReplies = [
            'Tuning my ears, please give me a moment to listen.. 🎧',
            'Listening mode on, one moment please.. 🔊',
            'Let me put on my listening cap.. 🎩👂',
            'Hearing you loud and clear, just give me a minute to listen.. 🔉',
            'I\'m all ears, just need a moment to listen carefully.. 🦻'
        ];

        const chosenWaitReply = listenReplies[Math.floor(Math.random() * listenReplies.length)];
        client.reply(from, chosenWaitReply, id)

        const _mimetype = quotedMsg.mimetype
        const mediaData = await decryptMedia(quotedMsg, uaOverride)
        const mediaBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`

        const openai = new OpenAIApi(configuration);
        const filePath = `${__dirname}/listen_files/${message.t}`

        // Save the audio as .oga
        fs.writeFileSync(
            filePath + ".oga",
            Buffer.from(mediaData.toString('base64'), 'base64')
        );

        // Convert the file to oga
        await convertOgaToMp3(filePath)

        openai
            .createTranscription(fs.createReadStream(filePath + ".mp3"), "whisper-1", undefined,
                'json', // The format of the transcription.
                1, // Temperature
                language)
            .then((res) => {
                client.reply(from, "This is what I heard 👂:\n" + res.data.text, quotedMsg.id);
                // console.log(res.json(res.data))
            })
            .catch((err) => {
                console.log(err.response.data.error);
                client.reply(from, "Unknown AXIOS error ☹️", id);
            });


    },
};