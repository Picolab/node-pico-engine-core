var test = require("tape");
var cocb = require("co-callback");
var krandom = require("./random")().def;

test("module - random:*", function(t){
    cocb.run(function*(){
        var i;
        for(i = 0; i < 5; i++){
            t.ok(/^c[^\s]+$/.test(yield krandom.uuid({}, [])));
            t.ok(/^[^\s]+$/.test(yield krandom.word({}, [])));
        }
    }, function(err){
        t.end(err);
    });
});
