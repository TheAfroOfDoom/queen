const Discord = require('discord.js');

module.exports = {
    name: 'play',
    description: 'Test audio files',
    execute(x, args, client) {
        if(x instanceof Discord.Message)
            playAudio(client, args, x.member.voice.channel);
        else if(x instanceof Discord.VoiceChannel)
            playAudio(client, args, x);
        else
            console.info("Failed to playAudio: Invalid argument in position 0.");
    }
};

async function playAudio(client, args, channel) {

    // If the author is not in a channel, return
    if(channel == undefined) {
        return;
    }

    // If the bot is already in a voice channel in the guild, return
    if(client.voice.connections.has(channel.guild.id)) {
        //console.info('Tried to join a channel while already in one.');
        return;
    }

    // Base sounds folder
    let path = './../sounds';
    let src = args[0];

    // src presets
    switch(src) {
        case 'zvz':
            path += '/multiple/zvz.wav';
            break;
        case 'multiple':
            path += '/multiple/multiple_medium_fame.wav';
            break;
        case '0':
            path += '/single/lowest_fame.wav';
            break;
        case '1':
            path += '/single/lower_fame.wav';
            break;
        case '2':
            path += '/single/low_fame.wav';
            break;
        case '3':
            path += '/single/medium_fame.wav';
            break;
        case '4':
            path += '/single/high_fame.wav';
            break;
        case '5':
            path += '/single/higher_fame.wav';
            break;
        case '6':
            path += '/single/highest_fame.wav';
            break;
        default:
            return;
    }

    // Join the channel if the author is in one
    // NOTE(jordan): Change which is commented for global killboard vs. IP killboard
    channel.join().then(connection => {

        const dispatcher = connection.play(path);
        dispatcher.on("speaking", speaking => {
            if(!speaking) {
                //setTimeout(function(){ channel.leave(); }, 100);
                channel.leave();
            }
        });

    }).catch(err => console.log(err));
}