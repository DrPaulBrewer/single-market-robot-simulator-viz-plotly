/* global Plotly: true */
/* eslint consistent-this: ["error", "app", "that"] */
/* eslint no-console: "off" */
// noinspection JSUnusedGlobalSymbols,ExceptionCaughtLocallyJS

import {min,max} from 'd3-array';
import transpluck from 'transpluck';
import clone from 'clone';
import deepmerge from 'deepmerge';
import decamelize from 'decamelize';
import * as Random from 'random-js';
import * as stats from 'stats-lite';
import * as marketPricing from 'market-pricing';
import MaxMinDist from 'max-min-dist';

/**
 * A Simulation as defined in npm:single-market-robot-simulator
 *
 * @typedef {object} Simulation
 */

let defaultLayout = {};

const MT = Random.MersenneTwister19937.autoSeed();

/**
 * set default Plotly layout
 *
 * @param {object} layout A Plotly layout
 * @returns {void}
 */
export function setDefaultLayout(layout) {
  defaultLayout = clone(layout);
}

let sampleSize = +Infinity;

/**
 * set default Plot Sample Size
 *
 * @param {number} newsize sample size, 1 to +Infinity
 * @returns {number} sample size
 */
export function setSampleSize(newsize) {
  sampleSize = newsize;
  return sampleSize;
}

/**
 * get default Plot sample size
 *
 * @returns {number} sample size
 */
export function getSampleSize() {
  return sampleSize;
}

let logFilter = null;

/**
 * set filter for data logs
 *
 * @param {object} newFilter the filter
 * @returns {object} filter
 */
export function setFilter(newFilter){
  logFilter = newFilter;
  return logFilter;
}

/**
 * get filter for data logs
 *
 * @returns {object} filter
 */
export function getFilter(){
  return logFilter;
}

let screenWidth = 600;

/**
 * Set screen width
 * Example: setScreenWidth(+window.screen.availWidth || +window.screen.width)
 * This function exists to remove "window" dependencies from this module so that it could
 * run in a worker or other contexts lacking window.
 *
 * @param {number} w screen width in pixels
 * @returns {number} updated screen width
 */
export function setScreenWidth(w){
  screenWidth = +w;
  return screenWidth;
}

/**
 * Converts NaN to zero; preserves regular numbers
 *
 * @param {any} x An item to convert to a number or zero (if NaN)
 * @returns {number|number} x or 0
 */
function toNumberOrZero(x){
  const n = +x;
  return (Number.isNaN(n))? 0: n;
}

/**
 * Tests that a is an array, and every element is a finite number
 *
 * @param {any} a object to test
 * @returns {boolean} true if every element of a is a finite number
 */
function isContiguousFiniteNumberArray(a){
  if (!Array.isArray(a)) return false;
  let i,l=a.length;
  for(i=0;i<l;++i){
    const n = a[i];
    if (
      (typeof(n)!=='number') ||
      (!isFinite(n))
    )
      return false;
  }
  return true;
}

/**
 * Throws an error if a is not an array where every element is a finite number
 *
 * @param {any} a Object to be tested
 * @returns {void}
 * @throws {Error} if object is not a contiguous, finite, numeric array
 */
function assertContiguousFiniteNumberArray(a){
  if (!isContiguousFiniteNumberArray(a))
    throw new Error("requires contiguous, finite, numeric data array --- found gaps or bad data");
}

/**
 * Returns only primary on small screens
 *
 * @param {string} primary short, important message for small screens
 * @param {string} secondary additional description for larger screens
 * @returns {string} primary or primary+secondary
 */
function tickText(primary,secondary){
    if (screenWidth && (screenWidth<500)) return primary;
    return primary+'<br>'+secondary;
}

/**
 * array of n strings labeled s1,s2,...sn
 *
 * @param {string} s label, e.g. Buyer
 * @param {number} n count
 * @returns {string[]} array of strings s1,s2,...,sn
 */
function numberedStringArray(s,n){
  return (
    new Array(n)
    .fill(0)
    .map((z,j)=>(s+(+1+j)))
  );
}

/**
 * Returns a color for each agent in the simulation
 *
 * @param {Simulation} sim Simulation
 * @returns {string[]} array of color names
 */
function getAgentColors(sim){
  return sim.pool.agents.map((a)=>(a.color || 'darkviolet'));
}

/**
 * Returns a short identitying string for each agent, e.g. B1 ZI, B2 ZI,...
 *
 * @param {Simulation} sim Simulation
 * @returns {string[]} short identifying string for each agent
 */
