"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setDefaultLayout = setDefaultLayout;
exports.setSampleSize = setSampleSize;
exports.getSampleSize = getSampleSize;
exports.setFilter = setFilter;
exports.getFilter = getFilter;
exports.yaxisRange = yaxisRange;
exports.chartTitle = chartTitle;
exports.plotFactory = plotFactory;
exports.build = build;
exports.helpers = exports.VisualizationFactory = exports.Visualization = exports.PlotlyDataLayoutConfig = void 0;

var d3A = _interopRequireWildcard(require("d3-array"));

var _transpluck = _interopRequireDefault(require("transpluck"));

var _stepifyPlotly = _interopRequireDefault(require("stepify-plotly"));

var _clone = _interopRequireDefault(require("clone"));

var Random = _interopRequireWildcard(require("random-js"));

var marketPricing = _interopRequireWildcard(require("market-pricing"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PlotlyDataLayoutConfig =
/*#__PURE__*/
function () {
  function PlotlyDataLayoutConfig(options) {
    _classCallCheck(this, PlotlyDataLayoutConfig);

    this.data = options.data || [];
    this.layout = options.layout || {};
    this.config = options.config || {};
    this.setInteractivity(options.isInteractive);

    if (options.title) {
      this.adjustTitle(options.title);
    }
  }
  /**
   * Set Plotly interactivity based on #useInteractiveCharts checkbox
   * @param {[boolean]} interactive optional, if undefined taken from $('#useInteractiveCharts')
   */


  _createClass(PlotlyDataLayoutConfig, [{
    key: "setInteractivity",
    value: function setInteractivity() {
      var isInteractive = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var config = this.config;
      config.staticPlot = !isInteractive;
      config.displayModeBar = isInteractive;
      config.showSendToCloud = isInteractive;
      return this;
    }
    /**
     * Change Plotly plot title by prepending, appending, or replacing existing plot title
     * @param {{prepend: ?string, append: ?string, replace: ?string}} modifier modifications to title
     */

  }, {
    key: "adjustTitle",
    value: function adjustTitle(modifier) {
      var layout = this.layout;
      if (modifier.replace && modifier.replace.length > 0) layout.title = modifier.replace;

      if (layout.title) {
        if (modifier.prepend && modifier.prepend.length > 0) layout.title = modifier.prepend + layout.title;
        if (modifier.append && modifier.append.length > 0) layout.title += modifier.append;
      }

      return this;
    }
  }]);

  return PlotlyDataLayoutConfig;
}();

exports.PlotlyDataLayoutConfig = PlotlyDataLayoutConfig;

function extractNestedConfig(sim, starter) {
  var result = {};

  if (sim && sim.config) {
    var titleKeys = Object.keys(sim.config).filter(function (k) {
      return k.startsWith(starter);
    });
    titleKeys.forEach(function (k) {
      var withoutStarter = k.slice(starter.length);
      var newKey = withoutStarter[0].toLowerCase() + withoutStarter.slice(1);
      result[newKey] = sim.config[k];
    });
  }

  return result;
}

var Visualization =
/*#__PURE__*/
function (_PlotlyDataLayoutConf) {
  _inherits(Visualization, _PlotlyDataLayoutConf);

  function Visualization() {
    _classCallCheck(this, Visualization);

    return _possibleConstructorReturn(this, _getPrototypeOf(Visualization).apply(this, arguments));
  }

  _createClass(Visualization, [{
    key: "show",
    value: function show(div) {
      Plotly.react(div, this.data, this.layout, this.config);
      return this;
    }
  }]);

  return Visualization;
}(PlotlyDataLayoutConfig);

exports.Visualization = Visualization;

var VisualizationFactory =
/*#__PURE__*/
function () {
  function VisualizationFactory(spec) {
    _classCallCheck(this, VisualizationFactory);

    // Legacy compatibility
    this.meta = spec;
    this.loader = helpers[spec.f](spec); // eslint-disable-line no-use-before-define
    // Plotly default settings
    // this.data not initialized here

    this.layout = {};
    this.config = {
      responsive: true,
      displaylogo: false
    };
  }

  _createClass(VisualizationFactory, [{
    key: "load",
    value: function load(options) {
      var _this = this;

      var from = options.from,
          to = options.to,
          title = options.title,
          isInteractive = options.isInteractive;
      if (!from) throw new Error("no data source for VisualizationFactory.load");

      if (!Array.isArray(from) && this.meta.input === 'study') {
        throw new Error("this visualization requires an array of simulations");
      }

      if (Array.isArray(from) && this.meta.input !== 'study') {
        var arrayOfVisualizations = [];
        from.forEach(function (sim, j) {
          // recursive call with single sim and div with appended index
          var loadedVizForThisSim = _this.load({
            from: sim,
            to: to + j,
            title: title,
            isInteractive: isInteractive
          });

          arrayOfVisualizations.push(loadedVizForThisSim);
        });
        return arrayOfVisualizations;
      } // the loaders were written first; adapt their output
      // from triplet array format to object property format


      var _this$loader = this.loader(from),
          _this$loader2 = _slicedToArray(_this$loader, 3),
          data = _this$loader2[0],
          _layout = _this$loader2[1],
          _config = _this$loader2[2];

      var layout = Object.assign({}, (0, _clone["default"])(this.layout), (0, _clone["default"])(_layout));
      var config = Object.assign({}, (0, _clone["default"])(this.config), (0, _clone["default"])(_config));
      var v = new Visualization({
        data: data,
        layout: layout,
        config: config
      });
      v.setInteractivity(isInteractive);

      if (title) {
        v.adjustTitle(title);
      } else if (from && from.config) {
        var simTitleModifier = extractNestedConfig(from, 'title');
        v.adjustTitle(simTitleModifier);
      }

      if (to) return v.show(to);
      return v;
    }
  }]);

  return VisualizationFactory;
}();

exports.VisualizationFactory = VisualizationFactory;
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

function setFilter(newFilter) {
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
  var axisOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return {
    yaxis: Object.assign({}, axisOptions, {
      range: [sim.config.L || 0, sim.config.H || 200]
    })
  };
}

function chartTitle(suggested, sim) {
  return suggested + "<br>case: " + sim.config.caseid;
}

function plotFactory(chart) {
  /* chart properties are title, log or logs, names, xs, ys, modes, layout */
  return function (sim) {
    var series = null;
    if (chart.log) series = (0, _transpluck["default"])(extract(sim.logs[chart.log]), {
      pluck: [].concat(chart.xs, chart.ys)
    });
    var traces = chart.names.map(function (name, i) {
      var type = 'scatter';
      var mode = chart.modes[i % chart.modes.length];
      var x = [],
          y = [];

      try {
        var xvar = chart.xs[i % chart.xs.length];
        var yvar = chart.ys[i % chart.ys.length];
        var logName = Array.isArray(chart.logs) && chart.logs[i % chart.logs.length];

        if (logName) {
          series = (0, _transpluck["default"])(extract(sim.logs[logName]), {
            pluck: [xvar, yvar]
          });
        }

        x = series[xvar];
        y = series[yvar];
        if (!Array.isArray(x)) x = [];
        if (!Array.isArray(y)) y = [];
        if (x.length !== y.length) throw new Error("plotFactory: x and y series are of unequal length");
      } catch (e) {
        console.log("plotFactory: error, no data for " + name + " chart " + i);
        console.log(e);
        x = [];
        y = [];
      }

      return {
        name: name,
        mode: mode,
        type: type,
        x: x,
        y: y
      };
    });
    var layout = Object.assign({}, (0, _clone["default"])(defaultLayout), {
      title: chartTitle(chart.title, sim)
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
      var demandValues = sim.config.buyerValues.slice().sort(function (a, b) {
        return +b - a;
      });
      var supplyCosts = sim.config.sellerCosts.slice().sort(function (a, b) {
        return +a - b;
      });

      if (demandValues[demandValues.length - 1] > 0) {
        demandValues.push(0);
      }

      var h = sim.config.h || 200;

      if (supplyCosts[supplyCosts.length - 1] <= h) {
        supplyCosts.push(h + 1);
      }

      var ceModel = marketPricing.crossSingleUnitDemandAndSupply(demandValues, supplyCosts);
      var ceResult = ceModel && ceModel.p && ceModel.q ? 'CE: ' + JSON.stringify(ceModel) : '';
      var maxlen = Math.max(demandValues.length, supplyCosts.length);
      var minlen = Math.min(demandValues.length, supplyCosts.length);
      var steps = maxlen <= 30;
      var mode = maxlen <= 30 ? 'lines+markers' : 'markers';
      var type = 'scatter';
      var cutoff = Math.min(minlen + 10, maxlen);
      var idxStep = Math.max(1, Math.ceil(minlen / 50));
      var xD = [],
          yD = [],
          xS = [],
          yS = [];

      function include(i) {
        if (i < 0) return;

        if (i < demandValues.length) {
          xD.push(i + 1);
          yD.push(demandValues[i]);
        }

        if (i < supplyCosts.length) {
          xS.push(i + 1);
          yS.push(supplyCosts[i]);
        }
      }

      var q0, q1;

      if (Array.isArray(ceModel.q)) {
        var _ceModel$q = _slicedToArray(ceModel.q, 2);

        q0 = _ceModel$q[0];
        q1 = _ceModel$q[1];
      } else if (+ceModel.q > 0) {
        q0 = ceModel.q;
        q1 = q0 + 1;
      } else {
        q0 = 0;
        q1 = 1;
      }

      for (var i = 0, l = q0 - 1; i < l; i += idxStep) {
        include(i);
      }

      for (var _i2 = q0 - 1, _l = q1 - 1; _i2 < _l; _i2 += Math.min(q1 - q0, idxStep)) {
        include(_i2);
      }

      for (var _i3 = q1 - 1, _l2 = cutoff; _i3 < _l2; _i3 += Math.min(cutoff - q1, idxStep)) {
        include(_i3);
      }

      var demand = {
        name: 'demand',
        x: xD,
        y: yD,
        mode: mode,
        type: type,
        steps: steps
      };
      var supply = {
        name: 'supply',
        x: xS,
        y: yS,
        mode: mode,
        type: type,
        steps: steps
      };
      var layout = Object.assign({}, (0, _clone["default"])(defaultLayout), yaxisRange(sim, {
        title: 'P'
      }), {
        xaxis: {
          range: [0, cutoff + 1],
          title: "Q"
        },
        title: " S/D Model <br>Case " + sim.config.caseid + "<br><sub>" + ceResult + "</sub>"
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
        var y = [];

        try {
          y = (0, _transpluck["default"])(extract(sim.logs[chart.log]), {
            pluck: [chart.y]
          })[chart.y];
        } catch (e) {
          y = [];
          console.log("boxplotFactory: error, no data for simulation " + j);
          console.log(e);
        }

        var name = '' + sim.config.caseid;
        return {
          y: y,
          name: name,
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
        var y = [];

        try {
          y = (0, _transpluck["default"])(extract(sim.logs[chart.log]), {
            pluck: [chart.y]
          })[chart.y];
        } catch (e) {
          y = [];
          console.log("violinFactory: error, no data for simulation " + j);
          console.log(e);
        }

        var name = '' + sim.config.caseid;
        return {
          y: y,
          name: name,
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
        var x = [];

        try {
          x = (0, _transpluck["default"])(extract(sim.logs[mylog]), {
            pluck: [mylet]
          })[mylet];
        } catch (e) {
          x = [];
          console.log("histogramFactory: error, no data for " + name + " chart " + i);
          console.log(e);
        }

        return {
          name: name,
          x: x,
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
        title: chartTitle(chart.title, sim)
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
      var series = [[], []];

      try {
        series = chart.names.map(function (name, i) {
          var mylog = chart.logs[i % chart.logs.length];
          var mylet = chart.vars[i % chart.vars.length];
          return (0, _transpluck["default"])(extract(sim.logs[mylog]), {
            pluck: [mylet]
          })[mylet];
        });
      } catch (e) {
        console.log("histogram2DFactory: error, no data");
        console.log(e);
        series = [[], []];
      }

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
      layout.title = chartTitle(layout.title, sim);
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

      for (var _i4 = 1, _l3 = sim.numberOfBuyers; _i4 <= _l3; ++_i4) {
        profitHeader.push('Buyer' + _i4);
      }

      for (var _i5 = 1, _l4 = sim.numberOfSellers; _i5 <= _l4; ++_i5) {
        profitHeader.push('Seller' + _i5);
      }

      var profitsByAgent = (0, _transpluck["default"])(sim.logs.profit.data, profitHeader);
      var traces = [];

      for (var _i6 = 0, _l5 = sim.numberOfAgents; _i6 < _l5; ++_i6) {
        traces.push({
          x: periods,
          y: profitsByAgent[profitHeader[_i6]],
          name: profitHeader[_i6],
          mode: 'markers',
          marker: {
            symbol: _i6 < sim.numberOfBuyers ? "circle" : "square"
          },
          type: 'scatter'
        });
      }

      var title = chartTitle("Profits for each agent and period", sim);
      var layout = Object.assign({}, defaultLayout, {
        title: title
      }, yaxisRange(sim), chart.layout);
      return [traces, layout];
    };
  }
};
exports.helpers = helpers;

function build(arrayOfVisuals) {
  return arrayOfVisuals.map(function (spec) {
    try {
      return new VisualizationFactory(spec);
    } catch (e) {
      console.log(e); // eslint-disable-line no-console

      return undefined;
    }
  });
}
