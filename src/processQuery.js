var _ = require("lodash");
var cocb = require("co-callback");
var runKRL = require("./runKRL");

module.exports = function(core, ctx, callback){
    cocb.run(function*(){
        var pico = yield core.db.getPicoYieldable(ctx.pico_id);
        if(!pico){
            throw new Error("Invalid eci: " + ctx.query.eci);
        }
        if(!_.has(pico.ruleset, ctx.query.rid)){
            throw new Error("Pico does not have that rid");
        }
        var rs = core.rsreg.get(ctx.query.rid);
        if(!rs){
            throw new Error("Not found: rid");
        }
        var shares = _.get(rs, ["meta", "shares"]);
        if(!_.isArray(shares) || !_.includes(shares, ctx.query.name)){
            throw new Error("Not shared");
        }
        if(!rs.scope.has(ctx.query.name)){
            throw new Error("Shared, but not defined: " + ctx.query.name);
        }

        ////////////////////////////////////////////////////////////////////////
        ctx = core.mkCTX({
            query: ctx.query,
            pico_id: ctx.pico_id,
            rid: rs.rid,
            scope: rs.scope,
        });
        var val = ctx.scope.get(ctx.query.name);
        if(_.isFunction(val)){
            return yield runKRL(function*(ctx, args){
                //use ctx.applyFn so it behaves like any other fn call
                //i.e. errors on trying defaction like a function
                return yield ctx.applyFn(val, ctx, args);
            }, ctx, ctx.query.args);
        }
        return val;
    }, callback);
};
