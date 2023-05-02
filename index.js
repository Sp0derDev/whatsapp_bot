// const { create, Client } = require('@open-wa/wa-automate');
const { SocketClient } = require("@open-wa/wa-automate-socket-client");
const fs = require("fs");
const { default: PQueue } = require("p-queue");
const config = require("./assets/config.js");

// Load all commands from the files
const commands = {};
const commandFiles = fs
    .readdirSync(`${__dirname}/commands`)
    .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`${__dirname}/commands/${file}`);
    commands[command.name] = command;
    for (const alias of command.aliases) {
        commands[alias] = command;
    }
}

// Setup the queue
const queue = new PQueue({
    concurrency: 4,
    autoStart: false,
});

// Proccess The Messages in The Queue
const proc = async (client, message) => {
    // Extract Attributes from message
    const {
        type,
        id,
        from,
        t,
        sender,
        isGroupMsg,
        chat,
        chatId,
        caption,
        isMedia,
        quotedMsg,
        quotedMsgObj,
    } = message;
    let { body } = message;
    let { pushname, verifiedName, formattedName } = sender ? sender : "null";
    pushname = pushname || verifiedName || formattedName; // verifiedName is the name of someone who uses a business account
    const { prefix } = config;
    body =
        type === "chat" && body.startsWith(prefix) ?
            body :
            ((type === "image" && caption) || (type === "video" && caption)) &&
                caption.startsWith(prefix) ?
                caption :
                "";

    // console.log(`Proccessing Message From ${from} - ${pushname}`)
    if (body.startsWith(prefix)) {
        // Split the command and arguments
        const args = body.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = commands[commandName];
        if (command) {
            try {
                console.log(`Running pre-checks for [ ${commandName} ]`);
                if (await preChecks(client, message, command)) {
                    console.log(`Executing Command [ ${commandName} ]`);
                    await command.execute(client, message, args);
                } else {
                    console.log("Pre-check failed. Aborting execution..");
                }
            } catch (error) {
                console.error(error);
                await client.reply(
                    from,
                    "An unknown error occurred while executing the command.",
                    id
                );
            }
        } else {
            console.log(`Command Not Found [ ${commandName} ]`);
            await client.reply(
                from,
                "Unknown command. Type `!help` for a list of available commands.",
                id
            );
        }
    } else {
        // console.log(`Not a Command. Skipping..`)
    }

    return true;
};

async function start() {
    const client = await SocketClient.connect(
        "http://localhost:8899",
        "aMYOlCfZpM7HmDla0l5CjnFXdYftsS2H"
    );

    // Add Message to Queue
    const processMessage = (message) =>
    queue.add(() => proc(client, message));

    const socketId = client.socket.id;
    console.log(
        ":rocket: ~ file: client.ts ~ line 144 ~ start ~ socketId",
        socketId
    );

    // Get a list of unread messages to proccess messages sent during downtime
    // const unreadMessages = await client.getAllUnreadMessages();
    // unreadMessages.forEach((message) => processMessage(client, message));

    await client.onMessage(processMessage);
    queue.start();
}

start().catch((e) => console.log("Error", e.message));
// create({
//         headless: true,
//         autoRefresh: true,
//         sessionId: "Ahmed",
//         eventMode: true,
//         // logging: [{ "type": "console" }],
//         // debug: true,
//         // logConsoleErrors: true,
//         licenseKey: "6106AABF-7E1E4631-BB6F5D01-F4ED8C6F",
//         disableSpins: true,
//         useChrome: true,
//         callTimeout: 300 * 1000,
//     })
//     .then((client) => start(client));

async function preChecks(client, message, command) {
    // Set up a few flags
    const { id, from, sender, isGroupMsg, chat } = message;
    const groupAdmins = isGroupMsg ?
        await client.getGroupAdmins(chat.groupMetadata.id) :
        "";
    const currentRoles = [];
    const isGroupAdmin = groupAdmins.includes(sender.id) || false;
    isGroupAdmin ? currentRoles.push("admin") : null;
    const isBotGroupAdmin = groupAdmins.includes("97433933830@c.us") || false;
    const isModeerKabeer = sender.id.includes("97455228223");

    // Get Command Permissions
    const isCommandGroupOnly =
        command.groupOnly == undefined || command.groupOnly == null ?
            false :
            command.groupOnly;
    const isCommandMustAdmin =
        command.mustBeAdmin == undefined || command.mustBeAdmin == null ?
            false :
            command.mustBeAdmin;

    // Get the roles allowed to use this command
    const allowedRoles =
        command.roles == undefined || command.roles == null ? ["all"] :
            command.roles;
    // console.log("Allowed Roles:", allowedRoles)
    // console.log("Current Sender Roles:", currentRoles)

    // Check if command is groups only and make sure it is in a group
    if (isCommandGroupOnly && !isGroupMsg) {
        client.reply(from, "This command is only available in groups ⚠️", id);
        return false;
    }

    // console.log("isCommandMustAdmin", isCommandMustAdmin)
    // console.log("isBotGroupAdmin", isBotGroupAdmin)

    if (isCommandGroupOnly && isCommandMustAdmin && !isBotGroupAdmin) {
        client.reply(
            from,
            "I don't have the required admin privilages to perform this action 🤡",
            id
        );
        return false;
    }

    // Roles check
    // If modeer, allow everything
    if (isModeerKabeer) return true;

    if (!allowedRoles.includes("all") &&
        !currentRoles.some((item) => allowedRoles.includes(item))
    ) {
        client.reply(
            from,
            "Slow down cowboy 🤠, You are not allowed to use this command.",
            id
        );
        return false;
    }

    return true;
}

async function getGroupSettings(groupID) {
    const groups = JSON.parse(fs.readFileSync(`${__dirname}/assets/groups.json`));

    if (!(groupID in groups.registered)) {
        const defaultData = {
            settings: {
                stickersAllowed: true,
                ignored: [],
                regexFilters: [],
                warnings: [],
                maxWarnings: 5,
            },
        };
        groups.registered[groupID] = defaultData;
        fs.writeFileSync(`${__dirname}/assets/groups.json`, JSON.stringify(groups));
    }
    maxWarnings = groups.registered[groupID].settings.maxWarnings;
    return groups.registered[groupID];
}

async function checkRegexFilter(client, message, groupSettingsclient, body) {
    for (let i = 0; i < groupSettings.regexFilters.length; i++) {
        let regex = new RegExp(groupSettings.regexFilters[i], "gi");

        if (regex.test(filterBody)) {
            let warningsCount = groupInfo.settings.warnings.filter(
                (x) => x === sender.id
            ).length;
            if (warningsCount >= maxWarnings - 1) {
                client.sendTextWithMentions(
                    from,
                    `@${sender.id.replace(
                        /@c.us/g,
                        ""
                    )} You Have Exceeded The Maximum Number Of Warnings. 🔴\n\nKicking.. 🧨`
                );
                if (!isBotGroupAdmins)
                    return client.reply(
                        from,
                        "I am unable to kick the participant because I am not an admin 🤡",
                        id
                    );
                await client.removeParticipant(groupId, sender.id);
            }
            warnUser(warningsCount);
            if (!isBotGroupAdmins)
                return client.reply(
                    from,
                    "A blacklisted phrase has been detected but I am unable to delete the message because I am not an admin!",
                    id
                );
            await client.deleteMessage(from, id).catch((err) => {
                console.error("Delete Message Error:", err);
            });
            break;
        }
    }
}