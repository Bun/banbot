exports.formatSeconds = function(secs) {
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
