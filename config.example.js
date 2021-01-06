const utils = require('./utils.js');

exports.userConfig = {
    // The username (lowercase) of the sending bot
    username: "myuser",
    // The OAuth token (with "oauth:" prefix) of this account; the token from
    // Chatterino will work
    password: "oauth:abc12345",
    // A list of channels to monitor
    channels: [
        "foo", "bar"
    ],
    // Channels to announce events to
    announceTo: ["myuser"],

    // formatLong is used to format messages when there are only a small number
    // of events.
    formatLong: function(msg) {
        const log = `https://www.twitch.tv/popout/${msg.channelName}/viewercard/${msg.targetUsername}`;
        if (msg.banDuration == null) {
            return `${msg.targetUsername} was banned ${log}`;
        }
        return `${msg.targetUsername} was timed out for ${utils.formatSeconds(msg.banDuration)} ${log}`;
    }
};
