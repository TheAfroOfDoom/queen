module.exports = {
    name: 'dust',
    aliases: ['d'],
    description: 'Bites the dust',
    async execute(msg, args, client) {    
        m = 'bite my dust :) <@' + msg.author.id + '>';
        msg.channel.send(m);
    },
};