const ffmpeg = require('fluent-ffmpeg');

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
convertOgaToMp3("./commands/listen_files/1681688479")