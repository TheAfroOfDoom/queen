/*/
 *  Jordan Williams / TheAfroOfDoom
 *
 * A fun bot for Albion Online guilds that will pop into a Discord Voice channel
 * whenever a new kill is detected and play a soundbite from Queen's
 * "Another One Bites the Dust".
/*/

// Debug mode
const DEBUG = false;

// Libraries
const Albion = require('albion-api');
const Discord = require('discord.js');
const fs = require('fs');
const moment = require('moment');

// Config values
var {prefix, token, commandChannels, guildId, serverId, aliases, callProperties} = require('./config.json');    // NOTE: cP.interval is in ms
callProperties.maxAge = callProperties.maxAge.split(" ");     // '2 hours' => ['2', 'hours']
callProperties.maxAge[0] = Number(callProperties.maxAge[0]);  // '2' => 2

// Classes
class Kill {
    constructor(moment, fame, id, killer) {
      this.moment = moment;
      this.fame = fame;
      this.id = id;
      this.killer = killer;
      // this.victim = victim;
    }
}

class APICall {
    constructor(moment, duration) {
        this.moment = moment;
        this.duration = duration;
        //console.info(`\n${this.moment.format("mm:ss.SS")}`);
    }

    pass() { // Uptime (positive)
        this.duration = moment.duration(moment().diff(this.moment));
        //console.info(`\npass: ${moment().format("mm:ss.SS")}`);
    }

    fail() {    // Downtime (negative)
        this.duration = moment.duration(this.moment.diff(moment()));
        //console.info(`\nfail: ${moment().format("mm:ss.SS")}`);
    }

    isExpired() {
        return( moment.duration(moment().diff(this.moment, callProperties.maxAge[1])) > 
                moment.duration(callProperties.maxAge[0], callProperties.maxAge[1]));
    }
}

// Methods
function calculateUptime() {
    // Remove old API calls from queue first
    while(apiCallQueue.length != 0 && apiCallQueue[0].isExpired()) {
        apiCallQueue.shift();
    }

    // Empty queue means no calculation can be done
    if(apiCallQueue.length == 0) {
        return "  0% API uptime";
    }
    
    // Iterate through queue and add uptime and downtime
    uptime = moment.duration(0), totalTime = moment.duration(0);
    //u = 0, d = 0;
    for(call of apiCallQueue) {
        if(call.duration > 0) { // API uptime
            uptime.add(call.duration);
            totalTime.add(call.duration);
            //u += call.duration.as('milliseconds');
        } else {                // API downtime
            totalTime.subtract(call.duration);
            //d += call.duration.as('milliseconds');
        }
    }
    
    //console.info(`\nu: ${u}`);
    //console.info(`d: ${d}`);

    // Return percentage
    s = `${Math.round(100 * (uptime / totalTime))}`.padStart(3, " ") + `% API uptime`;
    //s += ` | time till maxInt: ${Number.MAX_SAFE_INTEGER - totalTime.as('milliseconds')} ms`;
    return s;
}

function updateConsole(arg){
    // Calculate API Uptime
    uptime = calculateUptime();

    b = '';
    s = '';
    t = `${moment().format('YYYY-MM-DDTHH:mm:ss')}`;
    switch(arg) {
        case 'apiFail':
            s = 'API failure.';
            break;

        case 'noNewKills':
            s = 'No new kills.';
            break;

        case 'newKills':
            s = 'New kills!';
            // TODO(jordan): Not sure if this breaks the one-line stuff or not.
            // Probably need to clear this line and the one below it every time to prevent clutter from building?
            //b = '\nAnother one bites the dust...';
            break;

        default:
            throw "Bad argument in updateConsole().";
    }
    process.stdout.cursorTo(0);
    process.stdout.write(`[${t}] ${s} ${uptime}${b}`);
    process.stdout.clearLine(1);    // Only clear to the right of the cursor
}