function getAgentText(sim){
  const toBSID = [].concat(
    numberedStringArray('B',sim.config.numberOfBuyers),
    numberedStringArray('S',sim.config.numberOfSellers)
  );
  const toClass = sim.pool.agents.map((a)=>(a.constructor.name.replace('Agent','')));
  return toBSID.map((id,j)=>(id+' '+toClass[j]));
}

/**
 * Class to encapsulate data, layout, and config parameters of Plotly plots
 */

export class PlotlyDataLayoutConfig {

  /**
   * Class PlotlyDataLayoutConfig encapsulates the three primary Plotly plot structures data, layout, config
   * along with a boolean for isInteractive
   *
   * @param {object} options Chart options
   * @param {object[]} options.data Data for the chart
   * @param {object} options.layout Layout for the chart
   * @param {object} options.config  Config for the chart
   * @param {boolean} options.isInteractive true for interactive chart
   * @returns {PlotlyDataLayoutConfig} new PlotlyDataLayoutConfig
   */
  constructor(options) {
    this.data = options.data || [];
    this.layout = options.layout || {};
    this.config = options.config || {};
    this.setInteractivity(options.isInteractive);
  }

  /**
   * Set Plotly interactivity
   *
   * @param {boolean} isInteractive True for interactive chart
   * @returns {boolean} updated setting of isInteractive
   */
  setInteractivity(isInteractive = false) {
    const config = this.config;
    config.staticPlot = !isInteractive;
    config.displayModeBar = isInteractive;
    config.showEditInChartStudio = isInteractive;
    config.editable = isInteractive;
    return this;
  }

/**
 * Change Plotly plot title by prepending, appending, or replacing existing plot title
 *
 * @param {{prepend: ?string, append: ?string, replace: ?string}} adjustments adjustments to title
 * @returns {PlotlyDataLayoutConfig} PlotlyDataLayoutConfig object
 */
  adjustTitle(adjustments){
    const {prepend, append, replace} = adjustments;
    const layout = this.layout;
    if (!layout.title) layout.title = {};
    if (typeof(replace)==='string' && (replace.length > 0)){
      layout.title.text = replace;
    }
    if (layout?.title?.text) {
      if (typeof(prepend)==='string' && (prepend.length > 0))
        layout.title.text = prepend + '<br>' +layout.title.text;
      if (typeof(append)==='string' && (append.length > 0))
        layout.title.text += '<br>' + append;
    }
    return this;
  }
}

/**
 * Extracts values from sim.config for keys that start with the prefix.
 * Resulting object has keys which delete the start string and first char lowercased
 * and values from the original sim.config object.
 * NOTE: Structured values are by-reference, not cloned.
 *
 * @param {Simulation} sim Simulation
 * @param {string} prefix Prefix; e.g. 'Buyer', 'Seller'
 * @returns {object} extracted key/value configuration
 */
function extractNestedConfig(sim, prefix){
  const result = {};
  if (sim?.config){
    const titleKeys = Object.keys(sim.config).filter((k)=>(k.startsWith(prefix)));
    titleKeys.forEach((k)=>{
      const withoutStarter = k.slice(prefix.length);
      const newKey = withoutStarter[0].toLowerCase()+withoutStarter.slice(1);
      result[newKey] = sim.config[k];
    });
  }
  return result;
}

/**
 *
 * @param {PlotlyDataLayoutConfig} plot A PlotlyDataLayoutConfig
 * @param {string} div The id of a div (omit leading '#')
 * @returns {PlotlyDataLayoutConfig} plot the plotted plot
 */
export function displayPlotInDiv(plot, div){
  try {
    const lines = plot.layout.title.text.split('<br>');
    const charw = Math.floor(screenWidth/15); // 15 pixels per char is a guess
    const newlines = [];
    lines.forEach((line)=>{
      const words = line.split(' ');
      while(words.length>0){
        let lineLimit = charw;
        let reformattedLine = '';
        do {
          const word = words.shift();
          reformattedLine += word+' ';
          lineLimit -= word.length+1;
        } while(words.length>0 && (lineLimit>=words[0].length));
        newlines.push(reformattedLine);
      }
    });
    plot.layout.title.text = newlines.join('<br>');
  } catch(e){ console.log(e);}

  // Plotly.react restyles the existing div; Plotly.newPlot overwrites completely
  // 2020-Jun-05 PJB This code previously used Plot.react(div, plot.data, plot.layout, plot.config);
  // see https://plotly.com/javascript/plotlyjs-function-reference/

  // choose only ONE
  Plotly.newPlot(div, plot.data, plot.layout, plot.config);

  // Plotly.react(div,plot.data,plot.layout,plot.config);

  return this;
}

/**
 * Factory class that can build visualizations from a specification and data
 */
