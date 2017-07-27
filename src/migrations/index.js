/**
 * This is the list of migrations
 *
 * The key's are version ids, and should be prefixed with timestamps
 * (new Date()).toISOString().replace(/-|\..*|:/g, "")
 *
 * This way migrations can be applied in chronological order, since each migrations
 * builds on the previous one
 */
module.exports = {
    "20170727T211511_appvars": require("./20170727T211511_appvars"),
    "20170727T223943_entvars": require("./20170727T223943_entvars"),
};