const getRecentEventsPromise = (...args) => {
  return new Promise ((resolve, reject) => {
    Albion.getRecentEvents(...args, (error, data) => {
        if(error) return reject(error)
        resolve(data);
    })
  })
}

async function importKills(amount) {
    let opts = {};
    opts.limit = amount;
    opts.guildId = guildId;

    if(DEBUG) {
        data = fs.readFileSync('./testing/killboard.json').toString();
        killData = JSON.parse(data);
    } else {
        if(apiCall == undefined) {
            apiCall = new APICall(moment());
            //console.info("apiCall undef");
        }
        killData = await getRecentEventsPromise(opts).then(data => {
            apiCall.pass();
            apiCallQueue.push(apiCall);
            return data;
        })
        .catch(error => {
            apiCall.fail();
            apiCallQueue.push(apiCall);
            updateConsole('apiFail');
            return undefined;   // Can't work if we reach an error
        })
        apiCall = new APICall(moment());    // Also keep track of time in between calls. Just include it with the next successful/failed call.
    }

    if(killData == undefined) return undefined;
    kills = [];
    for(i of [...Array(amount).keys()]) {
        event = killData[i];

        // Extract:
        m = moment(event.TimeStamp);  // Moment
        f = event.TotalVictimKillFame // Fame
        id = event.EventId            // ID
        k = event.Killer.Name         // Killer

        // Save Kill class to list
        _kill = new Kill(m, f, id, k);
        kills.push(_kill);
    }

    if(DEBUG) {
        //console.info(kills);
    }

    // If only a singular kill was requested, just return that one kill
    if(kills.length == 1)
        return(kills[0]);

    return kills;
}

async function getInitialKillList() {
    return await importKills(callProperties.numKills).then(data => {
      return data;
  })
}

function printKills(kills) {
    for(kill of kills) {
        console.info("- - - - - - - - - -")
        console.info(`${kill.id}: ${kill.fame}`)
        console.info("- - - - - - - - - -\n")
    }
}

function matchesAliases(name, members) {
    // Check all the aliases
    for(alias of aliases) {
        alias = alias.split("|");
        // If the username is found
        if(name == alias[0]) {
            // Make list of discord IDs in VC
            memIDs = []
            for(member of members) {
                memIDs.push(member.id.toString());
            }

            // If the user's discord ID is found in the list of member IDs currently in voice chat
            if(memIDs.includes(alias[1])) {
                return true;
            }
            break;  // We already matched current name to alias
        }
    }
    return false;
}

function sort(subList) {
    // https://www.geeksforgeeks.org/python-sort-list-according-second-element-sublist/
    // Code to sort the lists using the second element of sublists
    // Inplace way to sort, use of third variable
    l = subList.length
    for(i of [...Array(l).keys()]) {
        for(j of [...Array(l - i - 1).keys()]) {
            if(subList[j][1] > subList[j + 1][1]) {
                tempo = subList[j];
                subList[j]= subList[j + 1];
                subList[j + 1]= tempo;
            }
        }
    }
    return subList;
}

async function refresh() {
    // Grab latest kill
    latestKill = await importKills(1).then(data => {
        return data;
    })
    .catch(error => {
        return undefined; // Can't work if we reach an error
    })

    // Catch bad latestKill
    if(latestKill == undefined) {
        // Repeat
        setTimeout(function() {
            refresh();
        }, callProperties.interval)

        return;
    }

    // If have not grabbed mostRecentKill yet, set it to latestKill
    if(mostRecentKill == undefined) {
        // Grab initial kill list upon bot startup
        kills = await getInitialKillList().then(data => {
            return data;
        });
        mostRecentKill = kills[0];

        // Repeat
        setTimeout(function() {
            refresh();
        }, callProperties.interval)

        return;
    }

    if(DEBUG)
        console.info(`${latestKill.id}`);

    if(latestKill.id == mostRecentKill.id) {
        updateConsole('noNewKills');
        // Repeat
        setTimeout(function() {
            refresh();
        }, callProperties.interval)

        return;
    }

    // If it is not the same as mostRecentKill, continue
    if(latestKill.id != mostRecentKill.id) {

        //console.info(latestKill.id);
        // Otherwise, update list of kills
        newKills = await importKills(callProperties.numKills).then(data => {
            return data;
        })
        .catch(error => {
            return undefined; // Can't work if we reach an error
        })

        // If the mostRecentKill is not the same as the last time, go bite the dust
        if(newKills != undefined) {
            kills = newKills;
            updateConsole('newKills');
            await biteTheDust(kills);
        }
    }

    // Repeat
    setTimeout(function() {
        refresh();
    }, callProperties.interval)
}

