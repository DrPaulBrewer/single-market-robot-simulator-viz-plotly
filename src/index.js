/* Copyright 2016- Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

import * as d3A from 'd3-array';
import transpluck from 'transpluck';
import stepify from 'stepify-plotly';
import clone from 'clone';
import * as Random from 'random-js';
import crossSingleUnitSupplyAndDemand from 'market-pricing';
let defaultLayout = {};

const MT = Random.MersenneTwister19937.autoSeed();

export function setDefaultLayout(layout) {
  defaultLayout = clone(layout);
}

let sampleSize = +Infinity;

export function setSampleSize(newsize) {
  sampleSize = newsize;
  return sampleSize;
}

export function getSampleSize() {
  return sampleSize;
}

let logFilter = null;
export function setFilter(newFilter){
  logFilter = newFilter;
  return logFilter;
}

export function getFilter(){
  return logFilter;
}

function sample(data) {
  if ((data.length - 1) <= sampleSize)
    return data;
  const sampledData = Random.sample(MT, data.slice(1), sampleSize);
  sampledData.unshift(data[0].slice());
  return sampledData;
}

function extract(log){
  if (logFilter === null)
    return sample(log.data);
  const { prop, fromValue, toValue } = logFilter;
  const data = (prop)? (log.selectAscending(prop,fromValue,toValue)): (log.data);
  return sample(data);
}

export function yaxisRange(sim, axisOptions={}) {
  return {
    yaxis: Object.assign(
      {},
      axisOptions,
      { range: [(sim.config.L || 0), (sim.config.H || 200)] }
    )
  };
}

export function plotFactory(chart) {

  /* chart properties are title, log or logs, names, xs, ys, modes, layout */

  return function (sim) {
    let series = null;
    if (chart.log)
      series = transpluck(extract(sim.logs[chart.log]), { pluck: [].concat(chart.xs, chart.ys) });
    const traces = chart.names.map(function (name, i) {
      const type = 'scatter';
      const mode = chart.modes[i % chart.modes.length];
      let x = [], y=[];
      try {
        const xvar = chart.xs[i % chart.xs.length];
        const yvar = chart.ys[i % chart.ys.length];
        const logName = Array.isArray(chart.logs) && (chart.logs[i % chart.logs.length]);
        if (logName){
          series = transpluck(extract(sim.logs[logName]), { pluck: [xvar, yvar] });
        }
        x = series[xvar];
        y = series[yvar];
        if (!Array.isArray(x))
          x = [];
        if (!Array.isArray(y))
          y = [];
        if (x.length!==y.length)
          throw new Error("plotFactory: x and y series are of unequal length");
      } catch(e){
        console.log("plotFactory: error, no data for "+name+" chart "+i);
        console.log(e);
        x = [];
        y = [];
      }
      return { name, mode, type, x, y };
    });
    let layout = Object.assign({},
      clone(defaultLayout), { title: chart.title },
      yaxisRange(sim),
      chart.layout
    );
    return [traces, layout];
  };
}

/* this exports all the functions below, and also assigns them to the helpers object.
 * Depending on the version of the babel compiler, sometimes it exports the helpers object because exports are static and not dynamically computed in es6 ... which might be counterintuitive.
 */

