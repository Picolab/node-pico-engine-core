var _ = require("lodash");
var lt = require("long-timeout");//makes it possible to have a timeout longer than 24.8 days (2^31-1 milliseconds)
var cuid = require("cuid");
var schedule = require("node-schedule");

module.exports = function(conf){

    var curr_timeout;
    var cron_by_id = {};
    var most_recent_update_id;

    /**
     * call update everytime the schedule in the db changes
     */
    var update = function update(){
        var my_update_id = cuid();
        most_recent_update_id = my_update_id;
        conf.db.nextScheduleEventAt(function(err, next){
            if(curr_timeout){
                //always clear the timeout since we're about to re-schedule it
                if(!conf.is_test_mode){
                    lt.clearTimeout(curr_timeout);
                }
                curr_timeout = null;
            }
            if(err) return conf.onError(err);
            if(!next){
                return;//nothing to schedule
            }
            var onTime = function(){
                if(most_recent_update_id !== my_update_id){
                    return;
                }
                //run the scheduled task
                conf.onEvent(next.event, function(err){
                    if(err){
                        conf.onError(err);
                        //handle the error
                        //but don't stop b/c we want it removed from the schedule
                    }
                    conf.db.removeScheduleEventAt(next.id, next.at, function(err){
                        if(err) conf.onError(err);
                        update();//check the schedule for the next
                    });
                });
            };

            if(conf.is_test_mode){
                //in test mode they manually trigger execution of curr_timeout
                curr_timeout = onTime;
            }else{
                //Execute the event by milliseconds from now.
                //If it's in the past it will happen on the next tick
                curr_timeout = lt.setTimeout(onTime, next.at.getTime() - Date.now());
            }
        });
    };

    var r = {
        update: update,
        addCron: function(timespec, id, event_orig){
            //clone in case event_orig get's mutated
            var event = _.cloneDeep(event_orig);

            if(_.has(cron_by_id, id)){
                if(true
                    && timespec === cron_by_id[id].timespec
                    && _.isEqual(event, cron_by_id[id].event)
                ){
                    return;//nothing changed
                }
                cron_by_id[id].job.cancel();//kill this cron so we can start a new on
            }
            var handler = function(){
                conf.onEvent(event, function(err){
                    if(err) conf.onError(err);
                });
            };
            cron_by_id[id] = {
                timespec: timespec,
                event: event,
                job: conf.is_test_mode
                    ? {handler: handler, cancel: _.noop}
                    : schedule.scheduleJob(timespec, handler)
            };
        },
        rmCron: function(id){
            if(!_.has(cron_by_id, id)){
                return;
            }
            cron_by_id[id].job.cancel();
            delete cron_by_id[id];
        },
    };
    if(conf.is_test_mode){
        r.test_mode_triggerTimeout = function(){
            if(curr_timeout){
                curr_timeout();
            }
        };
        r.test_mode_triggerCron = function(id){
            if(_.has(cron_by_id, id)){
                cron_by_id[id].job.handler();
            }
        };
    }
    return r;
};