export class VisualizationFactory  {

  /**
   * Create a VisualizationFactory
   *
   * @param {object} chart Specifications (see individual helperers for specific chart object)
   * @param {string} chart.f function name within helpers
   */
  constructor(chart){
    // Legacy compatibility
    this.meta = chart;
    this.loader = helpers[chart.f](chart); // eslint-disable-line no-use-before-define
    // Plotly default settings
    // this.data not initialized here
    this.layout = {};
    this.config = {
      responsive: true,
      displaylogo: false,
      plotlyServerURL: "https://chart-studio.plotly.com"
    };
  }

  /**
   * @param {object} options options
   * @param {Simulation[]|Simulation} options.from Data Input: A Simulation or an Array of Simulations
   * @param {string} options.to Chart Destination: A div name
   * @param {object} options.title title modifiers replace,append,preprend
   * @param {boolean} options.isInteractive True for interactive chart
   * @param {any} options.axis Helper specific
   * @returns {PlotlyDataLayoutConfig|PlotlyDataLayoutConfig[]} Populated/plotted visualization
   */
  load(options){
    const { from, to, title, isInteractive, axis } = options;
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
    const [data,_layout,_config] = this.loader(from, axis);
    const layout = deepmerge(this.layout,_layout || {});
    const config = deepmerge(this.config,_config || {});
    const v =  new PlotlyDataLayoutConfig({ data, layout, config});
    v.setInteractivity(isInteractive);
    if (title){
      v.adjustTitle(title);
    } else if (from?.config){
      const simTitleModifier = extractNestedConfig(from, 'title');
      v.adjustTitle(simTitleModifier);
    }
    if (to) return displayPlotInDiv(v, to);
    return v;
  }
}


/**
 * return a sample of data, preserving header row
 *
 * @param {any[]} data the full data array
 * @returns {any[]} the sampled data array
 */
function sample(data) {
  if ((data.length - 1) <= sampleSize)
    return data;
  const sampledData = Random.sample(MT, data.slice(1), sampleSize);
  sampledData.unshift(data[0].slice());
  return sampledData;
}

/**
 * Filters and randomly samples data from log's data
 *
 * @param {object} log A simulation log as defined in npm:single-market-robot-simulator
 * @returns {any[]} resulting data array
 */
function extract(log){
  if (logFilter === null)
    return sample(log.data);
  const { prop, fromValue, toValue } = logFilter;
  const data = (prop)? (log.selectAscending(prop,fromValue,toValue)): (log.data);
  return sample(data);
}

/**
 * Tests whether some string in vars contains a keyword from keywords
 *
 * @param {string|string[]} vars A string or array to test
 * @param {string[]} keyWords An array of keywords to find
 * @returns {boolean} result true if vars contains, as a substring, some keyword
 */
function hasAnyKeyword(vars, keyWords){
  if (Array.isArray(vars))
    return vars.some((v)=>(hasAnyKeyword(v,keyWords)));
  return (
    (typeof(vars)==='string') &&
    (keyWords.some((k)=>(vars.toLowerCase().includes(k.toLowerCase()))))
  );
}

/**
 * True if the var or vars contains a prive keyword
 *
 * @param {string|string[]} vars A string or array of strings to search
 * @returns {boolean} true if vars contains price, value or cost
 */
function hasPriceVars(vars){
  const keyWords = ['price','value','cost'];
  return hasAnyKeyword(vars,keyWords);
}

/**
 * Plotly title property for variable(s) in vs
 *
 * @param {string[]|string} vs chart variables
 * @returns {{title:string}} Plotly title property
 */
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

/**
 * Suggested Plotly axis range for chart variables
 *
 * @param {string|string[]} vs chart variables
 * @param {Simulation} sim Simulation
 * @returns {{range:number[]}} Plotly range configuration
 */
function axisRange(vs, sim){
    if (hasPriceVars(vs)){
      const h = sim?.config?.H;
      return (h && {range: [0,+h]});
    }
    if (hasAnyKeyword(vs,['efficiency'])){
      return {range: [0,100]};
    }
    if (hasAnyKeyword(vs,['gini'])){
      return {range: [0,1]};
    }
}

/**
 * Annotation for Simulation
 *
 * @param {Simulation} sim Simulation
 * @param {number|string|undefined} sim.caseid The case id, if any, of a simulation within a study
 * @param {number|string|undefined} sim.tag The tag, if any, of a simulation
 * @returns {string} html annotation with initial line break
 */
function annotation(sim){
  const {caseid, tag} = sim;
  const a1 = (caseid===undefined)? '': (`case:${caseid} `);
  const a2 = (tag===undefined)? '': tag;
  return (a1 || a2)? ('<br>'+a1+a2) : '';
}

