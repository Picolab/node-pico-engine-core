var crypto = require("crypto");
var ktypes = require("krl-stdlib/types");
var mkKRLfn = require("../mkKRLfn");

module.exports = function(core){
    return {
        def: {

            base64encode: mkKRLfn([
                "str",
            ], function(args, ctx, callback){
                var str = ktypes.toString(args.str);

                callback(null, Buffer.from(str, "utf8").toString("base64"));
            }),


            base64decode: mkKRLfn([ // returns "" for invalid base64
                "str",
            ], function(args, ctx, callback){
                callback(null, Buffer.from(args.str, "base64").toString("utf8"));
            }),


            sha2: mkKRLfn([
                "str",
            ], function(args, ctx, callback){
                var str = ktypes.toString(args.str);

                var hash = crypto.createHash("sha256");
                hash.update(str);

                callback(null, hash.digest("hex"));
            }),

        }
    };
};
