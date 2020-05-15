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
        } catch {
            badArgument(0, msg, args, client);
        }

        client.commands.get("reload").reload();
    },
};

async function badArgument(pos, msg, args, client, path = "", scold = true) {
    tree = [
        'list',
        'add',
        'get',
        'remove',
        'set'
    ];

    if(scold) {
        s = `\`Bad argument in position ${pos + 1}: ${args[pos]}.\``;
        await msg.channel.send(s);
    }

    path = `\`Usage: ${module.exports.name} ` + path;
    if(pos == 0) {
        s = path + `<`;
        for(t of tree) {
            s += `${t}|`;
        }
        s = s.slice(0, s.length - 1) + '>`';   // slice() => Remove extra '|'
        await msg.channel.send(s);
    } if(pos == 1) {
        x = path.split(" ");
        switch(x[x.length - 1]) {
            case "get":
                s = path + ` <albionUsername|discordID|discordMention>`;
                s += `\nInvalid argument or player does not have an entry in aliases.\``;
                await msg.channel.send(s);
                break;
            case "set":
                s = path + ` <albionUsername|discordID|discordMention>`
        }
    }
}

async function list(msg, args, client) {
    config = require("./../config.json");

    s = "```\n";
    for (const [key, value] of Object.entries(config.aliases)) {
        s += `${key}: ${value}\n`;
    }
    await msg.channel.send(s + "```");
}

async function add(msg, args, client) {
    
}

async function get(msg, args, client) {
    config = require("./../config.json");

    try {
        player = args[1].toLowerCase();
        //console.info(Object.keys(config.aliases).includes(player));
        has = Object.keys(config.aliases).includes(player);
        
        // If input string is in the form of a Discord ID (ex: '167762537989799937')
        if(RegExp(`^\\d{0,18}$`).test(player) && player.length <= 18) {
            has = has || Object.values(config.aliases).includes((await msg.guild.members.fetch(player)).user.id);
        }
        
        // If input string is in the form of a Discord Mention (ex: '<@!167762537989799937>')
        if(RegExp(`^<@!\\d{0,18}>$`).test(player) && player.length <= 22) {
            player = player.slice(3, player.length - 1);    // Grab just the ID part
            has = has || Object.values(config.aliases).includes((await msg.guild.members.fetch(player)).user.id);
        }

        if(!has) {
            // arg was either not an Albion username or Discord mention in the list
            badArgument(1, msg, args, client, "get");
            return;
        }
    } catch (e) {
        // bad arg
        badArgument(1, msg, args, client, "get");
        return;
    }

    s = "`";
    for(const [albionUsername, discordID] of Object.entries(config.aliases)) {
        if(player == albionUsername || player == discordID || player.split("<@!").slice(player.length - 1) == discordID) {
            s += `Found entry: <${albionUsername}: ${discordID}>\``;
            break;
        }
    }
    await msg.channel.send(s);
}

function remove(msg, args, client) {
    
}

function set(msg, args, client) {
    
}