/**
 * Create the Plotly layout for a chart
 *
 * @param {object} options options
 * @param {string|string[]} options.xs x-variable(s)
 * @param {string|string[]} options.ys y-variable(s)
 * @param {string} options.title title
 * @param {Simulation} options.sim simulation
 * @param {Simulation[]} options.sims array of simulations
 * @param {number[]} options.xrange [xlow,xhigh] x-range
 * @param {number[]} options.yrange [ylow,yhigh] y-range
 * @param {{key:string}} options.axis axis option
 * @returns {object} Plotly layout
 */
function getLayout(options){
  const {xs,ys,title,sim,sims,xrange,yrange,axis} = options;
  const items = [defaultLayout];

  /**
   * Helper to push xaxis objects to items
   *
   * @param {object} obj xaxis object
   * @returns {void}
   */
  function xaxis(obj){ if (obj) items.push({xaxis: obj}); }

  /**
   * Helper to push yaxis objects to items
   *
   * @param {object} obj yaxis object
   * @returns {void}
   */
  function yaxis(obj){ if (obj) items.push({yaxis: obj}); }
  const {caseid, tag} = sim.config;
  items.push({ title: { text: (title || '')+annotation({caseid,tag}) } });
  if (axis){
    xaxis(axisTitle(axis.key));
  } else if (Array.isArray(sims)) {
    if (sims && sims[0] && sims[0].config.tag){
      xaxis({title: 'tag'});
    } else {
      xaxis({title: 'case id'});
    }
  } else if (xs){
    xaxis(axisTitle(xs));
    xaxis(xrange? ({range: xrange}) : (axisRange(xs,sim)));
  }
  if (ys){
    yaxis(axisTitle(ys));
    yaxis(yrange? ({range: yrange}) : (axisRange(ys,sim)));
  }
  return deepmerge.all(items);
}

/**
 * Creates a function(Simulation)->[traces,layout] for Plotly charts
 *
 * @param {object} chart chart
 * @param {string} chart.title title
 * @param {string} chart.log log
 * @param {string[]} chart.logs logs
 * @param {string[]} chart.names names
 * @param {string[]} chart.xs x-variables
 * @param {string[]} chart.ys y-variables
 * @param {string[]} chart.modes Plotly trace mode
 * @param {string[]} chart.symbols Plotly marker symbols
 * @param {string[]} chart.agentcolors colors for each agent
 * @returns {Function} function from Simulation to [traces,layout]
 */
export function plotFactory(chart) {

  /* chart properties are title, log or logs, names, xs, ys, modes, symbols, agentcolors */

  return function (sim) {
    let series=null, agentColorArray=null, agentTextArray=null;
    if (Array.isArray(chart.agentcolors)){
      agentColorArray = getAgentColors(sim);
      agentTextArray = getAgentText(sim);
    }
    if (chart.log)
      series = transpluck(extract(sim.logs[chart.log]), { pluck: [].concat(chart.xs, chart.ys) });
    const traces = chart.names.map(function (name, i) {
      const type = 'scatter';
      const mode = chart.modes[i % chart.modes.length];
      let x = [], y=[], marker = { size: 10 }, color, text;
      try {
        const xvar = chart.xs[i % chart.xs.length];
        const yvar = chart.ys[i % chart.ys.length];
        const agentcolorvar = Array.isArray(chart.agentcolors) && (chart.agentcolors[i % chart.agentcolors.length]);
        marker.symbol = (Array.isArray(chart.symbols) && chart.symbols[i]) || "circle";
        const logName = Array.isArray(chart.logs) && (chart.logs[i % chart.logs.length]);
        if (logName){
          const pluckvars = [xvar,yvar,agentcolorvar].filter((v)=>(v));
          series = transpluck(extract(sim.logs[logName]), { pluck: pluckvars });
        }
        x = series[xvar];
        y = series[yvar];
        // agent ids begin with 1 in single-market-robot-simulator but agent with id 1 is at sim.pool.agents[0]
        if (agentcolorvar && Array.isArray(series[agentcolorvar])) {
          color = series[agentcolorvar].map((id)=>(agentColorArray[id-1]));
          text  = series[agentcolorvar].map((id)=>(agentTextArray[id-1]));
          marker.color = color;
          marker.text = text;
        }
        if (typeof(x[0])==='number')
          assertContiguousFiniteNumberArray(x);
        if (typeof(y[0])==='number')
          assertContiguousFiniteNumberArray(y);
        if (x.length!==y.length)
          throw new Error("plotFactory: x and y series are of unequal length");
      } catch(e){
        console.log("plotFactory: error, no data for "+name+" chart "+i);
        console.log(e);
        x = [];
        y = [];
      }
      const trace = { name, mode, type, x, y, marker};
      if (text){
        trace.hovertext = text;
        trace.hoverinfo ='text+name+y+x';
      }
      return trace;
    });
    const layout = getLayout({xs: chart.xs,ys: chart.ys, title: chart.title, sim});
    return [traces, layout];
  };
}

