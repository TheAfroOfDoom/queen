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
    }
};
