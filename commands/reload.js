module.exports = {
    name: 'reload',
    aliases: ['r'],
    description: 'Reloads config.json settings.',
    async execute(msg, args, client) {
        module.exports.reloadMessage = await msg.channel.send("Reloading...")
            .then(message => {return message;})
            .catch(console.error);
        
        module.exports.reload();
    },
    reload() {
        delete require.cache[require.resolve('./../config.json')];  
        module.exports.config = require('./../config.json');
        module.exports.config.callProperties.maxAge = module.exports.config.callProperties.maxAge.split(" ");     // '2 hours' => ['2', 'hours']
        module.exports.args = [null, "reload"];
    },
    async writeConfig(config) {
        // Sort aliases alphabetically: https://stackoverflow.com/a/31102605
        const aliasesOrdered = {};
        Object.keys(config.aliases).sort().forEach(function(key) {
            aliasesOrdered[key] = config.aliases[key];
        });
        config.aliases = aliasesOrdered;

        // Merge config.callProperties.maxAge back into a string
        config.callProperties.maxAge = `${config.callProperties.maxAge[0]} ${config.callProperties.maxAge[1]}`;

        // Write to disk
        const fs = require('fs');
        const util = require('util');
        writeFile = util.promisify(fs.writeFile);
        await writeFile("./config.json", JSON.stringify(config, null, 4), function(err) {
            if(err) throw err;
        });

        module.exports.reload();
    }
};
