module.exports = {
    name: 'data',
    aliases: ['d', 'explore', 'e'],
    description: 'Explores the most recent data fetched from //get.',
    async execute(msg, args, client) {
        if(!args) {
            args = ['data'];
        } else {
            args = ['data'].concat(args);
        }
        await client.commands.get("get").execute(msg, args, client);
    }
};

/*/
    crystalLeague matches:

    teamXTimeline:
        EventType:
            null    => Start of match       150
            2       => Team Death           -4
            3       => Enemy obj. capture   -1
            4       => Every minute         -10 if enemy owns +1/+2 obj., -20 if enemy owns all 3 obj. 0 if equal obj.
/*/