async function biteTheDust(kills) {
    // Sum total fame since last check and get list of killers' names
    totalFame = 0;
    killers = [];

    index = 0
    while(mostRecentKill.id != kills[index].id) {

        // Add fame
        totalFame += kills[index].fame;

        // Save killer name
        killers.push([kills[index].killer, kills[index].fame]);

        // Increment index
        index += 1;

        // If we're pulling from a recentKills list > 10, need this line if there are at least 10 new kills
        if(index >= callProperties.numKills) {
            break;
        }
    }

    // Determine which sound to play
    // zvz
    if(killers.length >= 3 && totalFame > 240000)
        src = 'zvz';
    // multiple
    else if(killers.length >= 3)
        src = 'multiple';
    // lowestFame
    else if(totalFame <= 5000)
        src = '0';
    // lowerFame
    else if(totalFame <= 25000)
        src = '1';
    // lowFame
    else if(totalFame <= 40000)
        src = '2';
    // mediumFame
    else if(totalFame <= 75000)
        src = '3';
    // highFame
    else if(totalFame <= 110000)
        src = '4';
    // higherFame
    else if(totalFame <= 150000)
        src = '5';
    // highestFame
    else
        src = '6';

    // Sort killers by fame
    killers = sort(killers)

    // Join channel with the killer with the most fame
    // if they are not in a voice channel, join the one with the most people
    // if all are empty, do not join a voice channel

    // Check through every server the bot is in
    for(guild of client.guilds.cache) {
        // Inglorious Pixels
        if(guild[0].toString() == serverId) {
            // Check each killer in the list, with most fame first
            for(killer of killers) {
                // Check each voice channel
                //console.info(guild[1].channels.cache.array()[0]);
                for(channel of guild[1].channels.cache.array().filter(c => c.type == "voice")) {
                    // If the killer is in the voice channel, join it and bite the dust!
                    if(matchesAliases(killer[0].toLowerCase(), channel.members.array())) {
                        await client.commands.get("play").execute(channel, src, client);
                        mostRecentKill = kills[0];
                    }
                }
            }
        }
    }

    /*
    // TODO(jordan): If no killers are in the voice channel, bite the dust in the one with the most people
    await playAudio(client, src, client.getChannel(566413371608662039))
    */
    mostRecentKill = kills[0];
}

// Initialize client
var client = new Discord.Client();
var apiCallQueue = [];      // Keeping track of API uptime
var apiCall = undefined;    // Globally accessible apiCall

// Dynamically search and add commands in `commands` folder
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

client.on('ready', () => {
    console.info(`Logged in as ${client.user.tag}.`);
    setTimeout(function() {
        refresh();
    }, callProperties.interval)
});

client.on('message', message => {

  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // `files` or `discord-setup-discussion` channel
  if(commandChannels.includes(message.channel.id.toString())) {

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
    //console.info(`Called command: ${command}`);

    if(DEBUG) {
      //console.info(args);
    }

    if (!client.commands.has(command)) {
      return;
    }

    try {
      client.commands.get(command).execute(message, args, client);
    } catch (error) {
      console.error(error);
    }
  }
});

var kills = undefined;
var mostRecentKill = undefined;

client.login(token);