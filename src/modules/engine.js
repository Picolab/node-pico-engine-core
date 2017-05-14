var _ = require("lodash");
var urllib = require("url");
var mkKRLfn = require("../mkKRLfn");

module.exports = function(core){
    var fns = {
        newPico: mkKRLfn([
            "opts",
        ], function(args, ctx, callback){
            core.db.newPico(args.opts, callback);
        }),
        removePico: mkKRLfn([
            "id",
        ], function(args, ctx, callback){
            core.db.removePico(args.id, callback);
        }),
        newChannel: mkKRLfn([
            "opts",
        ], function(args, ctx, callback){
            core.db.newChannel(args.opts, callback);
        }),
        removeChannel: mkKRLfn([
            "opts",
        ], function(args, ctx, callback){
            var opts = args.opts;
            core.db.removeChannel(opts.pico_id, opts.eci, callback);
        }),
        registerRuleset: mkKRLfn([
            "opts",
        ], function(args, ctx, callback){
            var opts = args.opts;
            var uri;
            if(_.isString(opts.url)){
                uri = _.isString(opts.base)
                    ? urllib.resolve(opts.base, opts.url)
                    : opts.url;
            }
            if(!_.isString(uri)){
                return callback(new Error("registerRuleset expects, pico_id and rid or url+base"));
            }
            core.registerRulesetURL(uri, function(err, data){
                if(err) return callback(err);
                callback(null, data.rid);
            });
        }),
        installRuleset: mkKRLfn([
            "opts",
        ], function(args, ctx, callback){
            var opts = args.opts;

            var pico_id = opts.pico_id;
            var rid = opts.rid;
            var uri;
            if(_.isString(opts.url)){
                uri = _.isString(opts.base)
                    ? urllib.resolve(opts.base, opts.url)
                    : opts.url;
            }
            if(!_.isString(pico_id) || ( ( !_.isString(rid) && !_.isArray(rid) ) && !_.isString(uri))){
                return callback(new Error("installRuleset expects, pico_id and rid or url+base"));
            }

            var doIt = function(rid){
                core.installRuleset(pico_id, rid, function(err){
                    callback(err, rid);
                });
            };
            
            var doItTwoIt = function(rids){
                for (var i = rids.length - 1; i >= 0; i--) {
                    if( !_.isString(rids[i]) ){
                        return callback(new Error("installRuleset expects every rid in array to be a string."));
                    }
                    doIt(rids[i]);
                }
            };
            
            if(_.isString(rid)){
                return doIt(rid);
            }
            if(_.isArray(rid)){
                return doItTwoIt(rid);
            }
            core.db.findRulesetsByURL(uri, function(err, results){
                if(err) return callback(err);
                var rids = _.uniq(_.map(results, "rid"));
                if(_.size(rids) === 0){
                    core.registerRulesetURL(uri, function(err, data){
                        if(err) return callback(err);
                        doIt(data.rid);
                    });
                    return;
                }
                if(_.size(rids) !== 1){
                    return callback(new Error("More than one rid found for the given url: " + rids.join(" , ")));
                }
                doIt(_.head(rids));
            });
        }),
        unregisterRuleset: mkKRLfn([
            "rid",
        ], function(args, ctx, callback){
            core.unregisterRuleset(args.rid, callback);
        }),
    };

    return {
        def: fns
    };
};