/**
 * Run Competitive Equilibrium Supply/Demand Model
 * append .summary property giving text summary of model prediction
 *
 * @param {object} scenario economic scenario consisting of {demand,suppy} arrays
 * @param {number[]} scenario.demand demand (WTP) values sorted from high to low
 * @param {number[]} scenario.supply supply (WTA) costs sorted from low to high
 * @returns {object} {p,q,summary}
 */
export function competitiveEquilibriumModel(scenario){
  const {demand,supply} = scenario;
  const ceModel = marketPricing.crossSingleUnitDemandAndSupply(demand,supply);
  ceModel.summary = (ceModel && ceModel.p && ceModel.q)? ('CE: '+JSON.stringify(ceModel)): '';
  return ceModel;
}


/**
 * finds a sensible name for this simulation in a study-level chart
 *
 * @param {Simulation} sim simulation
 * @param {{values:any[]}} axis an object with a values array
 * @param {number} j The simulation's index in a study array
 * @returns {string} suggested name
 */
function simName(sim,axis,j){
  return '' + (
      (Array.isArray(axis?.values) && axis.values[j]) ||
      sim.config.tag ||
      sim.config.caseid ||
      j
  );
}

/* this exports all the functions below, and also assigns them to the helpers object.
 * Depending on the version of the babel compiler, sometimes it exports the helpers object because exports are static and not dynamically computed in es6 ... which might be counterintuitive.
 */


