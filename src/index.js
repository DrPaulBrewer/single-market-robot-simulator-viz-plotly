/* global Plotly: true */
/* eslint consistent-this: ["error", "app", "that"] */
/* eslint no-console: "off" */

import * as d3A from 'd3-array';
import transpluck from 'transpluck';
import stepify from 'stepify-plotly';
import clone from 'clone';
import deepmerge from 'deepmerge';
import decamelize from 'decamelize';
import * as Random from 'random-js';
import * as marketPricing from 'market-pricing';

export class PlotlyDataLayoutConfig {
  constructor(options){
    this.data = options.data || [];
    this.layout = options.layout || {};
    this.config = options.config || {};
    this.setInteractivity(options.isInteractive);
    if (options.title){
      this.adjustTitle(options.title);
    }
  }

  /**
   * Set Plotly interactivity based on #useInteractiveCharts checkbox
   * @param {[boolean]} interactive optional, if undefined taken from $('#useInteractiveCharts')
   */

  setInteractivity(isInteractive=false){
    const config = this.config;
    config.staticPlot = !isInteractive;
    config.displayModeBar = isInteractive;
    config.showSendToCloud = isInteractive;
    return this;
  }

/**
 * Change Plotly plot title by prepending, appending, or replacing existing plot title
 * @param {{prepend: ?string, append: ?string, replace: ?string}} modifier modifications to title
 */

  adjustTitle(modifier){
    const layout = this.layout;
    if (!layout.title) layout.title = {};
    if (modifier.replace && (modifier.replace.length > 0)){
      layout.title.text = modifier.replace;
    }
    if (layout.title && layout.title.text) {
      if (modifier.prepend && (modifier.prepend.length > 0))
        layout.title.text = modifier.prepend + layout.title;
      if (modifier.append && (modifier.append.length > 0))
        layout.title.text += modifier.append;
    }
    return this;
  }
}

function extractNestedConfig(sim, starter){
  const result = {};
  if (sim && sim.config){
    const titleKeys = Object.keys(sim.config).filter((k)=>(k.startsWith(starter)));
    titleKeys.forEach((k)=>{
      const withoutStarter = k.slice(starter.length);
      const newKey = withoutStarter[0].toLowerCase()+withoutStarter.slice(1);
      result[newKey] = sim.config[k];
    });
  }
  return result;
}

export class Visualization extends PlotlyDataLayoutConfig {
  show(div){
    Plotly.react(div,this.data,this.layout,this.config);
    return this;
  }
}

