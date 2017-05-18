var _ = require("lodash");
var mkKRLfn = require("../mkKRLfn");

module.exports = function(core){
    var fns = {
        attr: mkKRLfn([
            "name",
        ], function(args, ctx, callback){
            callback(null, ctx.event.attrs[args.name]);
        }),
        attrs: mkKRLfn([
        ], function(args, ctx, callback){
            //the user may mutate their copy
            var attrs = _.cloneDeep(ctx.event.attrs);
            callback(null, attrs);
        }),
        attrMatches: mkKRLfn([
            "pairs",
        ], function(args, ctx, callback){
            var pairs = args.pairs;
            var matches = [];
            var i, j, attr, m, pair;
            for(i = 0; i < pairs.length; i++){
                pair = pairs[i];
                attr = ctx.event.attrs[pair[0]];
                m = pair[1].exec(attr || "");
                if(!m){
                    callback();
                    return;
                }
                for(j = 1; j < m.length; j++){
                    matches.push(m[j]);
                }
            }
            callback(null, matches);
        }),
    };
    return {
        def: fns,
        get: function(ctx, id, callback){
            if(id === "eid"){
                callback(null, _.get(ctx, ["event", "eid"]));
                return;
            }
            callback(new Error("Not defined `event:" + id + "`"));
        },
        actions: {
            send: mkKRLfn([
                "event",
            ], function(args, ctx, callback){
                ctx.addActionResponse(ctx, "event:send", {
                    event: args.event,
                });
                callback();
            }),
        },
    };
};
