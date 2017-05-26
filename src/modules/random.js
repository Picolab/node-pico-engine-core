var cuid = require("cuid");
var mkKRLfn = require("../mkKRLfn");
var randomWords = require("random-words");

module.exports = function(core){
    return {
        def: {
            uuid: mkKRLfn([
            ], function(args, ctx, callback){
                callback(null, cuid());
            }),
            word: mkKRLfn([
            ], function(args, ctx, callback){
                callback(null, randomWords());
            }),
        }
    };
};
