var _ = require("lodash");
var cuid = require("cuid");
var async = require("async");
var crypto = require("crypto");
var dbRange = require("./dbRange");
var levelup = require("levelup");
var bytewise = require("bytewise");
var migrations = require("./migrations");
var safeJsonCodec = require("level-json-coerce-null");
var extractRulesetID = require("./extractRulesetID");


module.exports = function(opts){

    var ldb = levelup(opts.location, {
        db: opts.db,
        keyEncoding: bytewise,
        valueEncoding: safeJsonCodec
    });

    var newID = _.isFunction(opts.newID) ? opts.newID : cuid;

    var getMigrationLog = function(callback){
        var log = {};
        dbRange(ldb, {
            prefix: ["migration-log"],
        }, function(data){
            log[data.key[1]] = data.value;
        }, function(err){
            callback(err, log);
        });
    };
    var recordMigration = function(version, callback){
        ldb.put(["migration-log", version + ""], {
            timestamp: (new Date()).toISOString(),
        }, callback);
    };
    var removeMigration = function(version, callback){
        ldb.del(["migration-log", version + ""], callback);
    };

    return {
        toObj: function(callback){
            var db_data = {};
            dbRange(ldb, {}, function(data){
                if(!_.isArray(data.key)){
                    return;
                }
                _.set(db_data, data.key, data.value);
            }, function(err){
                callback(err, db_data);
            });
        },
        getPicoIDByECI: function(eci, callback){
            ldb.get(["eci-to-pico_id", eci], function(err, data){
                if(err && err.notFound){
                    err = new levelup.errors.NotFoundError("ECI not found: " + (_.isString(eci) ? eci : typeof eci));
                    err.notFound = true;
                }
                callback(err, data);
            });
        },
        getRootECI: function(callback){
            var eci = undefined;
            dbRange(ldb, {
                prefix: ["eci-to-pico_id"],
                values: false,
                limit: 1
            }, function(key){
                eci = key[1];
            }, function(err){
                callback(err, eci);
            });
        },
        hasPico: function(id, callback){
            ldb.get(["pico", id], function(err){
                if(err){
                    if(err.notFound){
                        callback(null, false);
                        return;
                    }
                    callback(err);
                    return;
                }
                callback(null, true);
            });
        },
        newPico: function(opts, callback){
            var new_pico = {
                id: newID()
            };
            ldb.put(["pico", new_pico.id], new_pico, function(err){
                if(err) return callback(err);
                callback(undefined, new_pico);
            });
        },
        removePico: function(id, callback){
            var to_batch = [];
            dbRange(ldb, {
                prefix: ["pico", id],
                values: false
            }, function(key){
                to_batch.push({type: "del", key: key});
                if(key[2] === "channel"){
                    //remove this index
                    to_batch.push({type: "del", key: ["eci-to-pico_id", key[3]]});
                }
            }, function(err){
                if(err)return callback(err);

                dbRange(ldb, {
                    prefix: ["entvars", id],
                    values: false
                }, function(key){
                    to_batch.push({type: "del", key: key});
                }, function(err){
                    if(err)return callback(err);
                    ldb.batch(to_batch, callback);
                });
            });
        },
        newChannel: function(opts, callback){
            var new_channel = {
                id: newID(),
                name: opts.name,
                type: opts.type
            };
            var ops = [
                {
                    //the source of truth for a channel
                    type: "put",
                    key: ["pico", opts.pico_id, "channel", new_channel.id],
                    value: new_channel
                },
                {
                    //index to get pico_id by eci
                    type: "put",
                    key: ["eci-to-pico_id", new_channel.id],
                    value: opts.pico_id
                }
            ];
            ldb.batch(ops, function(err){
                if(err) return callback(err);
                callback(undefined, new_channel);
            });
        },
        ridsOnPico: function(pico_id, callback){
            var pico_rids = {};
            dbRange(ldb, {
                prefix: ["pico", pico_id, "ruleset"]
            }, function(data){
                var rid = data.key[3];
                if(data.value && data.value.on === true){
                    pico_rids[rid] = true;
                }
            }, function(err){
                callback(err, pico_rids);
            });
        },
        addRulesetToPico: function(pico_id, rid, callback){
            ldb.put(["pico", pico_id, "ruleset", rid], {on: true}, callback);
        },
        removeRulesetFromPico: function(pico_id, rid, callback){
            var ops = [
                {type: "del", key: ["pico", pico_id, "ruleset", rid]},
            ];
            dbRange(ldb, {
                prefix: ["entvars", pico_id, rid],
                values: false,
            }, function(key){
                ops.push({type: "del", key: key});
            }, function(err){
                if(err) return callback(err);
                ldb.batch(ops, callback);
            });
        },
        listChannels: function(pico_id, callback){
            var channels = [];
            dbRange(ldb, {
                prefix: ["pico", pico_id, "channel"],
            }, function(data){
                channels.push(data.value);
            }, function(err){
                callback(err, channels);
            });
        },
        removeChannel: function(pico_id, eci, callback){
            var ops = [
                {type: "del", key: ["pico", pico_id, "channel", eci]},
                {type: "del", key: ["eci-to-pico_id", eci]}
            ];
            ldb.batch(ops, callback);
        },
        putEntVar: function(pico_id, rid, var_name, val, callback){
            ldb.put(["entvars", pico_id, rid, var_name], val, callback);
        },
        getEntVar: function(pico_id, rid, var_name, callback){
            ldb.get(["entvars", pico_id, rid, var_name], function(err, data){
                if(err && err.notFound){
                    return callback();
                }
                callback(err, data);
            });
        },
        removeEntVar: function(pico_id, rid, var_name, callback){
            ldb.del(["entvars", pico_id, rid, var_name], callback);
        },
        putAppVar: function(rid, var_name, val, callback){
            ldb.put(["appvars", rid, var_name], val, callback);
        },
        getAppVar: function(rid, var_name, callback){
            ldb.get(["appvars", rid, var_name], function(err, data){
                if(err && err.notFound){
                    return callback();
                }
                callback(err, data);
            });
        },
        removeAppVar: function(rid, var_name, callback){
            ldb.del(["appvars", rid, var_name], callback);
        },
        getStateMachineState: function(pico_id, rule, callback){
            var key = ["state_machine", pico_id, rule.rid, rule.name];
            ldb.get(key, function(err, curr_state){
                if(err){
                    if(err.notFound){
                        curr_state = undefined;
                    }else{
                        return callback(err);
                    }
                }
                callback(undefined, _.has(rule.select.state_machine, curr_state)
                    ? curr_state
                    : "start");
            });
        },
        putStateMachineState: function(pico_id, rule, state, callback){
            var key = ["state_machine", pico_id, rule.rid, rule.name];
            ldb.put(key, state || "start", callback);
        },

        getStateMachineStartTime: function(pico_id, rule, callback){
            var key = ["state_machine_starttime", pico_id, rule.rid, rule.name];
            ldb.get(key, function(err, time){
                if(err){
                    if(err.notFound){
                        time = undefined;
                    }else{
                        return callback(err);
                    }
                }
                callback(undefined, time);
            });
        },
        putStateMachineStartTime: function(pico_id, rule, time, callback){
            var key = ["state_machine_starttime", pico_id, rule.rid, rule.name];
            ldb.put(key, time, callback);
        },

        updateAggregatorVar: function(pico_id, rule, var_key, updater, callback){
            var key = [
                "aggregator_var",
                pico_id,
                rule.rid,
                rule.name,
                var_key
            ];
            ldb.get(key, function(err, val){
                if(err && !err.notFound){
                    return callback(err);
                }
                if(!_.isArray(val)){
                    val = [];
                }
                val = updater(val);
                if(!_.isArray(val)){
                    val = [];
                }
                ldb.put(key, val, function(err){
                    callback(err, val);
                });
            });
        },
        storeRuleset: function(krl_src, meta, callback){
            var timestamp = (new Date()).toISOString();
            if(arguments.length === 4 && _.isString(arguments[3])){//for testing only
                timestamp = arguments[3];//for testing only
            }//for testing only

            var rid = extractRulesetID(krl_src);
            if(!rid){
                callback(new Error("Ruleset name not found"));
                return;
            }
            var shasum = crypto.createHash("sha256");
            shasum.update(krl_src);
            var hash = shasum.digest("hex");

            var url = _.has(meta, "url") && _.isString(meta.url)
                ? meta.url
                : null;

            var ops = [
                {
                    //the source of truth for a ruleset version
                    type: "put",
                    key: ["rulesets", "krl", hash],
                    value: {
                        src: krl_src,
                        rid: rid,
                        url: url,
                        timestamp: timestamp
                    }
                },
                {
                    //index to view all the versions of a given ruleset name
                    type: "put",
                    key: ["rulesets", "versions", rid, timestamp, hash],
                    value: true
                }
            ];
            if(url){
                //index to lookup by url
                ops.push({
                    type: "put",
                    key: ["rulesets", "url", url.toLowerCase().trim(), rid, hash],
                    value: true
                });
            }
            ldb.batch(ops, function(err){
                if(err) return callback(err);
                callback(undefined, {
                    rid: rid,
                    hash: hash,
                });
            });
        },
        hasEnabledRid: function(rid, callback){
            var has_found = undefined;
            dbRange(ldb, {
                prefix: ["rulesets", "enabled", rid],
                values: false,
                limit: 1
            }, function(key){
                has_found = true;
            }, function(err){
                callback(err, has_found);
            });
        },
        findRulesetsByURL: function(url, callback){
            var r = [];
            dbRange(ldb, {
                prefix: ["rulesets", "url", url.toLowerCase().trim()],
            }, function(data){
                if(data.value){
                    r.push({
                        rid: data.key[3],
                        hash: data.key[4],
                    });
                }
            }, function(err){
                if(err)return callback(err);
                callback(null, r);
            });
        },
        enableRuleset: function(hash, callback){
            ldb.get(["rulesets", "krl", hash], function(err, data){
                if(err) return callback(err);
                ldb.put(["rulesets", "enabled", data.rid], {
                    hash: hash,
                    timestamp: (new Date()).toISOString()
                }, callback);
            });
        },
        disableRuleset: function(rid, callback){
            ldb.del(["rulesets", "enabled", rid], callback);
        },
        getEnabledRuleset: function(rid, callback){
            ldb.get(["rulesets", "enabled", rid], function(err, data_e){
                if(err) return callback(err);
                ldb.get(["rulesets", "krl", data_e.hash], function(err, data_k){
                    if(err) return callback(err);
                    callback(undefined, {
                        src: data_k.src,
                        hash: data_e.hash,
                        rid: data_k.rid,
                        url: data_k.url,
                        timestamp_stored: data_k.timestamp,
                        timestamp_enable: data_e.timestamp
                    });
                });
            });
        },
        listAllEnabledRIDs: function(callback){
            var rids = [];
            dbRange(ldb, {
                prefix: ["rulesets", "enabled"],
                values: false
            }, function(key){
                rids.push(key[2]);
            }, function(err){
                callback(err, rids);
            });
        },
        isRulesetUsed: function(rid, callback){
            var is_used = false;
            dbRange(ldb, {
                prefix: ["pico"],
                values: false
            }, function(key, stopRange){
                if(is_used){
                    throw new Error("dbRange should have stopped");
                }
                if(key[2] === "ruleset" && key[3] === rid){
                    is_used = true;
                    stopRange();
                }
            }, function(err){
                callback(err, is_used);
            });
        },
        deleteRuleset: function(rid, callback){
            var to_del = [
                ["rulesets", "enabled", rid],
            ];

            var hashes = [];
            dbRange(ldb, {
                prefix: ["rulesets", "versions", rid],
                values: false
            }, function(key){
                var hash = key[4];

                to_del.push(key);
                to_del.push(["rulesets", "krl", hash]);
                hashes.push(hash);
            }, function(err){
                if(err) return callback(err);
                async.each(hashes, function(hash, next){
                    ldb.get(["rulesets", "krl", hash], function(err, data){
                        if(err) return next(err);
                        if(_.isString(data.url)){
                            to_del.push([
                                "rulesets",
                                "url",
                                data.url.toLowerCase().trim(),
                                data.rid,
                                hash
                            ]);
                        }
                        next();
                    });
                }, function(err){
                    if(err) return callback(err);

                    dbRange(ldb, {
                        prefix: ["appvars", rid],
                        values: false
                    }, function(key){
                        to_del.push(key);
                    }, function(err){
                        if(err) return callback(err);

                        ldb.batch(_.map(to_del, function(key){
                            return {type: "del", key: key};
                        }), callback);
                    });
                });
            });
        },
        scheduleEventAt: function(at, event, callback){
            var id = newID();

            var val = {
                id: id,
                at: at,
                event: event
            };

            ldb.batch([
                {type: "put", key: ["scheduled", id], value: val},
                {type: "put", key: ["scheduled_by_at", at, id], value: val},
            ], function(err){
                if(err) return callback(err);

                callback(null, val);
            });
        },
        nextScheduleEventAt: function(callback){
            var r;
            dbRange(ldb, {
                prefix: ["scheduled_by_at"],
                limit: 1,//peek the first one
            }, function(data){
                r = {
                    id: data.value.id,
                    at: data.key[1],//Date object
                    event: data.value.event,
                };
            }, function(err){
                callback(err, r);
            });
        },
        removeScheduleEventAt: function(id, at, callback){
            ldb.batch([
                {type: "del", key: ["scheduled", id]},
                {type: "del", key: ["scheduled_by_at", at, id]},
            ], callback);
        },
        scheduleEventRepeat: function(timespec, event, callback){
            var id = newID();

            var val = {
                id: id,
                timespec: timespec,
                event: event
            };

            ldb.batch([
                {type: "put", key: ["scheduled", id], value: val},
            ], function(err){
                if(err) return callback(err);

                callback(null, val);
            });
        },
        listScheduled: function(callback){
            var r = [];
            dbRange(ldb, {
                prefix: ["scheduled"],
            }, function(data){
                var val = data.value;
                r.push(val);
            }, function(err){
                callback(err, _.sortBy(r, "at"));
            });
        },
        removeScheduled: function(id, callback){
            ldb.get(["scheduled", id], function(err, info){
                if(err) return callback(err);

                var to_batch = [
                    {type: "del", key: ["scheduled", id]},
                ];
                if(_.has(info, "at")){
                    //also remove the `at` index
                    to_batch.push({type: "del", key: ["scheduled_by_at", new Date(info.at), id]});
                }

                ldb.batch(to_batch, callback);
            });
        },
        getMigrationLog: getMigrationLog,
        recordMigration: recordMigration,
        removeMigration: removeMigration,
        checkAndRunMigrations: function(callback){
            getMigrationLog(function(err, log){
                if(err) return callback(err);

                var to_run = [];
                _.each(migrations, function(m, version){
                    if( ! _.has(log, version)){
                        to_run.push(version);
                    }
                });
                to_run.sort();

                async.eachSeries(to_run, function(version, next){
                    var m = migrations[version];
                    m.up(ldb, function(err, data){
                        if(err) return next(err);
                        recordMigration(version, next);
                    });
                }, callback);
            });
        },
    };
};
