//var crypto;
//var crypto_err;
//try{
//    crypto = require("crypto");
//}catch(err){
//    crypto_err = function(fnName){
//        return function(args, ctx, callback){
//            callback(new Error("This Node runtime lacks crypto support, so the " + fnName + "function is unavailable"));
//        };
//    };
//}
//var ktypes = require("krl-stdlib/types"); // for type checking
var mkKRLfn = require("../mkKRLfn");

module.exports = function(core){
    return {
        def: {

            base64encode: mkKRLfn([
                "str",
            ], function(args, ctx, callback){
                callback(null, Buffer.from(args.str, "utf8").toString("base64"));
            }),

            base64decode: mkKRLfn([ // returns "" for invalid base64
                "str",
            ], function(args, ctx, callback){
                callback(null, Buffer.from(args.str, "base64").toString("utf8"));
            }),

        }
    };
};
