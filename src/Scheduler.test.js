var test = require("tape");
var Scheduler = require("./Scheduler");

test("Scheduler - at", function(t){

    var log = [];
    var queue_nextEventAt = [];

    var popNextEventAt = function(id){
        //pop off the oldest callback
        var callback = queue_nextEventAt.shift();
        callback(null, {
            id: id,
            at: new Date(),//doesn't matter
            event: id,//shape doesn't matter here
        });
    };

    var sch = Scheduler({
        is_test_mode: true,
        db: {
            nextScheduleEventAt: function(callback){
                queue_nextEventAt.push(callback);
            },
            removeScheduleEventAt: function(id, at, callback){
                callback();
            },
        },
        onError: function(err){
            log.push(["ERROR", err]);
        },
        onEvent: function(event, callback){
            log.push(["EVENT", event]);
            callback();
        },
    });

    sch.update();
    sch.update();
    popNextEventAt("1");
    sch.test_mode_triggerTimeout();
    popNextEventAt("1");
    sch.test_mode_triggerTimeout();

    t.deepEquals(log, [
        //the event should only be scheduled once!
        ["EVENT", "1"],
    ]);

    t.end();
});
