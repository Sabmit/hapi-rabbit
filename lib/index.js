var rabbitjs = require('rabbit.js');
var Hoek = require('hoek');
var Joi = require('joi');

module.exports.register = function (plugin, userOptions, next) {

    var defaultOptions = {
        url     : "amqp://localhost",
        routing : 'topic',
        encoding: 'utf8',
        extras: {}
    };

    var options = Hoek.applyToDefaults(defaultOptions, userOptions);

    plugin.expose('subscribe', function (context, exchange, callback) {

        Joi.validate(exchange, Joi.string().alphanum(), function (err) {

            if (err === null) { //exchange is valid

                var sub = context.socket('SUB', {routing: options.routing});

                sub.connect(exchange, exchange + '.*', function () {
                    sub.setEncoding(options.encoding);

                    sub.on('data', function (message) {
                        callback(null, JSON.parse(message));
                    });
                });

            } else {

                callback(err, null);

            }

        });

    });

    plugin.expose('publish', function (context, exchange, messageType, message, callback) {

        var paramSchema = Joi.object().keys({
            exchange   : Joi.string().alphanum().required(),
            messageType: Joi.string().regex(/^[a-zA-Z._-]+$/).required()
        });

        Joi.validate({ exchange: exchange, messageType: messageType }, paramSchema, function (err) {

            if (err === null) { //exchange is valid

                var pub = context.socket('PUB', {routing: options.routing});

                var messageObject = {
                    type: messageType,
                    data: message
                };

                pub.connect(exchange, function () {
                    if(options.hasOwnProperty('extras')) {
                        for (var key in options.extras) {
                            pub.setsockopt(key, options.extras[key]);
                        }
                    }

                    pub.publish(messageType, JSON.stringify(messageObject));
                    callback(null, messageObject);
                });

            } else {

                callback(err, null);

            }
        });
    });

    plugin.expose('createContext', function (callback) {

        var context = rabbitjs.createContext(options.url);

        context.on('ready', function () {
            callback(null, context);
        });

        context.on('error', function (err) {
            callback(err, null);
        });

    });

    next();
};

module.exports.register.attributes = {
    pkg: require('../package.json')
};
