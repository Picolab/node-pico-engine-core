var _ = require("lodash");
var test = require("tape");
var Scheduler = require("./Scheduler");

test("Scheduler - at", function(t){

    var log = [];
    var queue_nextEventAt = [];

    var popNextEventAt = function(id){
        //pop off the oldest callback
        var callback = queue_nextEventAt.shift();
        if(!id){
            return callback();
        }
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
        //the event should only fire once!
        ["EVENT", "1"],
    ]);

    t.equals(queue_nextEventAt.length, 1);
    popNextEventAt("2");
    t.equals(queue_nextEventAt.length, 0);
    sch.test_mode_triggerTimeout();

    t.deepEquals(log, [
        ["EVENT", "1"],
        ["EVENT", "2"],
    ]);

    t.end();
});

if(process.env.SKIP_LONG_TESTS === "true"){
    //skip the generative test when running the tests quick i.e. `npm start`
    return;
}

var nTicks = function(n, callback){
    if(n === 0){
        callback();
        return;
    }
    process.nextTick(function(){
        nTicks(n - 1, callback);
    });
};

var randomTick = function(callback){
    //0 means no tick i.e. synchronous
    nTicks(_.random(0, 4), callback);
};

test("Scheduler - at - generative test", function(t){

    var n_events = 100;

    var log = [];
    var event_queue = [];

    var sch = Scheduler({
        is_test_mode: true,
        db: {
            nextScheduleEventAt: function(callback){
                randomTick(function(){
                    if(event_queue.length === 0){
                        return callback();
                    }
                    //read the next event to run, then tick again
                    var id = event_queue[0];
                    var next = {
                        id: id,
                        at: new Date(),//doesn't matter for this test
                        event: id,//shape doesn't matter for this test
                    };
                    randomTick(function(){
                        callback(null, next);
                        nTicks(_.random(1, 4), function(){
                            sch.test_mode_triggerTimeout();
                        });
                    });
                });
            },
            removeScheduleEventAt: function(id, at, callback){
                randomTick(function(){
                    _.pull(event_queue, id);
                    if(id === n_events){
                        callback();
                        process.nextTick(function(){
                            onDone();
                        });
                    }else{
                        randomTick(callback);
                    }
                });
            },
        },
        onError: function(err){
            //this test expects no errors to occur
            t.end(err);
        },
        onEvent: function(event, callback){
            log.push(event);
            //randomTick(callback);
            callback();
        },
    });
    sch.update();

    var event_i = 0;

    var tickLoop = function(){
        if(event_i >= n_events){
            return;
        }
        randomTick(function(){
            event_i++;
            event_queue.push(event_i);
            sch.update();
            tickLoop();
        });
    };
    tickLoop();

    function onDone(){
        var fail = false;
        var i;
        for(i = 0; i < log.length; i++){
            if(log[i] !== (i + 1)){
                fail = true;
                break;
            }
        }
        if(fail){
            t.fail("events out of order! " + log.join(","));
        }else{
            t.ok(true, "events in order");
        }
        t.end();
    }
});
