var _ = require("lodash");
var mkKRLfn = require("../mkKRLfn");
var request = require("request");

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
                "host",
            ], function(args, ctx, callback){
                //first normalize the event to the expected format
                var event = {
                    "eci": _.get(args, ["event", "eci"], ctx.eci),
                    "eid": _.get(args, ["event", "eid"], "none"),
                    "domain": _.get(args, ["event", "domain"], ""),
                    "type": _.get(args, ["event", "type"], ""),
                    "attrs": _.get(args, ["event", "attrs"], {})
                };
                if(args.host){
                    var url = args.host;
                    //host: "https://test-host",
                    url += "/sky/event";
                    url += "/" + event.eci;
                    url += "/" + event.eid;
                    url += "/" + event.domain;
                    url += "/" + event.type;
                    request({
                        method: "GET",
                        url: url,
                        qs: event.attrs,
                    }, function(err, res, body){
                        //ignore it
                    });
                    callback();
                    return;
                }
                ctx.addActionResponse(ctx, "event:send", {
                    event: event,
                });
                callback();
            }),
        },
    };
};
