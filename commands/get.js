module.exports = {
    name: 'get',
    aliases: ['g', 'call', 'c'],
    description: 'Pull from the Albion API using arguments.',
    data: {
        displayMsg: undefined,
        rootNode: undefined,
        node: undefined,
        key: '',
        title: '',
        query: ''
    },
    async execute(msg, args, client) {
        if(typeof args === 'string') {
            // Manually called by the bot
            args = args.split(' ');
        }

        if(args.length == 0) {
            badArgument(0, msg, args, client, "", false)
            return;
        }

        // Call types/aliases
        switch(args[0].toLowerCase()) {
            case 'data':
                exploreData(msg, args, true);
                return;

            case 'kills':
            case 'kill':
            case 'k':
            case 'events':
            case 'event':
            case 'e':
                args[0] = 'events';
                break;

            case 'crystalleague':
            case 'crystals':
            case 'crystal':
            case 'c':
                args[0] = 'matches/crystalleague';
                break;
            /*
            matches/crystalleague (default limit=50)
            matches/crystalleague/topplayers
            matches/crystalleague/topguilds
            matches/crystalleague/<ID>
            */

            case 'guild':
            case 'gvg':
                args[0] = 'guildmatches/past';
                break;
            /*
            guildmatches/past
            guildmatches/<id>
            */

            case 'crystalgvg':
            case 'cgvg':
            case 'cg':
                args[0] = 'matches/crystal';
                break;
            /*
            matches/crystal
            matches/crystal/<matchId>
            */

            default:
                badArgument(0, msg, args, client);
                return;
        }

        // Translate -args to object properties
        options = {}, i = 1;
        for(arg of args.slice(1)) {
            // Args must match regex: -\w+=\w+
            regex = new RegExp(`^-\\w+=\\w+$`); 
            if(regex.test(arg)) {
                try {   
                    const equalsIndex = arg.indexOf('=');
                    optionType = arg.substring(1, equalsIndex);
                    optionValue = arg.substring(equalsIndex + 1)
    
                    options[optionType] = optionValue;
                } catch(e) {
                    console.log(e)
                    badArgument(i, msg, args, client);
                }
            }
            i++;
        }

        try {
            if(msg) {
                newMsg = await msg.channel.send("Calling API...");
                newMsgMoment = moment();
            }
            response = await callAPI(args[0], options)
                            .then(data => {return data})
                            .catch(error => {/*console.log(error)*/return [undefined, undefined]});
            data = response[0], query = response[1];
            if(msg && data) {   // Ignore manual calls from bot.
                module.exports.data.rootNode = data;
                module.exports.data.node = undefined;
                module.exports.data.key = 'data';
                module.exports.query = query;
                module.exports.data.title = args[0] + module.exports.query;
            }
            if(msg) {
                ms = moment().diff(newMsgMoment);
                if(data) {
                    s = `\`\`\`\n${JSON.stringify(data, null, 2)}\`\`\``;
                    // Post a pastebin if msg too long
                    if(s.length > DISCORD_MAX_MSG_LENGTH) {
                        // Pastebin
                        if(args.includes('-paste')) {
                            paste = await createPastebin(s, msg, client);
                            if(paste) {
                                await newMsg.edit(`${paste} \`(${ms}ms)\``);
                            } else {
                                await newMsg.edit(`Response too long \`(${s.length})\`. Failed to create new paste. \`(${ms}ms)\``);
                            }
                        } else { // Explorable data
                            await newMsg.edit(`Object received \`(${s.length})\`. \`(${ms}ms)\``);
                            exploreData(msg, args);
                        }
                    } else {
                        await newMsg.edit(s + `\`${ms}ms\``);
                    }
                } else {
                    await newMsg.edit(`API failure. \`(${ms}ms)\``);
                }
            }
            return data;
        } catch(e) {
            console.log(e);
            if(msg) {badArgument(0, msg, args, client);}
        }
    }
};

// Constants
const config = require("../config.json");
const debug = require('debug');
const moment = require('moment');
const pastebinAPI = require('pastebin-js');
const request = require('request');

