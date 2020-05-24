const config = require('./../config.json');

module.exports = {
    name: 'purge',
    aliases: ['p'],
    description: 'Purges messages from a channel.',
    async execute(msg, args, client) {
        try {
            userId = args[0].replace("!", "").replace("<@", "").replace(">", "");
            regexId = new RegExp(`^\\d{0,18}$`);    // Discord ID format
            if(!regexId.test(userId)) {
                throw 'Not an ID.'
            }
            amount = parseInt(args[1]) || 10;   // Default amount = 10
            if(amount > 100) {amount = 100}     // max = 100

            messages = await msg.channel.messages.fetch({limit: amount})
                        .then(messages => {return messages});
            
            // Filter messages by author
            messages = messages.filter(m => m.author.id === userId).array();
            msg.channel.bulkDelete(messages).catch(error => {console.error});
            // Bulk deletes all messages that have been fetched and are not older than 14 days (due to the Discord API)
        } catch(e) {
            await msg.channel.send(`Usage: \`${config.prefix}purge <user> [amount]\``);
        }
    }
};
