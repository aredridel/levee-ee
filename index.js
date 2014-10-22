var levee = require('levee');
var events = require('events');

var bindEmitter = module.exports = function bindEmitter(newInstance, options) {
    var counts = {};
    var handlers = {};
    var breaker = levee.createBreaker(init, options);
    breaker.run(function () { });

    var ee;

    function init(cb) {
        ee = newInstance();
        ee.once('error', cb);
        for (var ev in handlers) {
            console.log('setting up ', ev);
            ee.on(ev, handlers[ev]);
        }
    }

    breaker.on('newListener', function (ev, listener) {
        if (ev == 'newListener' || ev == 'removeListener') return;
        console.log('on', ev);
        counts[ev] = counts[ev] || 0;
        counts[ev]++;

        if (!handlers[ev]) {
            handlers[ev] = relay(ev);
        }

        if (ee) {
            ee.on(ev, handlers[ev]);
        } else {
            console.log('deferring init of', ev);
        }
    });

    breaker.on('removeListener', function (ev, listener) {
        if (ev == 'newListener' || ev == 'removeListener') return;
        console.log('removeListener', ev);
        counts[ev] = counts[ev] || 0;
        counts[ev]--;

        if (ee && !counts[ev]) {
            ee.removeListener(ev, handlers[ev]);
        }
    });


    function relay(ev) {
        return function () {
            var args = [ev].concat(arguments);
            breaker.emit.apply(breaker, args);
        };
    }

    return breaker;
};

if (!module.parent) {
    var inner;
    var ee = bindEmitter(function () {
        console.log('new instance');
        inner = new events.EventEmitter();
        setTimeout(function () {
            inner.emit('hello');
        }, 10);
        return inner;
    });

    ee.on('hello', function () {
        console.log('hello');
    });

    ee.on('error', function (err) {
        console.log('error', err);
    });

    ee.emit('hello');
    inner.emit('error', 'Badness');
    ee.emit('hello');
}