export class VisualizationFactory  {
  constructor(spec){
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

  load(options){
    const { from, to, title, isInteractive } = options;
    if (!from) throw new Error("no data source for VisualizationFactory.load");
    if (!Array.isArray(from) && (this.meta.input==='study')){
      throw new Error("this visualization requires an array of simulations");
    }
    if (Array.isArray(from) && (this.meta.input!=='study')){
      const arrayOfVisualizations = [];
      from.forEach((sim,j)=>{
        // recursive call with single sim and div with appended index
        const loadedVizForThisSim = this.load({
          from: sim,
          to: to+j,
          title,
          isInteractive
        });
        arrayOfVisualizations.push(loadedVizForThisSim);
      });
      return arrayOfVisualizations;
    }
    // the loaders were written first; adapt their output
    // from triplet array format to object property format
    const [data,_layout,_config] = this.loader(from);
    const layout = deepmerge(this.layout,_layout || {});
    const config = deepmerge(this.config,_config || {});
    const v =  new Visualization({ data, layout, config});
    v.setInteractivity(isInteractive);
    if (title){
      v.adjustTitle(title);
    } else if (from && from.config){
      const simTitleModifier = extractNestedConfig(from, 'title');
      v.adjustTitle(simTitleModifier);
    }
    if (to) return v.show(to);
    return v;
  }
}

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

function hasAnyKeyword(vars, keyWords){
  if (Array.isArray(vars))
    return vars.some((v)=>(hasAnyKeyword(v,keyWords)));
  return (
    (typeof(vars)==='string') &&
    (keyWords.some((k)=>(vars.toLowerCase().includes(k.toLowerCase()))))
  );
}

function hasPriceVars(vars){
  const keyWords = ['price','value','cost'];
  return hasAnyKeyword(vars,keyWords);
}


function axisTitle(vs){
  const v1 = ((Array.isArray(vs) && (vs.length===1) && vs[0])) ||
    ((typeof(vs)==='string') && vs);
  let text = '';
  if (v1){
    text = decamelize(v1,' ');
  } else if (hasPriceVars(vs)){
    text = 'P';
  }
  return { title: { text }};
}

function axisRange(vs, sim){
    if (hasPriceVars(vs)){
      const h = sim && sim.config && sim.config.H;
      return (h && {range: [0,+h]});
    }
    if (hasAnyKeyword(vs,['efficiency'])){
      return {range: [0,100]};
    }
    if (hasAnyKeyword(vs,['gini'])){
      return {range: [0,1]};
    }
}

function caseIdAnnotation(caseid){
  return (caseid===undefined)? '': (`<br>case: ${caseid}`);
}

function getLayout({xs,ys,title,sim,xrange,yrange}){
  const items = [defaultLayout];
  function xaxis(obj){ if (obj) items.push({xaxis: obj}); }
  function yaxis(obj){ if (obj) items.push({yaxis: obj}); }
  const caseid = sim && sim.config && sim.config.caseid;
  items.push({ title: { text: (title || '')+caseIdAnnotation(caseid) } });
  if (xs){
    xaxis(axisTitle(xs));
    xaxis(xrange? ({range: xrange}) : (axisRange(xs,sim)));
  }
  if (ys){
    yaxis(axisTitle(ys));
    yaxis(yrange? ({range: yrange}) : (axisRange(ys,sim)));
  }
  return deepmerge.all(items);
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
    const layout = getLayout({xs: chart.xs,ys: chart.ys, title: chart.title, sim});
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
      const ceModel = marketPricing.crossSingleUnitDemandAndSupply(demandValues,supplyCosts);
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
      let layout = deepmerge.all([
        clone(defaultLayout),
        { yaxis:{
            range: [0, sim.config.H],
            title: {
              text: "P"
            }
          }
        },
        {
          xaxis: {
            range: [0, cutoff+1],
            title: {
              text: "Q"
            }
          },
          title: {
            text: " S/D Model <br>Case "+sim.config.caseid+"<br><sub>"+ceResult+"</sub>"
          }
        }
      ]);
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
        const name = ''+sim.config.caseid;
        return {
          y,
          name,
          type: 'box',
          boxmean: 'sd',
          showlegend: false
        };
      });
      const layout = getLayout({
        title: chart.title,
        ys: [chart.y],
        xs: 'caseId'
      });
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
        const name = ''+sim.config.caseid;
        return {
          y,
          name,
          type: 'violin',
          meanline: {
            visible: true
          },
          showlegend: false
        };
      });
      const layout = getLayout({
        title: chart.title,
        ys: [chart.y],
        xs: 'caseId'
      });
      return [data, layout];
    };
  },


  histogramFactory(chart) {

    /* req chart properties are title, names, logs, vars */
    /* opt chart properties are bins, range */

    const nbinsxDefault = 100;

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
          nbinsx: nbinsxDefault
        };
      });
      const layout = Object.assign(
        {},
        getLayout({sim, xrange: chart.range, xs: chart.vars, ys: 'N', title: chart.title}),
        {barmode: 'overlay'}
      );
      let mymin, mymax, mybins;
      if (layout && layout.xaxis && (layout.xaxis.range)){
          [mymin, mymax] = layout.xaxis.range;
      }
      if ((mymin===undefined) || (mymax===undefined)){
        mymin = d3A.min(traces, function (trace) {
          return d3A.min(trace.x);
        });
        mymax = d3A.max(traces, function (trace) {
          return d3A.max(trace.x);
        });
        layout.xaxis.range = [mymin,mymax];
      }
      if (chart.bins) {
        mybins = chart.bins;
      } else {
        mybins = Math.max(0, Math.min(200, Math.floor(1 + mymax - mymin)));
      }
      if (mybins && (mybins>=2) && (mybins !== nbinsxDefault))
        traces.forEach(function (trace) { trace.nbinsx = mybins; });
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

      let layout = deepmerge.all([
        defaultLayout,
        {
          title: {
            text: chart.title+caseIdAnnotation(sim.config && sim.config.caseid)
          },
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
        chart.layout || {}
      ]);

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
      const layout = deepmerge(
        getLayout({
          title: chart.title || "Profits for each agent and period",
          xs:'period',
          ys:'profit',
          sim
        }),
        chart.layout || {}
      );
      return [traces, layout];
    };
  }
};

export function build(arrayOfVisuals) {
  return arrayOfVisuals.map(function (spec) {
    try {
      return new VisualizationFactory(spec);
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
      return undefined;
    }
  });
}
