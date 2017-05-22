var cuid = require("cuid");
var randomWords = require("random-words");
var mkKRLfn = require("../mkKRLfn");

module.exports = function(core){
    return {
        def: {
            uuid:mkKRLfn([], function(args, ctx, callback){
                callback(null, cuid());
            }),
            word:mkKRLfn([], function(args, ctx, callback){
                callback(null,randomWords())
            }) 
        }
    };
};