export const helpers = {

  /**
   * Helper for supply/demand chart
   *
   * @returns {Function} function from Simulation to [data,layout]
   */
  supplyDemand() {
    return function (sim) {
      const demandValues = sim.config.buyerValues.slice().sort(function (a, b) { return +b - a; });
      const supplyCosts = sim.config.sellerCosts.slice().sort(function (a, b) { return +a - b; });
      if (demandValues[demandValues.length-1]>0){
        demandValues.push(0);
      }
      const H = Math.max(+sim.config.H,demandValues[0],supplyCosts[supplyCosts.length-1]);
      if (supplyCosts[supplyCosts.length-1]<=H){
        supplyCosts.push(H+1);
      }
      const ceModel = competitiveEquilibriumModel({
        demand: demandValues,
        supply: supplyCosts
      });
      const maxlen = Math.max(demandValues.length, supplyCosts.length);
      const minlen = Math.min(demandValues.length, supplyCosts.length);
      const steps = (maxlen<=30);
      const mode = steps? 'lines+markers' : 'markers';
      const type = 'scatter';
      const cutoff = Math.min(minlen+10,maxlen);
      const idxStep = Math.max(1,Math.ceil(minlen/50));
      const xD=[0],yD=[H+1],xS=[0],yS=[0];

      /**
       * Internal function to include points into supply/demand chart
       *
       * @param {number} i unit to include
       * @returns {void}
       */
      function include(i){
        if (i<0) return;
        if(i<demandValues.length){
          const dVal = demandValues[i];
          if (steps) {
            const prev = yD[yD.length-1];
            if (dVal!==prev){
              xD.push(i);
              yD.push(dVal);
            }
          }
          xD.push(i+1);
          yD.push(dVal);
        }
        if(i<supplyCosts.length){
          const sCost = supplyCosts[i];
          if (steps){
            const prev = yS[yS.length-1];
            if (sCost!==prev){
              xS.push(i);
              yS.push(sCost);
            }
          }
          xS.push(i+1);
          yS.push(sCost);
        }
      } // end internal function include

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
      include(q0-1);
      for(let i=q0,l=q1-1;i<l;i+=idxStep)
        include(i);
      include(q1-1);
      if (cutoff>q1)
        for (let i=q1,l=cutoff;i<l;i+=Math.min(cutoff-q1,idxStep))
          include(i);

      let demand = {
        name: 'demand',
        x: xD,
        y: yD,
        mode,
        type
      };
      let supply = {
        name: 'supply',
        x: xS,
        y: yS,
        mode,
        type
      };
      let layout = deepmerge.all([
        defaultLayout,
        { yaxis:{
            range: [0, H],
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
            text: " S/D Model <br>Case "+sim.config.caseid+"<br><sub>"+ceModel.summary+"</sub>"
          }
        }
      ]);
      let plotlyData = [demand, supply];
      return [plotlyData, layout];
    };
  },

  plotFactory,

  /**
   * Helper for Box Plots
   *
   * @param {object} chart chart options
   * @param {string} chart.log name of a simulation log
   * @param {string} chart.y a y-variable name from the log header
   * @param {string} chart.input must be set to 'study'
   * @returns {Function} function from (sims, axis) to Plotly [data,layout]
   */
  boxplotFactory(chart) {
    // requires log, y, input='study'
    return function (sims, axis) {
      if (!Array.isArray(sims))
        throw new Error("boxplot requires an array of multiple simulations");
      const data = sims.map((sim, j) => {
        let y = [];
        try {
          y = transpluck(extract(sim.logs[chart.log]), { pluck: [chart.y] })[chart.y];
          assertContiguousFiniteNumberArray(y);
        } catch(e){
          y = [];
          console.log("boxplotFactory: error, no data for simulation "+j);
          console.log(e);
        }
        const name = simName(sim,axis,j);
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
        sims,
        axis
      });
      return [data, layout];
    };
  },

  /**
   * Helper for Violin Plots
   *
   * @param {object} chart chart options
   * @param {string} chart.log name of a simulation log
   * @param {string} chart.y a y-variable name from the log header
   * @param {string} chart.input must be set to 'study'
   * @returns {Function} function from (sims, axis) to Plotly [data,layout]
   */
  violinFactory(chart) {
    // requires log, y, input='study'
    return function (sims, axis) {
      if (!Array.isArray(sims))
        throw new Error("violin requires an array of multiple simulations");
      const data = sims.map((sim, j) => {
        let y = [];
        try {
          y = transpluck(extract(sim.logs[chart.log]), { pluck: [chart.y] })[chart.y];
          assertContiguousFiniteNumberArray(y);
        } catch(e){
          y = [];
          console.log("violinFactory: error, no data for simulation "+j);
          console.log(e);
        }
        const name = simName(sim,axis,j);
        return {
          y,
          name,
          type: 'violin',
          meanline: {
            visible: true
          },
          showlegend: false,
          spanmode: "hard"
        };
      });
      const layout = getLayout({
        title: chart.title,
        ys: [chart.y],
        sims,
        axis
      });
      return [data, layout];
    };
  },

  /**
   * Helper for Scatter Plots
   *
   * @param {object} chart chart options
   * @param {string} chart.log name of a simulation log
   * @param {string} chart.y a y-variable name from the log header
   * @param {string} chart.input must be set to 'study'
   * @returns {Function} function from (sims, axis) to Plotly [data,layout]
   */
  scatterFactory(chart) {
    // requires log, y, input='study'

    return function (sims, axis) {
      if (!Array.isArray(sims))
        throw new Error("scatter requires an array of multiple simulations");
      let yMean=[],yStdev=[],x=[];
      sims.forEach((sim,j)=>{
        try {
          const rawData = transpluck(
            extract(sim.logs[chart.log]),
            {pluck: [chart.y]}
          )[chart.y];
          if (rawData.length<=1)
            throw new Error(`rawData has length ${rawData.length}`);
          assertContiguousFiniteNumberArray(rawData);
          yMean[j] = stats.mean(rawData);
          // this is the standard error of the data
          // it is NOT the standard error of the mean
          // it may not be possible to calculate a standard error of the mean for autocorrelated trade data
          yStdev[j] = stats.sampleStdev(rawData);
          x[j] = simName(sim,axis,j);
        } catch(e){
          delete yMean[j];
          delete yStdev[j];
          x[j] = simName(sim,axis,j);
          console.log("scatterFactory: error, no data for simulation "+j);
          console.log(e);
        }
      });
      // see https://plotly.com/javascript/error-bars/
      const data = [
        {
          x,
          y: yMean,
          error_y: {  // eslint-disable-line camelcase
            type: 'data',
            array: yStdev,
            visible: true
          }
        }
      ];
      const layout = getLayout({
        title: chart.title,
        ys: [chart.y],
        sims,
        axis
      });
      return [data, layout];
    };
  },

  /**
   * Helper for Histograms
   *
   * @param {object} chart chart options
   * @param {string} chart.title title
   * @param {string[]} chart.names histogram names
   * @param {string[]} chart.logs data source logs
   * @param {string[]} chart.vars variables to use
   * @param {number} chart.bins positive integer number of bins
   * @param {number[]} chart.range range for plotting [xlow,xhigh]
   * @returns {Function} function from Simulation to Plotly [traces,layout]
   */
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
          assertContiguousFiniteNumberArray(x);
        } catch(e){
          x = [];
          console.log("histogramFactory: error, no data for "+name+" chart "+i);
          console.log(e);
        }
        return {
          name,
          x,
          type: 'histogram',
          opacity: 0.40
        };
      });
      const layout = Object.assign(
        {},
        getLayout({sim, xrange: chart.range, xs: chart.vars, ys: 'N', title: chart.title}),
        {barmode: 'overlay'}
      );
      let mymin, mymax;
      if (layout?.xaxis?.range){
          [mymin, mymax] = layout.xaxis.range;
      }
      if ((mymin===undefined) || (mymax===undefined)){
        // npm:d3A.min and d3A.max are called below as min and max
        mymin = Math.floor(
          min(traces, function (trace) {
            return min(trace.x);
          })
        );
        mymax = Math.ceil(
          max(traces, function (trace) {
            return max(trace.x);
          })
        );
        if (mymax!==1) mymax += 1; // hack to include right limit in integer-valued x data
        layout.xaxis.range = [mymin,mymax];
      }
      let binsize = 1;
      if (chart.bins){
        binsize = (mymax-mymin)/chart.bins;
      } else {
        while(Math.ceil((mymax-mymin)/binsize)>(screenWidth/3)){
          binsize += 1;
        }
      }
      traces.forEach(function (trace) {
        trace.xbins = {
          start: mymin,
          end: mymax,
          size: binsize
        };
      });
      return [traces, layout];
    };
  },


