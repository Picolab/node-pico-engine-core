var _ = require("lodash");
var mkKRLfn = require("../mkKRLfn");
var request = require("request");

module.exports = function(core){
    var fns = {
        attr: mkKRLfn([
            "name",
        ], function(args, ctx, callback){
            callback(null, _.get(ctx, ["event", "attrs", args.name], null));
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
                //first validate/normalize the event object
                var getAndAssertPart = function(key){
                    var val = _.get(args, ["event", key]);
                    if(!_.isString(val)){
                        throw new Error("event:send - event." + key + " is required");
                    }
                    return val;
                };
                var event = {
                    eci: getAndAssertPart("eci"),
                    eid: getAndAssertPart("eid"),
                    domain: getAndAssertPart("domain"),
                    type: getAndAssertPart("type"),
                    attrs: _.get(args, ["event", "attrs"], {}),
                };
                if(args.host){
                    var url = args.host;
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
