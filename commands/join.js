module.exports = {
    name: 'join',
    description: 'Join the voice channel the command-sender is in.',
    async execute(msg, args, client) {
        msg.member.voiceChannel.join();
    },
};