# Ban monitor bot

This experimental bot is intended to to make cross-channel moderation easier by
collecting bans/timeouts and announcing them to a collection channel.


## Installation

This bot requires **node** and **npm**:

```bash
cd banbot
npm install
```

## Running

Copy `config.example.js` to `config.js` and modify it to fit your needs.
To run the bot:

```bash
cd banbot
node .
```

Tips: you can define your own formatLong function in the configuration file to
link to (for example) and online log viewer. Just copy the function from
`banbot.js` and modify it in the configuration. You can also define your own
message prefixes for bans/timeouts. Check the code for all config values!
