var test = require("tape");
var cleanEvent = require("./cleanEvent");

test("event = cleanEvent(event)", function(t){

    try{
        cleanEvent();
    }catch(e){
        t.equals(e + "", "Error: missing event.eci");
    }
    try{
        cleanEvent({eci: 0});
    }catch(e){
        t.equals(e + "", "Error: missing event.eci");
    }
    try{
        cleanEvent({eci: ""});
    }catch(e){
        t.equals(e + "", "Error: missing event.eci");
    }
    try{
        cleanEvent({eci: "  "});
    }catch(e){
        t.equals(e + "", "Error: missing event.eci");
    }
    try{
        cleanEvent({eci: "eci-1", domain: ""});
    }catch(e){
        t.equals(e + "", "Error: missing event.domain");
    }
    try{
        cleanEvent({eci: "eci-1", domain: "foo"});
    }catch(e){
        t.equals(e + "", "Error: missing event.type");
    }
    try{
        cleanEvent({eci: "eci-1", domain: "foo", type: " "});
    }catch(e){
        t.equals(e + "", "Error: missing event.type");
    }

    //bare minimum
    t.deepEquals(cleanEvent({
        eci: "eci123",
        domain: "foo",
        type: "bar",
    }), {
        eci: "eci123",
        eid: "none",
        domain: "foo",
        type: "bar",
        attrs: {},
    });


    //attrs - should not be mutable
    var attrs = {what: {is: ["this"]}};
    var event = cleanEvent({
        eci: "eci123",
        eid: "555",
        domain: "foo",
        type: "bar",
        attrs: attrs
    });
    t.deepEquals(event, {
        eci: "eci123",
        eid: "555",
        domain: "foo",
        type: "bar",
        attrs: attrs,
    });
    t.deepEquals(event.attrs, attrs, "they should match before event.attrs mutates");
    event.attrs.what = "blah";
    t.notDeepEqual(event.attrs, attrs, "oops, attrs was mutable");


    //trim up inputs
    t.deepEquals(cleanEvent({
        eci: "  eci123   ",
        eid: "   3 3 3 3   ",
        domain: "  foo\n ",
        type: "  \t bar  ",
        attrs: {" foo ": " don't trim these   "}
    }), {
        eci: "eci123",
        eid: "3 3 3 3",
        domain: "foo",
        type: "bar",
        attrs: {" foo ": " don't trim these   "}
    });

    //no timestamp
    t.deepEquals(cleanEvent({
        eci: "eci123",
        domain: "foo",
        type: "bar",
        timestamp: new Date(),
    }), {
        eci: "eci123",
        eid: "none",
        domain: "foo",
        type: "bar",
        attrs: {},
    });


    //no for_rid
    t.deepEquals(cleanEvent({
        eci: "eci123",
        domain: "foo",
        type: "bar",
        for_rid: "rid",
    }), {
        eci: "eci123",
        eid: "none",
        domain: "foo",
        type: "bar",
        attrs: {},
    });

    var testAttrs = function(input, output, msg){
        t.deepEquals(cleanEvent({
            eci: "eci123",
            eid: "eid",
            domain: "foo",
            type: "bar",
            attrs: input,
        }).attrs, output, msg);
    };

    testAttrs({
        fn: function(){}
    }, {
        fn: "[Function]"
    }, "convert attrs via KRL json encode");

    testAttrs(function(){}, {}, "attrs must be a map or array");

    testAttrs(
        [0, 1, "a", null, void 0, NaN],
        [0, 1, "a", null, null, null],
        "attrs normalize to JSON null's"
    );

    testAttrs(
        {a: null, b: void 0, c: NaN},
        {a: null, b: null, c: null},
        "attrs normalize to JSON null's"
    );

    (function(){
        testAttrs(
            arguments,
            {"0": "foo", "1": "bar"},
            "non \"plain\" objects should work as Maps"
        );
    }("foo", "bar"));


    var testEid = function(input, output, msg){
        t.deepEquals(cleanEvent({
            eci: "eci123",
            eid: input,
            domain: "foo",
            type: "bar",
        }).eid, output, msg);
    };

    testEid(" foo ", "foo");
    testEid("", "none");
    testEid("  ", "none");
    testEid(null, "none");
    testEid(NaN, "none");
    testEid(void 0, "none");
    testEid("null", "none");

    testEid([1, 2], "[Array]");
    testEid({foo: "bar"}, "[Map]");

    testEid(123, "123");
    testEid(123.0, "123");
    testEid(.7500, "0.75");

    t.end();
});
