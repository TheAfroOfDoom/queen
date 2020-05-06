module.exports = {
    name: 'dust',
    description: 'Bites the dust',
    execute(msg, args, client) {    
        m = 'bite my dust :) <@' + msg.author.id + '>';
        msg.channel.send(m);
    },
};