export const helpers = {

  supplyDemand() {
    return function (sim) {
      const demandValues = sim.config.buyerValues.slice().sort(function (a, b) { return +b - a; });
      const supplyCosts = sim.config.sellerCosts.slice().sort(function (a, b) { return +a - b; });
      if (demandValues[demandValues.length-1]>0){
        demandValues.push(0);
      }
      const h = sim.config.h || 200;
      if (supplyCosts[supplyCosts.length-1]<=h){
        supplyCosts.push(h+1);
      }
      const ceModel = crossSingleUnitSupplyAndDemand(demandValues,supplyCosts);
      const ceResult = (ceModel && ceModel.p && ceModel.q)? ('CE: '+JSON.stringify(ceModel)): '';
      const maxlen = Math.max(demandValues.length, supplyCosts.length);
      const minlen = Math.min(demandValues.length, supplyCosts.length);
      const steps = (maxlen<=30);
      const mode = (maxlen<=30)? 'lines+markers' : 'markers';
      const type = 'scatter';
      const cutoff = Math.min(minlen+10,maxlen);
      const idxStep = Math.max(1,Math.ceil(minlen/50));
      const xD=[],yD=[],xS=[],yS=[];
      function include(i){
        if (i<0) return;
        if(i<demandValues.length){
          xD.push(i+1);
          yD.push(demandValues[i]);
        }
        if(i<supplyCosts.length){
          xS.push(i+1);
          yS.push(supplyCosts[i]);
        }
      }
      let q0,q1;
      if (Array.isArray(ceModel.q)){
        [q0,q1] = ceModel.q;
      } else if (+ceModel.q>0){
          q0=ceModel.q;
          q1=q0+1;
      } else {
        q0=0;
        q1=1;
      }
      for(let i=0,l=q0-1;i<l;i+=idxStep)
        include(i);
      for(let i=q0-1,l=q1-1;i<l;i+=Math.min(q1-q0,idxStep))
        include(i);
      for (let i=q1-1,l=cutoff;i<l;i+=Math.min(cutoff-q1,idxStep))
        include(i);

      let demand = {
        name: 'demand',
        x: xD,
        y: yD,
        mode,
        type,
        steps
      };
      let supply = {
        name: 'supply',
        x: xS,
        y: yS,
        mode,
        type,
        steps
      };
      let layout = Object.assign({},
        clone(defaultLayout),
        yaxisRange(sim, {
          title: 'P'
        }),
        {
          xaxis: {
            range: [0, cutoff+1],
            title: "Q"
          },
          title: "Case "+sim.config.caseid+" S/D Model <br><sub>"+ceResult+"</sub>"
        }
      );
      let plotlyData = [demand, supply].map(stepify);
      return [plotlyData, layout];
    };
  },

  plotFactory,

  boxplotFactory(chart) {
    // requires log, y, input='study'

    return function (sims) {
      if (!Array.isArray(sims))
        throw new Error("boxplot requires an array of multiple simulations");
      const data = sims.map((sim, j) => {
        let y = [];
        try {
          y = transpluck(extract(sim.logs[chart.log]), { pluck: [chart.y] })[chart.y];
        } catch(e){
          y = [];
          console.log("boxplotFactory: error, no data for simulation "+j);
          console.log(e);
        }
        return {
          y,
          name: sim.config.name || sim.config.caseid || sim.caseid || ('' + j),
          type: 'box',
          boxmean: 'sd',
          showlegend: false
        };
      });
      const layout = {
        title: 'box plot for ' + chart.log + '.' + chart.y
      };
      return [data, layout];
    };
  },

  violinFactory(chart) {
    // requires log, y, input='study'

    return function (sims) {
      if (!Array.isArray(sims))
        throw new Error("violin requires an array of multiple simulations");
      const data = sims.map((sim, j) => {
        let y = [];
        try {
          y = transpluck(extract(sim.logs[chart.log]), { pluck: [chart.y] })[chart.y];
        } catch(e){
          y = [];
          console.log("violinFactory: error, no data for simulation "+j);
          console.log(e);
        }
        return {
          y,
          name: sim.config.name || sim.config.caseid || sim.caseid || ('' + j),
          type: 'violin',
          meanline: {
            visible: true
          },
          showlegend: false
        };
      });
      const layout = {
        title: 'violin plot for ' + chart.log + '.' + chart.y
      };
      return [data, layout];
    };
  },


  histogramFactory(chart) {

    /* req chart properties are title, names, logs, vars */
    /* opt chart properties are bins, range */

    return function (sim) {
      let traces = chart.names.map(function (name, i) {
        let mylog = chart.logs[i % chart.logs.length];
        let mylet = chart.vars[i % chart.vars.length];
        let x = [];
        try {
          x = transpluck(extract(sim.logs[mylog]), { pluck: [mylet] })[mylet];
        } catch(e){
          x = [];
          console.log("histogramFactory: error, no data for "+name+" chart "+i);
          console.log(e);
        }
        return {
          name,
          x,
          type: 'histogram',
          opacity: 0.60,
          nbinsx: 100
        };
      });
      let myrange, mybins;
      let mymin, mymax;
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
      if (mybins && mybins !== 100)
        traces.forEach(function (trace) { trace.nbinsx = mybins; });
      let layout = Object.assign({},
        clone(defaultLayout), {
          barmode: 'overlay',
          xaxis: {
            range: myrange
          },
          title: chart.title
        }
      );
      return [traces, layout];
    };
  },


  histogram2DFactory(chart) {

    /* req chart properties are title, names, logs, vars */

    ['names', 'logs', 'vars'].forEach(function (prop) {
      if (!Array.isArray(chart[prop]))
        throw new Error("histogram2DFactory: Expected array for chart." + prop + " got: " + typeof(chart[prop]));
      if ((chart[prop].length === 0) || (chart[prop].length > 2))
        throw new Error("histogram2DFactory: Expected " + prop + " to be array of length 1 or 2, got: " + chart[prop].length);
    });

    return function (sim) {
      let series = [[],[]];
      try {
        series = chart.names.map(function (name, i) {
          let mylog = chart.logs[i % chart.logs.length];
          let mylet = chart.vars[i % chart.vars.length];
          return transpluck(extract(sim.logs[mylog]), { pluck: [mylet] })[mylet];
        });
      } catch(e){
        console.log("histogram2DFactory: error, no data");
        console.log(e);
        series = [[],[]];
      }

      let points = Object.assign({}, {
          x: series[0],
          y: series[1],
          mode: 'markers',
          name: 'points',
          marker: {
            color: 'rgb(102,0,0)',
            size: 2,
            opacity: 0.4
          }
        },
        chart.points
      );


      let density = Object.assign({}, {
          x: series[0],
          y: series[1],
          name: 'density',
          ncontours: 30,
          colorscale: 'Hot',
          reversescale: true,
          showscale: false,
          type: 'histogram2dcontour'
        },
        chart.density
      );

      let upper = Object.assign({}, {
          x: series[0],
          name: chart.names[0],
          marker: { color: points.marker.color },
          yaxis: 'y2',
          type: 'histogram'
        },
        chart.upper
      );

      let right = Object.assign({}, {
          y: series[1],
          name: chart.names[1],
          marker: { color: points.marker.color },
          xaxis: 'x2',
          type: 'histogram'
        },
        chart.right
      );

      let axiscommon = Object.assign({}, {
          showgrid: false,
          zeroline: false
        },
        chart.axiscommon
      );

      let layout = Object.assign({},
        defaultLayout, {
          title: chart.title,
          showlegend: false,
          margin: { t: 50 },
          hovermode: 'closest',
          bargap: 0,
          xaxis: Object.assign({},
            axiscommon, { domain: [0, 0.8] }
          ),
          yaxis: Object.assign({},
            axiscommon, { domain: [0, 0.8] }
          ),
          xaxis2: Object.assign({},
            axiscommon, { domain: [0.8, 1] }
          ),
          yaxis2: Object.assign({},
            axiscommon, { domain: [0.8, 1] }
          )
        },
        chart.layout
      );

      return [
        [points, density, upper, right], layout
      ];

    };
  },


  plotOHLCTimeSeries() {
    return plotFactory({
      title: 'Open,High,Low,Close Trade prices for each period',
      log: 'ohlc',
      names: ['open', 'high', 'low', 'close'],
      xs: ['period'],
      ys: ['openPrice', 'highPrice', 'lowPrice', 'closePrice'],
      modes: ['markers', 'markers', 'markers', 'lines+markers']
    });
  },

  plotBidAskTradeTimeSeries() {
    return plotFactory({
      title: 'Bid,Ask,Trade time series',
      names: ['bids', 'asks', 'trades'],
      logs: ['buyorder', 'sellorder', 'trade'],
      modes: ['markers', 'markers', 'lines+markers'],
      xs: ['t'],
      ys: ['buyLimitPrice', 'sellLimitPrice', 'price']
    });
  },

  plotProfitTimeSeries(chart) {
    return function (sim) {
      const numberOfPeriods = sim.logs.profit.data.length;
      const periods = [];
      for (let i = 1, l = numberOfPeriods;i<=l;++i)
        periods.push(i);
      const profitHeader = [];
      for (let i = 1, l = sim.numberOfBuyers;i<=l;++i)
        profitHeader.push('Buyer' + i);
      for (let i = 1, l = sim.numberOfSellers;i<=l;++i)
        profitHeader.push('Seller' + i);
      const profitsByAgent = transpluck(sim.logs.profit.data, profitHeader);
      const traces = [];
      for (let i = 0, l = sim.numberOfAgents;i<l;++i)
        traces.push({
          x: periods,
          y: profitsByAgent[profitHeader[i]],
          name: profitHeader[i],
          mode: 'markers',
          marker: {
            symbol: ((i < sim.numberOfBuyers) ? "circle" : "square")
          },
          type: 'scatter'
        });
      const layout = Object.assign({},
        defaultLayout, { title: "Profits for each agent and period" },
        yaxisRange(sim),
        chart.layout
      );
      return [traces, layout];
    };
  }
};

export function build(arrayOfVisuals, myLibrary = helpers) {
  return arrayOfVisuals.map(function (visual) {
    try {
      let f = myLibrary[visual.f](visual);
      if (typeof(f) !== "function")
        throw new Error("visualization function named " + visual.f + " does not exist");
      f.meta = visual;
      return f;
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
      return undefined;
    }
  }).filter(function (visualFunction) { return (typeof(visualFunction) === "function"); });
}