/**
 * histogram2DFactory - create 2D Plotly histogram
 *
 * @param {object} chart options
 * @param {string} chart.title title
 * @param {string} chart.log log for data source
 * @param {string[]} chart.names a 2-element array of names for x and y axis
 * @param {string[]} chart.vars a 2-eleemnt array of log vars for x and y axis
 * @returns {Function} function from Simulation to Plotly [traces,layout]
 */
histogram2DFactory(chart) {

    /* req chart properties are title, log, names[2], vars[2] */

    ['names', 'vars'].forEach(function (prop) {
      if (!Array.isArray(chart[prop]))
        throw new Error("histogram2DFactory: Expected array for chart." + prop + " got: " + typeof(chart[prop]));
      if (chart[prop].length !== 2)
        throw new Error("histogram2DFactory: Expected " + prop + " to be array of length 2, got: " + chart[prop].length);
    });

    return function (sim) {
      const [xvar,yvar] = chart.vars;
      const data = transpluck(
        extract(sim.logs[chart.log]),
        {pluck: chart.vars}
      );
      const x = data[xvar];
      const y = data[yvar];
      assertContiguousFiniteNumberArray(x);
      assertContiguousFiniteNumberArray(y);

      let points = Object.assign({}, {
          x,
          y,
          mode: 'markers',
          name: 'points',
          marker: {
            color: 'rgb(102,0,0)',
            size: 4,
            opacity: 0.5
          }
        },
        chart.points
      );


      let density = Object.assign({}, {
          x,
          y,
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
          x,
          name: chart.names[0],
          marker: { color: points.marker.color },
          yaxis: 'y2',
          type: 'histogram'
        },
        chart.upper
      );

      let right = Object.assign({}, {
          y,
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
        getLayout({
          title: chart.title,
          xs: chart.vars[0],
          ys: chart.vars[1],
          sim
        }),
        {
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
            axiscommon, { title: 'n', domain: [0.8, 1] }
          ),
          yaxis2: Object.assign({},
            axiscommon, { title: 'n', domain: [0.8, 1] }
          )
        },
        chart.layout || {}
      ]);

      return [
        [points, density, upper, right], layout
      ];

    };
  },

  /**
   * Create Profit Distribution Violin Chart
   *
   * @param {object} chart options
   * @param {string} chart.title title
   * @returns {Function} function from Simulation to Plotly [traces,layout]
   */
  plotProfitDistributionViolin(chart){
    return function(sim){
        const extracted = extract(sim.logs.profit);
        const column = transpluck(extracted);
        const profitHeader = [].concat(
          numberedStringArray('B',sim.config.numberOfBuyers),
          numberedStringArray('S',sim.config.numberOfSellers)
        );
        const agentColors = getAgentColors(sim);
        const data = profitHeader.map((name,j)=>(
          {
            y: column['y'+(j+1)],
            name: tickText(name,sim.pool.agents[j].constructor.name.replace('Agent','').substring(0,5)),
            type: 'violin',
            meanline: {
              visible: true
            },
            line: {
              color: agentColors[j]
            },
            spanmode: "hard",
            showlegend: false
          }
        ));
        const layout = getLayout({
          title: chart.title,
          ys: 'Profit',
          sim
        });
        return [data,layout];
    };
  },

  /**
   * Create a Profit Time Series chart
   *
   * @param {object} chart options
   * @param {string} chart.title optional title
   * @param {object} chart.layout optional layout to merge-override autogenerated layout
   * @returns {Function} function from Simulation to Plotly [trace,layout]
   */
  plotProfitTimeSeries(chart) {
    return function (sim) {
      const extracted = extract(sim.logs.profit);
      const column = transpluck(extracted);
      const traces = [];
      const profitHeader = [].concat(
        numberedStringArray('B',sim.config.numberOfBuyers),
        numberedStringArray('S',sim.config.numberOfSellers)
      );
      for (let i = 0, l = sim.numberOfAgents;i<l;++i)
        traces.push({
          x: column.period,
          y: column['y'+(i+1)],
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
  },

  /**
   * Create a Smart Plot of Agent Profits comparing simulations
   *
   * @param {object} chart options
   * @param {string} chart.title title
   * @param {object} chart.layout optional layout
   * @param {number} chart.numberOfPlots optional number of agents to plot, default: 4
   * @returns {Function} function from Simulations, axis to Plotly [traces,layout]
   */
  smartPlotAgentProfits(chart){
    const numberOfPlots = +(chart.numberOfPlots) || 4;
    return function(sims, axis){
      if (!Array.isArray(sims))
        throw new Error("smartPlotAgentProfitsVsCaseId requires an array of multiple simulations");
      const cases = sims.map((sim, j)=>(simName(sim,axis,j)));
      // here we've assumed all simulations have the same number of buyers and sellers
      // ideally we should _verify_ first
      const { numberOfBuyers, numberOfSellers } = sims[0].config;
      const profitHeader = [].concat(
        numberedStringArray('B',numberOfBuyers),
        numberedStringArray('S',numberOfSellers)
      );
      // agents can have different roles in different sims
      // const agentColors = getAgentColors(sims[0]);
      //    name: tickText(name,sim.pool.agents[j].constructor.name.replace('Agent','').substr(0,5))
      const agentProfitVectors = profitHeader.map(
          (agentName,j)=>(
        // agent index is j
        sims
            .map((sim) => {
              const profitData = extract(sim.logs.profit);
              const col = profitData[0].indexOf('y' + (j + 1)); // y columns begin with y1
              if (col < 0) throw new Error("smartPlotAgentProfits: could not find column for profit data");
              const periods = profitData.length - 1; // -1 because header is not a period
              let sum = 0;
              profitData.forEach((row, k) => {
                if (k > 0) sum += toNumberOrZero(row[col]);
              });
              return sum / periods;
            })
        )
      );
      let agentIndexesForChart, chartNames;
      if (numberOfPlots >= agentProfitVectors.length){
        agentIndexesForChart = agentProfitVectors.map((v,j)=>(j));
        chartNames = agentIndexesForChart.map((id)=>(profitHeader[id]));
      } else {
        const chartOptimizer = new MaxMinDist({
          data: agentProfitVectors
        });
        agentIndexesForChart = chartOptimizer.bestGuess(numberOfPlots).result;
        const similar = chartOptimizer.group(agentIndexesForChart);
        chartNames = similar.map((g)=>{
          const agentNames = g.map((id)=>(profitHeader[id]));
          if (g.length===1) return agentNames[0];
          if (g.length<6) return agentNames[0]+'~~'+agentNames.slice(1).join(",");
          return agentNames[0]+'~~'+agentNames.slice(1,5).join(",")+`+${agentNames.length-5} more`;
        });
      }
      const traces = agentIndexesForChart.map(
        (agentIndex, k)=>(
          {
            x: cases,
            y: agentProfitVectors[agentIndex],
            name: chartNames[k],
            mode: 'lines+markers',
            marker: {
              symbol: ((agentIndex < numberOfBuyers) ? "circle" : "square")
            },
            type: 'scatter'
          }
        )
      );
      const layout = deepmerge(
        getLayout({
          title: chart.title || "Average Profit comparison",
          ys:'profit',
          axis
        }),
        chart.layout || {}
      );
      return [traces, layout];
    };
  }
};

/**
 * Convert an array of chart specifications to an array of Visualization Factory
 *
 * @param {object[]} arrayOfCharts An array of chart objects to transform
 * @returns {VisualizationFactory[]} The resulting Visualization Factories
 */
export function build(arrayOfCharts) {
  return arrayOfCharts.map(function (chart) {
    try {
      return new VisualizationFactory(chart);
    } catch (e) {
      console.log(e); // eslint-disable-line no-console
      return undefined;
    }
  });
}
