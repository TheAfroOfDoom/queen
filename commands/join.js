module.exports = {
    name: 'join',
    description: 'Join the voice channel the command-sender is in.',
    execute(msg, args, client) {
        msg.member.voiceChannel.join();
    },
};