const ALBION_API_BASE_URL = `https://gameinfo.albiononline.com/api/gameinfo`;
const DISCORD_MAX_MSG_LENGTH = 2000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function exploreData(msg, args, ui = false) {
    try {
        // REVIEW(jordan): Stuff might all need to be <module.exports>.
        // Not sure how pointers/references work in JS.
        data = module.exports.data;
        displayMsg = data.displayMsg;
        rootNode = data.rootNode;
        node = data.node;
        let err = '';

        if(!node) {
            node = rootNode;
        }
        if(!rootNode) {
            await msg.channel.send(`No previous data fetched. (Use \`//get\` first.)`);
            return;
        }

        // User input
        if(ui && args.length > 1) {
            k = args[1];    // Key
            //console.info(args);
            uiBlock: try {
                // Special movement flags
                if(k[0] == '-') {
                    switch(k.slice(1)) {
                        case 'rootNode':
                        case 'root':
                        case 'r':
                            module.exports.data.node = rootNode;
                            module.exports.data.key = 'root';
                            break;

                        case 'up':
                        case 'u':
                            // TODO(jordan): Go up one level only?    
                    }
                    // Refresh important vars
                    data = module.exports.data;
                    node = data.node;
                    break uiBlock;
                }

                // node is an Array
                if(Array.isArray(node)) {
                    try {
                        const regex = /^\d+$/;
                        i = k.match(regex)[0];
                        if(i >= node.length) {
                            err = `\`Error: <${i}> is out of index.\``;
                            break uiBlock;
                        }
                        module.exports.data.node = node[i];
                        module.exports.data.key += `[${i}]`;
                    } catch {
                        err = `\`Error: <${args[1]}> is not an integer.\``;
                    }
                } else if(typeof node === 'object' && node !== null) {  // node is an object
                    if(!Object.keys(node).includes(k)) {
                        throw 'Key not in object.'
                    }
                    module.exports.data.node = node[k];
                    module.exports.data.key += `.${k}`;
                } else {    // node is a primitive (int, string, etc.)
                    
                }
                // Refresh important vars
                data = module.exports.data;
                node = data.node;
            } catch {
                err = `\`Error: <${k}> is not a visible property of the data.\``;
            }
        }

        // Interact using commands. TODO(jordan): reactions to explore.
        let s = `\`<...${data.title}>:\`\n\`\`\``;

        // If small enough object, just print entire thing.
        let j = JSON.stringify(node, null, 2);
        if(s + j + `\`\`\`` <= DISCORD_MAX_MSG_LENGTH) {
            s += j;
        } else {
            // Display node properties
            s += `${data.key}: `;
            if(Array.isArray(node)) {   // Number of elements in Array
                s += `Array[${node.length}]`;
            } else if(typeof node === 'object' && node !== null) {   // List object properties
                s += `{\n`;
                for([key, value] of Object.entries(node)) {
                    s += `  ${key}: `;
                    if(Array.isArray(value)) {              // Array
                        s += `Array[${value.length}]`;
                    } else if(  typeof value === 'object'   // Object
                                && value !== null) {
                        s += `{ ... }`;
                    } else {                                // primitive
                        s += `${value}`;
                    } s += `\n`;
                }
                s += `}`;
            } else {    // primitive
                s += `${node}`;
            }
        }
        s += `\`\`\`` + err;
        if(!displayMsg) {
            module.exports.data.displayMsg = await msg.channel.send(s);
        } else {
            try {
                await displayMsg.delete();  // If message was purged, this will still work.
            } catch {}
            await sleep(500);   // Required so user client auto-scrolls down.
            module.exports.data.displayMsg = await msg.channel.send(s);
        }
    } catch(e) {
        console.log(e);
        return;
    }
}

function baseRequest(uri, cb) {
    var url = `${ALBION_API_BASE_URL}${uri}`;
    request(url, function (error, response, body) {
        debug(`Url: ${url} statusCode: ${response && response.statusCode}`);
        if(error) {
            cb(error);
        }
        try {
            data = JSON.parse(body);
            cb(null, [data, query]);
        }
        catch(e) {
            cb(e);
            return;
        }
    });
}

function callAPIHelper(callType, opts, cb) {
    opts = opts || {};
    query = "?";
    for([key, value] of Object.entries(opts)) {
        query += `${key}=${value}&`;
    }
    query = query.slice(0, -1); // Remove trialing '?'/'&' for cleanliness.
    // https://gameinfo.albiononline.com/api/gameinfo/events?limit=51&offset=0&guildId=OB1jeKVfTLSpqfAxg3us8w
    baseRequest(`/${callType}` + query, cb);
}

const callAPI = (...args) => {
    return new Promise((resolve, reject) => {
        // TODO(jordan): I should be able to condense callAPIHelper into callAPI, but the syntax is confusing me right now.
        callAPIHelper(...args, (error, data) => {
            if(error) return reject(error)
            resolve(data);
        })
    })
}

async function createPastebin(s, msg, client) {
    const p = config.pastebin;
    pastebin = new pastebinAPI({
        'api_dev_key': p.apiDevKey
    })

    response = await pastebin.createPaste({
        text: s.slice(4, -3),   // Trim markdown formatting
        title: `${client.user.username}: ${msg.author.tag}'s API request via ${msg.content}`,
        format: 'json',
        privacy: 1,             // Unlisted
        expiration: '1H'    // TODO(jordan): Make this editable via bot commands
    })
        .then(data => {return data});

    return response;
}

async function badArgument(pos, msg, args, client, path = "", scold = true) {
    r = '';
    if(scold) {
        r = `Bad argument in position ${pos + 1}: \`${args[pos]}\`.\n`;
    }

    path = `Usage: \`${module.exports.name} ` + path;
    x = path.split(" "), s = `\n\n` + path;
    switch(pos) {
        case 0:
            s = s.slice(1);
            s += `<`;
            tree = [
                'data',
                'events',
                'crystals'
            ];

            for(t of tree) {
                s += `${t}|`;
            }
            s = s.slice(0, -1) + '>`';   // slice() => Remove extra '|'
            break;
    
        case 1:
            switch(x[x.length - 1]) {
                case "get":
                    s += ` <albionUsername|discordID|discordMention>\``;
                    if(args.length >= 2) {
                        s = `Invalid argument or player does not have an entry in alias list.` + s;
                    } else {
                        s = `No player specified.` + s;
                    }
                    break;
                case "add":
                    s += ` <albionUsername> <discordID|discordMention>\``;
                    switch(args[0]) {
                        case 'badAlbion':
                            s = `\`\`\`\nAlbion usernames must only contain alphanumeric characters, dashes, and underscores. Must be between 3-16 characters long.\`\`\`` + s.slice(1);
                            break;

                        case 'noAlbion':
                            s = `Albion user not specified.` + s;
                            break;

                        case 'alreadyExistAlbion':
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
