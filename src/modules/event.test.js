//var _ = require("lodash");
var test = require("tape");
var cocb = require("co-callback");
var event_module = require("./event");

test("module event:attr(name)", function(t){
    cocb.run(function*(){
        var kevent = event_module();

        t.equals(
            yield kevent.def.attr({event: {attrs: {foo: "bar"}}}, ["foo"]),
            "bar"
        );

        //just null if no ctx.event, or it doesn't match
        t.equals(yield kevent.def.attr({}, ["baz"]), null);
        t.equals(
            yield kevent.def.attr({event: {attrs: {foo: "bar"}}}, ["baz"]),
            null
        );

    }, function(err){
        t.end(err);
    });
});
