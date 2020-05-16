module.exports = {
    name: 'alias',
    aliases: ['a', 'aliases', 'names'],
    description: 'Modify Albion username-Discord ID pairs.',
    async execute(msg, args, client) {
        if(args.length == 0) {
            badArgument(0, msg, args, client, "", false)
            return;
        }
        
        try {
            await eval(args[0] + "(msg, args, client)");
        } catch(e) {
            //console.log(e);
            badArgument(0, msg, args, client);
        }
    },
};

async function badArgument(pos, msg, args, client, path = "", scold = true) {
    r = '';
    if(scold) {
        r = `Bad argument in position ${pos + 1}: \`${args[pos]}\`.\n`;
    }

    path = `Usage: \`${module.exports.name} ` + path;
    x = path.split(" "), s = `\n\n` + path;
    switch(pos) {
        case 0:
            s = s.slice(1, s.length);
            s += `<`;
            tree = [
                'list',
                'add',
                'get',
                'remove',
                'set'
            ];

            for(t of tree) {
                s += `${t}|`;
            }
            s = s.slice(0, s.length - 1) + '>`';   // slice() => Remove extra '|'
            break;
    
        case 1:
            switch(x[x.length - 1]) {
                case "get":
                case "remove":
                    s += ` <albionUsername|discordID|discordMention>\``;
                    if(args.length >= 2) {
                        s = `Invalid argument or player does not have an entry in alias list.` + s;
                    } else {
                        s = `No player specified.` + s;
                    }
                    break;
                case 'set':
                case "add":
                    s += ` <albionUsername> <discordID|discordMention>\``;
                    switch(args[0]) {
                        case 'badAlbion':
                            s = `\`\`\`\nAlbion usernames must only contain alphanumeric characters, dashes, and underscores. Must be between 3-16 characters long.\`\`\`` + s.slice(1, s.length);
                            break;

                        case 'noAlbion':
                            s = `Albion user not specified.` + s;
                            break;

                        case 'alreadyExistAlbion':
                            config = require("./../config.json");
                            albionUsername = args[1];
                            s = `Albion username \`${albionUsername}\` already attached to ${(await msg.guild.members.fetch(config.aliases[albionUsername])).user.tag}.` + s;
                            break;

                        case 'doesNotExistAlbion':
                            albionUsername = args[1];
                            s = `Albion username does not currently exist in the list of aliases.` + s;
                            break;
                    }
                    break;
            }
            break;

        case 2:
            switch(x[x.length - 2]) {
                case 'set':
                case "add":
                    s += ` <discordID|discordMention>\``;
                    switch(args[0]) {
                        case 'badDiscord':
                            s = `Argument is neither a Discord ID nor a mention, or they are not in this server.` + s;
                            break;

                        case 'noDiscord':
                            s = `Discord user not specified.` + s;
                            break;
                    }
                    break;
            }
            break;
    }
    await msg.channel.send(r + s);
}

async function list(msg, args, client) {
    config = require("./../config.json");

    s = "```\n";
    for (const [albionUsername, discordID] of Object.entries(config.aliases)) {
        s += `${albionUsername}: ${discordID}`;

        // This is super laggy. \/
        /*
        if(args.length > 1 && (args[1] == 'tags' || args[1] == 'tag')) {
            try {   // While testing, Discord user might not be in guild anymore.
                userTag = (await msg.guild.members.fetch(discordID)).user.tag;
                s += ` (${userTag})`;
            } catch {}
        }
        */
        s += `\n`;
    }
    await msg.channel.send(s + "```");
}

async function add(msg, args, client) {
    // No Albion name specified in args.
    if(args.length <= 1) {
        args[0] = 'noAlbion';
        badArgument(1, msg, args, client, "add");
        return;
    }

    // Ensure Albion name matches game requirements:
    // "Albion usernames must only contain alphanumeric characters, dashes, and underscores. Must be between 3-16 characters long."
    albionUsername = args[1].toLowerCase(), regex = new RegExp(`^[\\w\-]{3,16}$`);
    if(!regex.test(albionUsername)) {
        args[0] = 'badAlbion';
        badArgument(1, msg, args, client, "add");
        return;
    }

    // Ensure Albion name doesn't already exist in list.
    config = require("./../config.json");
    if(Object.keys(config.aliases).includes(albionUsername)) {
        args[0] = 'alreadyExistAlbion', args[1] = albionUsername;
        badArgument(1, msg, args, client, "add");
        return;
    }

    // No Discord user specified in args.
    if(args.length <= 2) {
        args[0] = 'noDiscord';
        badArgument(2, msg, args, client, `add ${albionUsername}`);
        return;
    }

    // Ensure Discord user exists in Discord server:
    discordUser = args[2].replace("!", "").replace("<@", "").replace(">", "");
    try {
        regexID = new RegExp(`^\\d{0,18}$`);            // Discord ID format

        if(regexID.test(discordUser)) {
            discordUser = (await msg.guild.members.fetch(discordUser)).user;
        } else {
            throw "Didn't match regex";
        }
    } catch {
        args[0] = 'badDiscord';
        badArgument(2, msg, args, client, `add ${albionUsername}`);
        return;
    }

    // NOTE(jordan): At this point we know that the Albion name and Discord user are valid.
    // TODO(jordan): If Discord user is already attached to Albion name(s), prompt for confirmation to add new alias.

    // Add alias to list
    config.aliases[albionUsername] = discordUser.id;

    // Save and reload new config
    await client.commands.get("reload").writeConfig(config);

    // Show confirmation of write
    s = `Added alias: \`<${albionUsername}: ${discordUser.id}>\` (${discordUser.tag}).`;
    await msg.channel.send(s);
}

