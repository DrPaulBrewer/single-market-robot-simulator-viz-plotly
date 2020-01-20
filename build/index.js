"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setDefaultLayout = setDefaultLayout;
exports.setSampleSize = setSampleSize;
exports.getSampleSize = getSampleSize;
exports.setLogFilter = setLogFilter;
exports.getFilter = getFilter;
exports.yaxisRange = yaxisRange;
exports.plotFactory = plotFactory;
exports.build = build;
exports.helpers = void 0;

var d3A = _interopRequireWildcard(require("d3-array"));

var _transpluck = _interopRequireDefault(require("transpluck"));

var _stepifyPlotly = _interopRequireDefault(require("stepify-plotly"));

var _clone = _interopRequireDefault(require("clone"));

var Random = _interopRequireWildcard(require("random-js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var defaultLayout = {};
var MT = Random.MersenneTwister19937.autoSeed();

function setDefaultLayout(layout) {
  defaultLayout = (0, _clone["default"])(layout);
}

var sampleSize = +Infinity;

function setSampleSize(newsize) {
  sampleSize = newsize;
  return sampleSize;
}

function getSampleSize() {
  return sampleSize;
}

var logFilter = null;

function setLogFilter(newFilter) {
  logFilter = newFilter;
  return logFilter;
}

function getFilter() {
  return logFilter;
}

function sample(data) {
  if (data.length - 1 <= sampleSize) return data;
  var sampledData = Random.sample(MT, data.slice(1), sampleSize);
  sampledData.unshift(data[0].slice());
  return sampledData;
}

function extract(log) {
  if (logFilter === null) return sample(log.data);
  var _logFilter = logFilter,
      prop = _logFilter.prop,
      fromValue = _logFilter.fromValue,
      toValue = _logFilter.toValue;
  var data = prop ? log.selectAscending(prop, fromValue, toValue) : log.data;
  return sample(data);
}

function yaxisRange(sim) {
  return {
    yaxis: {
      range: [sim.config.L || 0, sim.config.H || 200]
    }
  };
}

function plotFactory(chart) {
  /* chart properties are title, log or logs, names, xs, ys, modes, layout */
  return function (sim) {
    var series = null;
    if (chart.log) series = (0, _transpluck["default"])(extract(sim.logs[chart.log]), {
      pluck: [].concat(chart.xs, chart.ys)
    });
    var traces = chart.names.map(function (name, i) {
      var xvar = chart.xs[i % chart.xs.length];
      var yvar = chart.ys[i % chart.ys.length];
      var mode = chart.modes[i % chart.modes.length];
      var logName = Array.isArray(chart.logs) && chart.logs[i % chart.logs.length];
      var type = 'scatter';

      if (logName) {
        series = (0, _transpluck["default"])(extract(sim.logs[logName]), {
          pluck: [xvar, yvar]
        });
      }

      var x = series[xvar];
      var y = series[yvar];
      return {
        name: name,
        mode: mode,
        type: type,
        x: x,
        y: y
      };
    });
    var layout = Object.assign({}, (0, _clone["default"])(defaultLayout), {
      title: chart.title
    }, yaxisRange(sim), chart.layout);
    return [traces, layout];
  };
}
/* this exports all the functions below, and also assigns them to the helpers object.
 * Depending on the version of the babel compiler, sometimes it exports the helpers object because exports are static and not dynamically computed in es6 ... which might be counterintuitive.
 */


var helpers = {
  supplyDemand: function supplyDemand() {
    return function (sim) {
      var i, l;
      var xboth = [];
      var buyerValues = sim.config.buyerValues.slice().sort(function (a, b) {
        return +b - a;
      });
      var sellerCosts = sim.config.sellerCosts.slice().sort(function (a, b) {
        return +a - b;
      });

      for (i = 0, l = Math.max(buyerValues.length, sellerCosts.length); i < l; ++i) {
        xboth[i] = i;
      }

      var demand = {
        name: 'unit value',
        x: xboth.slice(0, buyerValues.length),
        y: buyerValues,
        mode: 'lines+markers',
        type: 'scatter',
        steps: true
      };
      var supply = {
        name: 'unit cost',
        x: xboth.slice(0, sellerCosts.length),
        y: sellerCosts,
        mode: 'lines+markers',
        type: 'scatter',
        steps: true
      };
      var layout = Object.assign({}, (0, _clone["default"])(defaultLayout), yaxisRange(sim), {
        xaxis: {
          range: [0, xboth.length]
        }
      });
      var plotlyData = [demand, supply].map(_stepifyPlotly["default"]);
      return [plotlyData, layout];
    };
  },
  plotFactory: plotFactory,
  boxplotFactory: function boxplotFactory(chart) {
    // requires log, y, input='study'
    return function (sims) {
      if (!Array.isArray(sims)) throw new Error("boxplot requires an array of multiple simulations");
      var data = sims.map(function (sim, j) {
        var y = (0, _transpluck["default"])(extract(sim.logs[chart.log]), {
          pluck: [chart.y]
        })[chart.y];
        return {
          y: y,
          name: sim.config.name || sim.config.caseid || sim.caseid || '' + j,
          type: 'box',
          boxmean: 'sd',
          showlegend: false
        };
      });
      var layout = {
        title: 'box plot for ' + chart.log + '.' + chart.y
      };
      return [data, layout];
    };
  },
  violinFactory: function violinFactory(chart) {
    // requires log, y, input='study'
    return function (sims) {
      if (!Array.isArray(sims)) throw new Error("violin requires an array of multiple simulations");
      var data = sims.map(function (sim, j) {
        var y = (0, _transpluck["default"])(extract(sim.logs[chart.log]), {
          pluck: [chart.y]
        })[chart.y];
        return {
          y: y,
          name: sim.config.name || sim.config.caseid || sim.caseid || '' + j,
          type: 'violin',
          meanline: {
            visible: true
          },
          showlegend: false
        };
      });
      var layout = {
        title: 'violin plot for ' + chart.log + '.' + chart.y
      };
      return [data, layout];
    };
  },
  histogramFactory: function histogramFactory(chart) {
    /* req chart properties are title, names, logs, vars */

    /* opt chart properties are bins, range */
    return function (sim) {
      var traces = chart.names.map(function (name, i) {
        var mylog = chart.logs[i % chart.logs.length];
        var mylet = chart.vars[i % chart.vars.length];
        return {
          name: name,
          x: (0, _transpluck["default"])(extract(sim.logs[mylog]), {
            pluck: [mylet]
          })[mylet],
          type: 'histogram',
          opacity: 0.60,
          nbinsx: 100
        };
      });
      var myrange, mybins;
      var mymin, mymax;

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
      var layout = Object.assign({}, (0, _clone["default"])(defaultLayout), {
        barmode: 'overlay',
        xaxis: {
          range: myrange
        },
        title: chart.title
      });
      return [traces, layout];
    };
  },
  histogram2DFactory: function histogram2DFactory(chart) {
    /* req chart properties are title, names, logs, vars */
    ['names', 'logs', 'vars'].forEach(function (prop) {
      if (!Array.isArray(chart[prop])) throw new Error("histogram2DFactory: Expected array for chart." + prop + " got: " + _typeof(chart[prop]));
      if (chart[prop].length === 0 || chart[prop].length > 2) throw new Error("histogram2DFactory: Expected " + prop + " to be array of length 1 or 2, got: " + chart[prop].length);
    });
    return function (sim) {
      var series = chart.names.map(function (name, i) {
        var mylog = chart.logs[i % chart.logs.length];
        var mylet = chart.vars[i % chart.vars.length];
        return (0, _transpluck["default"])(extract(sim.logs[mylog]), {
          pluck: [mylet]
        })[mylet];
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
        marker: {
          color: points.marker.color
        },
        yaxis: 'y2',
        type: 'histogram'
      }, chart.upper);
      var right = Object.assign({}, {
        y: series[1],
        name: chart.names[1],
        marker: {
          color: points.marker.color
        },
        xaxis: 'x2',
        type: 'histogram'
      }, chart.right);
      var axiscommon = Object.assign({}, {
        showgrid: false,
        zeroline: false
      }, chart.axiscommon);
      var layout = Object.assign({}, defaultLayout, {
        title: chart.title,
        showlegend: false,
        margin: {
          t: 50
        },
        hovermode: 'closest',
        bargap: 0,
        xaxis: Object.assign({}, axiscommon, {
          domain: [0, 0.8]
        }),
        yaxis: Object.assign({}, axiscommon, {
          domain: [0, 0.8]
        }),
        xaxis2: Object.assign({}, axiscommon, {
          domain: [0.8, 1]
        }),
        yaxis2: Object.assign({}, axiscommon, {
          domain: [0.8, 1]
        })
      }, chart.layout);
      return [[points, density, upper, right], layout];
    };
  },
  plotOHLCTimeSeries: function plotOHLCTimeSeries() {
    return plotFactory({
      title: 'Open,High,Low,Close Trade prices for each period',
      log: 'ohlc',
      names: ['open', 'high', 'low', 'close'],
      xs: ['period'],
      ys: ['openPrice', 'highPrice', 'lowPrice', 'closePrice'],
      modes: ['markers', 'markers', 'markers', 'lines+markers']
    });
  },
  plotBidAskTradeTimeSeries: function plotBidAskTradeTimeSeries() {
    return plotFactory({
      title: 'Bid,Ask,Trade time series',
      names: ['bids', 'asks', 'trades'],
      logs: ['buyorder', 'sellorder', 'trade'],
      modes: ['markers', 'markers', 'lines+markers'],
      xs: ['t'],
      ys: ['buyLimitPrice', 'sellLimitPrice', 'price']
    });
  },
  plotProfitTimeSeries: function plotProfitTimeSeries(chart) {
    return function (sim) {
      var numberOfPeriods = sim.logs.profit.data.length;
      var periods = [];

      for (var i = 1, l = numberOfPeriods; i <= l; ++i) {
        periods.push(i);
      }

      var profitHeader = [];

      for (var _i = 1, _l = sim.numberOfBuyers; _i <= _l; ++_i) {
        profitHeader.push('Buyer' + _i);
      }

      for (var _i2 = 1, _l2 = sim.numberOfSellers; _i2 <= _l2; ++_i2) {
        profitHeader.push('Seller' + _i2);
      }

      var profitsByAgent = (0, _transpluck["default"])(sim.logs.profit.data, profitHeader);
      var traces = [];

      for (var _i3 = 0, _l3 = sim.numberOfAgents; _i3 < _l3; ++_i3) {
        traces.push({
          x: periods,
          y: profitsByAgent[profitHeader[_i3]],
          name: profitHeader[_i3],
          mode: 'markers',
          marker: {
            symbol: _i3 < sim.numberOfBuyers ? "circle" : "square"
          },
          type: 'scatter'
        });
      }

      var layout = Object.assign({}, defaultLayout, {
        title: "Profits for each agent and period"
      }, yaxisRange(sim), chart.layout);
      return [traces, layout];
    };
  }
};
exports.helpers = helpers;

function build(arrayOfVisuals) {
  var myLibrary = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : helpers;
  return arrayOfVisuals.map(function (visual) {
    try {
      var f = myLibrary[visual.f](visual);
      if (typeof f !== "function") throw new Error("visualization function named " + visual.f + " does not exist");
      f.meta = visual;
      return f;
    } catch (e) {
      console.log(e); // eslint-disable-line no-console

      return undefined;
    }
  }).filter(function (visualFunction) {
    return typeof visualFunction === "function";
  });
}
