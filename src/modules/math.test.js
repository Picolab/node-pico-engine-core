var test = require("tape");
var cocb = require("co-callback");
//var ktypes = require("krl-stdlib/types");
var kmath = require("./math")().def;

test("module - math:*", function(t){
    cocb.run(function*(){
        t.equals(yield kmath.base64encode({}, ["}{"]), "fXs=");
        t.ok(true, "math:base64encode passed");

        t.equals(yield kmath.base64decode({}, ["fXs="]), "}{");
        t.ok(true, "math:base64decode passed");
    }, t.end);
});
