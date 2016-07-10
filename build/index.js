'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.helpers = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; }; /* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

exports.yaxisRange = yaxisRange;
exports.build = build;

var _d3Array = require('d3-array');

var d3A = _interopRequireWildcard(_d3Array);

var _transpluck = require('transpluck');

var _transpluck2 = _interopRequireDefault(_transpluck);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function yaxisRange(sim) {
    return {
        yaxis: {
            range: [sim.config.L || 0, sim.config.H || 200]
        }
    };
}

var helpers = exports.helpers = {
    supplyDemand: function supplyDemand() {
        return function (sim) {
            var i = void 0,
                l = void 0;
            var xboth = [];
            var buyerValues = sim.config.buyerValues.slice().sort(function (a, b) {
                return +b - a;
            });
            var sellerCosts = sim.config.sellerCosts.slice().sort(function (a, b) {
                return +a - b;
            });
            for (i = 0, l = Math.max(buyerValues.length, sellerCosts.length); i < l; ++i) {
                xboth[i] = 1 + i;
            }
            var demand = {
                name: 'unit value',
                x: xboth.slice(0, buyerValues.length),
                y: buyerValues,
                mode: 'lines+markers',
                type: 'scatter'
            };
            var supply = {
                name: 'unit cost',
                x: xboth.slice(0, sellerCosts.length),
                y: sellerCosts,
                mode: 'lines+markers',
                type: 'scatter'
            };
            var layout = Object.assign({}, yaxisRange(sim), { xaxis: { range: [0, xboth.length] } });
            var plotlyData = [demand, supply];
            return [plotlyData, layout];
        };
    },
    plotFactory: function plotFactory(chart) {

        /* chart properties are title, logs, names, xs, ys, modes, layout */

        return function (sim) {
            var series = (0, _transpluck2.default)(sim.logs[chart.log].data, { pluck: [].concat(chart.xs, chart.ys) });
            var traces = chart.names.map(function (name, i) {
                return {
                    name: name,
                    x: series[chart.xs[i % chart.xs.length]],
                    y: series[chart.ys[i % chart.ys.length]],
                    type: 'scatter',
                    mode: chart.modes[i % chart.modes.length]
                };
            });
            var layout = Object.assign({}, { title: chart.title }, yaxisRange(sim), chart.layout);
            return [traces, layout];
        };
    },
    histogramFactory: function histogramFactory(chart) {

        /* req chart properties are title, names, logs, lets */
        /* opt chart properties are bins, range */

        return function (sim) {
            var traces = chart.names.map(function (name, i) {
                var mylog = chart.logs[i % chart.logs.length];
                var mylet = chart.lets[i % chart.lets.length];
                return {
                    name: name,
                    x: (0, _transpluck2.default)(sim.logs[mylog].data, { pluck: [mylet] })[mylet],
                    type: 'histogram',
                    opacity: 0.60,
                    nbinsx: 100
                };
            });
            var myrange = void 0,
                mybins = void 0;
            var mymin = void 0,
                mymax = void 0;
            if (chart.range) {
                myrange = chart.range;
            } else {
                mymin = d3A.min(traces, function (trace) {
                    return d3A.min(trace.x);
                });
                mymax = d3A.max(traces, function (trace) {
                    return d3A.max(trace.x);
                });
                myrange = [mymin, mymax];
            }
            if (chart.bins) {
                mybins = chart.bins;
            } else {
                mybins = Math.max(0, Math.min(200, Math.floor(1 + mymax - mymin)));
            }
            if (mybins && mybins !== 100) traces.forEach(function (trace) {
                trace.nbinsx = mybins;
            });
            var layout = {
                barmode: 'overlay',
                xaxis: {
                    range: myrange
                },
                title: chart.title
            };
            return [traces, layout];
        };
    },
    histogram2DFactory: function histogram2DFactory(chart) {

        /* req chart properties are title, names, logs, lets */

        ['names', 'logs', 'lets'].forEach(function (prop) {
            if (!Array.isArray(chart[prop])) throw new Error("histogram2DFactory: Expected array for chart." + prop + " got: " + _typeof(chart[prop]));
            if (chart[prop].length === 0 || chart[prop].length > 2) throw new Error("histogram2DFactory: Expected " + prop + " to be array of length 1 or 2, got: " + chart[prop].length);
        });

        return function (sim) {
            var series = chart.names.map(function (name, i) {
                var mylog = chart.logs[i % chart.logs.length];
                var mylet = chart.lets[i % chart.lets.length];
                return (0, _transpluck2.default)(sim.logs[mylog].data, { pluck: [mylet] })[mylet];
            });

            var points = Object.assign({}, {
                x: series[0],
                y: series[1],
                mode: 'markers',
                name: 'points',
                marker: {
                    color: 'rgb(102,0,0)',
                    size: 2,
                    opacity: 0.4
                }
            }, chart.points);

            var density = Object.assign({}, {
                x: series[0],
                y: series[1],
                name: 'density',
                ncontours: 30,
                colorscale: 'Hot',
                reversescale: true,
                showscale: false,
                type: 'histogram2dcontour'
            }, chart.density);

            var upper = Object.assign({}, {
                x: series[0],
                name: chart.names[0],
                marker: { color: points.marker.color },
                yaxis: 'y2',
                type: 'histogram'
            }, chart.upper);

            var right = Object.assign({}, {
                y: series[1],
                name: chart.names[1],
                marker: { color: points.marker.color },
                xaxis: 'x2',
                type: 'histogram'
            }, chart.right);

            var axiscommon = Object.assign({}, {
                showgrid: false,
                zeroline: false
            }, chart.axiscommon);

            var layout = Object.assign({}, {
                title: chart.title,
                showlegend: false,
                margin: { t: 50 },
                hovermode: 'closest',
                bargap: 0,
                xaxis: Object.assign({}, axiscommon, { domain: [0, 0.8] }),
                yaxis: Object.assign({}, axiscommon, { domain: [0, 0.8] }),
                xaxis2: Object.assign({}, axiscommon, { domain: [0.8, 1] }),
                yaxis2: Object.assign({}, axiscommon, { domain: [0.8, 1] })
            }, chart.layout);

            return [[points, density, upper, right], layout];
        };
    },
    plotOHLCTimeSeries: function plotOHLCTimeSeries() {
        function prepOHLC(sim) {
            var series = (0, _transpluck2.default)(sim.logs.ohlc.data, ['period', 'open', 'high', 'low', 'close']);
            var data = [{
                name: 'open',
                x: series.period,
                y: series.open,
                type: 'scatter',
                mode: 'markers'
            }, {
                name: 'high',
                x: series.period,
                y: series.high,
                type: 'scatter',
                mode: 'markers'
            }, {
                name: 'low',
                x: series.period,
                y: series.low,
                type: 'scatter',
                mode: 'markers'
            }, {
                name: 'close',
                x: series.period,
                y: series.close,
                type: 'scatter',
                mode: 'lines+markers'
            }];

            return data;
        }

        return function (sim) {
            var layout = yaxisRange(sim);
            var data = prepOHLC(sim);
            return [data, layout];
        };
    }
};

function build(arrayOfVisuals) {
    var myLibrary = arguments.length <= 1 || arguments[1] === undefined ? helpers : arguments[1];

    return arrayOfVisuals.map(function (visual) {
        return myLibrary[visual.f](visual);
    });
}
