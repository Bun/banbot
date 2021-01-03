const fs = require('fs');
const { ChatClient } = require('dank-twitch-irc');
const { userConfig } = require('./config.js');

// Default config values
const config = {
    // Username (lowercase)
    username: "justinfan6969",

    // Specify an OAuth token with the "oauth:" prefix
    password: "blah",

    // Optional: use different credentials for the monitor connection
    monitorUsername: null,
    monitorPassword: null,

    channels: [],

    // Minimum timeout duration to report (8h)
    minTimeoutDuration: 28800,

    // Delay/collect on first event (15s)
    initialResponseTime: 15000,

    // Delay/collect on follow-up events (60s)
    followupResponseTime: 60000,

    // Message formatting:
    channelSuffix: ': ',
    multiJoin: ' - ',

    // messagePrefix returns the prefix that will be used for the message. You
    // can include things like /me here, or vary the message by channel.
    messagePrefix: function(channel, ban) {
        if (ban)
            return 'DOCING';
        return 'MODS';
    },

    // formatLong is used to format messages when there are only a small number
    // of events.
    formatLong: function(msg) {
        if (msg.banDuration == null) {
            return `${msg.targetUsername} was banned`;
        }
        return `${msg.targetUsername} was timed out for ${formatSeconds(msg.banDuration)}`;
    },

    // formatShort is used to format messages when there are a lot of events.
    formatShort: function(msg) {
        if (msg.banDuration == null) {
            return `${msg.targetUsername} banned`;
        }
        return `${msg.targetUsername} ${formatSeconds(msg.banDuration)}`;
    }
};


const validChannel = function(c) {
    // TODO: check if valid channel name
    return String(c).replace(/^#/, '').toLowerCase();
};

// Apply user configuration
Object.assign(config, userConfig);

const isAnonymous =  config.password == 'blah';
config.announceTo = config.announceTo.map(validChannel);
const channels = config.channels.map(validChannel);
if (!channels.length) {
    console.log('No channels specified');
    return;
}

const formatSeconds = function(secs) {
    let s = '';
    if (secs >= 86400) {
        s += `${(secs / 86400) | 0}d`;
        secs %= 86400;
    }
    if (secs >= 3600) {
        s += `${(secs / 3600) | 0}h`;
        secs %= 3600;
    }
    if (secs >= 60) {
        s += `${(secs / 60) | 0}m`;
        secs %= 60;
    }
    if (s === '' || secs > 0) {
        s += `${secs}s`;
    }
    return s;
};


//
// Buffering & sending connection
//

// msgBuffer holds messages until they are ready to send.
const msgBuffer = {
    timer: null,
    empty: 0,
    msgs: []
};

const sender = new ChatClient({
    username: config.username,
    password: config.password,
});

sender.on('JOIN', msg => console.log(`[sender] Joined ${msg.channelName}`));
sender.on('PART', msg => console.log(`[sender] Left ${msg.channelName}`));
sender.on('ready', async () => {
    console.log('[sender] Connected');
    // Optional; be aware that joining from multiple connections may result in
    // JOIN rate limit issues
    await sender.joinAll(config.announceTo);
});

if (!isAnonymous) sender.connect();

const addBufferedMessage = function(msg) {
    msgBuffer.msgs.push(msg);
    if (msgBuffer.timer == null) {
        msgBuffer.timer = setTimeout(flushBuffers, config.initialResponseTime);
    }
};

const cmp = function(a, b) {
    if (a == null && b != null) {
        return 1;
    } else if (b == null && a != null) {
        return -1;
    } else if (a == b) {
        return 0;
    }
    return (a > b) ? 1 : -1;
}

const flushBuffers = function() {
    if (msgBuffer.msgs.length == 0) {
        // Stop delaying if we've buffered nothing
        if (msgBuffer.empty > 2) {
            msgBuffer.empty = 0;
            msgBuffer.timer = null;
            return;
        }
        msgBuffer.empty++;
        msgBuffer.timer = setTimeout(flushBuffers, config.followupResponseTime);
        return;
    }
    const msgs = msgBuffer.msgs;
    msgBuffer.msgs = [];
    msgBuffer.empty = 0;
    msgs.sort((a, b) =>
        (a.channelName != b.channelName)
        ? cmp(a.channelName, b.channelName)
        : (
            (a.targetUsername != b.targetUsername)
            ? cmp(a.targetUsername, b.targetUsername)
            : cmp(a.banDuration, b.banDuration)
        ));
    let parts = [];
    const formatter = msgs.length <= 5 ? config.formatLong : config.formatShort;
    if (msgs.length > 5) {
        parts.push(`${msgs.length}x `);
    }
    let channelName, username;
    let ban = false;
    for (const msg of msgs) {
        if (msg.banDuration == null)
            ban = true;
        if (channelName != msg.channelName) {
            channelName = msg.channelName;
            username = undefined;
            parts.push(msg.channelName);
            parts.push(config.channelSuffix);
        } else if (username == msg.targetUsername) {
            // Skip "duplicate"
            continue;
        } else {
            parts.push(config.multiJoin);
        }
        username = msg.targetUsername;
        parts.push(formatter(msg));
    }
    const events = parts.join('');
    if (isAnonymous) {
        console.log(events);
    } else {
        config.announceTo.forEach(function(c) {
            let formatted = config.messagePrefix(c, ban) + ' ' + events;
            if (formatted.length > 490) {
                formatted = formatted.substr(0, 490) + '…';
            }
            sender.privmsg(c, formatted);
        });
    }
    msgBuffer.timer = setTimeout(flushBuffers, config.followupResponseTime);
};


//
// The monitor connection collects bans and timeouts and stores them in the
// message buffer.
//

const monitor = new ChatClient({
    username: config.monitorUsername || config.username,
    password: config.monitorPassword || config.password
});

monitor.on('CLEARCHAT', msg => {
    if (msg.targetUsername == null) {
        return;
    } else if (msg.banDuration != null && msg.banDuration < config.minTimeoutDuration) {
        return;
    }

    addBufferedMessage({
        channelName: msg.channelName,
        targetUsername: msg.targetUsername,
        banDuration: msg.banDuration
    });
});

monitor.on('JOIN', msg => console.log(`[monitor] Joined ${msg.channelName}`));
monitor.on('PART', msg => console.log(`[monitor] Left ${msg.channelName}`));
monitor.on('ready', async () => {
    console.log(`[monitor] Connected`);
    await monitor.joinAll(channels);
});

setTimeout(function() {
    // Delay, since Twitch doesn't like multiple concurrent connects much
    monitor.connect();
}, 1500);