async function get(msg, args, client) {
    // No player specified.
    if(args.length <= 1) {
        badArgument(1, msg, args, client, "get");
        return;
    }

    config = require("./../config.json");
    player = args[1].toLowerCase();

    x = player.replace("!", "").replace("<@", "").replace(">", "");

    s = '', found = 0, discordUser = undefined;
    for(const [albionUsername, discordID] of Object.entries(config.aliases)) {
        if(player == albionUsername || player == discordID || x == discordID) {
            found++;
            discordUser = discordID;
            s += `\t\`<${albionUsername}: ${discordID}>\`\n`;
        }
    }
    if(found > 0) {
        r = 'Found ', userTag = '';
        if(found > 1) {
            r += `aliases`;
        } else {
            r += `alias`;
        }
        try {   // Discord user might not be in server.
            userTag = (await msg.guild.members.fetch(discordUser)).user.tag;
            userTag = ` for ${userTag}`;
        } catch {}
        await msg.channel.send(`${r}${userTag}:\n${s}`);
        return;
    }
    badArgument(1, msg, args, client, "get");
}

async function remove(msg, args, client) {
    // No Albion name specified in args.
    if(args.length <= 1) {
        badArgument(1, msg, args, client, "remove");
        return;
    }
    
    config = require("./../config.json");
    player = args[1].toLowerCase();

    x = player.replace("!", "").replace("<@", "").replace(">", "");

    s = '', found = 0, discordUser = undefined;
    for(const [albionUsername, discordID] of Object.entries(config.aliases)) {
        if(player == albionUsername || player == discordID || x == discordID) {
            found++;
            discordUser = discordID;
            s += `\t\`<${albionUsername}: ${discordID}>\`\n`;

            // Remove alias from list
            delete config.aliases[albionUsername];
        }
    }
    if(found > 0) {
        r = 'Removed ', userTag = '';
        if(found > 1) {
            r += `aliases`;
        } else {
            r += `alias`;
        }
        try {   // Discord user might not be in server.
            userTag = (await msg.guild.members.fetch(discordUser)).user.tag;
            userTag = ` for ${userTag}`;
        } catch {}

        // Save and reload new config
        await client.commands.get("reload").writeConfig(config);
        // Show confirmation
        await msg.channel.send(`${r}${userTag}:\n${s}`);
        return;
    }

    badArgument(1, msg, args, client, "remove");
}

async function set(msg, args, client) {
    // No Albion name specified in args.
    if(args.length <= 1) {
        args[0] = 'noAlbion';
        badArgument(1, msg, args, client, "set");
        return;
    }

    // Ensure Albion name already exists in list.
    albionUsername = args[1].toLowerCase(), config = require("./../config.json");
    if(!Object.keys(config.aliases).includes(albionUsername)) {
        args[0] = 'doesNotExistAlbion', args[1] = albionUsername;
        badArgument(1, msg, args, client, "set");
        return;
    }

    // No Discord user specified in args.
    if(args.length <= 2) {
        args[0] = 'noDiscord';
        badArgument(2, msg, args, client, `set ${albionUsername}`);
        return;
    }

    // Ensure Discord user exists in Discord server:
    discordUser = args[2].replace("!", "").replace("<@", "").replace(">", "");
    try {
        regexID = new RegExp(`^\\d{0,18}$`);            // Discord ID format

        if(regexID.test(discordUser)) {
            discordUser = (await msg.guild.members.fetch(discordUser)).user;
        } else {
            throw "Didn't match regex";
        }
    } catch {
        args[0] = 'badDiscord';
        badArgument(2, msg, args, client, `set ${albionUsername}`);
        return;
    }

    // Set Albion name's new Discord user
    old = {};
    old.id = config.aliases[albionUsername];
    try {
        old.user = (await msg.guild.members.fetch(old.id)).user;
    } catch {old.user = undefined;}

    // If setting same Discord user, display.
    if(old.id == discordUser.id) {
        s = `\`${albionUsername}\` is already attached to \`${old.id}\``;
        if(old.user != undefined) {
            s += ` (${old.user.tag})`;
        }
        await msg.channel.send(s + `.`);
        return;
    }

    config.aliases[albionUsername] = discordUser.id;

    // Save and reload new config
    await client.commands.get("reload").writeConfig(config);

    // Show confirmation of write
    s = `Set alias: \`<${albionUsername}: ${discordUser.id}>\` (${discordUser.tag}), was \`${old.id}\``;
    if(old.user != undefined) {
        s += ` (${old.user.tag}).`;
    }
    await msg.channel.send(s);
}
