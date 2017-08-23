var dbRange = require("../dbRange");

module.exports = {
    up: function(ldb, callback){
        var to_batch = [];

        dbRange(ldb, {
            prefix: ["pico"],
        }, function(data){
            var pico_id = data.key[1];

            var eci = "TODO";
            //TODO create the channel and did

            to_batch.push({
                type: "put",
                key: ["pico", pico_id],
                value: _.assign({}, data.value, {
                    admin_eci: eci,
                }),
            });

        }, function(err){
            if(err) return callback(err);

            //TODO for root_pico as well

            ldb.batch(to_batch, callback);
        });
    },
};
