var test = require("tape");
var cocb = require("co-callback");
//var ktypes = require("krl-stdlib/types");
var kmath = require("./math")().def;

test("module - math:*", function(t){
    cocb.run(function*(){

        t.equals(yield kmath.base64encode({}, ["}{"]), "fXs=", "base64encode");
        t.equals(yield kmath.base64encode({}, [null]), yield kmath.base64encode({}, ["null"]), "base64encode coreces to strings");


        t.equals(yield kmath.base64decode({}, ["fXs="]), "}{", "base64decode");



        t.equals(
            yield kmath.sha2({}, ["hello"]),
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
            "sha2(\"hello\")"
        );
        t.equals(
            yield kmath.sha2({}, [null]),
            yield kmath.sha2({}, ["null"]),
            "sha2 coreces inputs to Strings"
        );
        t.equals(
            yield kmath.sha2({}, []),
            yield kmath.sha2({}, ["null"]),
            "sha2 coreces inputs to Strings"
        );
        t.equals(
            yield kmath.sha2({}, [[1, 2]]),
            yield kmath.sha2({}, ["[Array]"]),
            "sha2 coreces inputs to Strings"
        );

    }, t.end);
});
