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
            eval(args[0]);
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
        'remove',
        'set'
    ];

    path = `\`Usage: ${module.exports.name} ` + path;
    if(scold) {
        s = `\`Bad argument in position ${pos + 1}: ${args[pos]}.\``;
        await msg.channel.send(s);
    }

    if(pos == 0) {
        s = path + `<`;
        for(t of tree) {
            s += `${t}|`;
        }
        s = s.slice(0, s.length - 1) + '>`';   // slice() => Remove extra '|'
        await msg.channel.send(s);
    }
}

function list(args) {
    
}

function add(args) {
    
}

function remove(args) {
    
}

function set(args) {
    
}