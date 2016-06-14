/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* jshint browserify:true,jquery:true,esnext:true,eqeqeq:true,undef:true,lastsemic:true,strict:true,unused:true */

const d3A = require('d3-array');
const transpluck = require('transpluck');

module.exports = {};

function yaxisRange(sim){ 
    "use strict";
    return {
	yaxis: {
	    range: [(sim.config.L || 0), (sim.config.H || 200)]
	}
    };  
}

module.exports.yaxisRange = yaxisRange;

function supplyDemand(){
    "use strict";
    return function(sim){
	var i,l;
	var xboth=[];
	var buyerValues = sim.config.buyerValues.slice().sort(function(a,b){ return +b-a;});
	var sellerCosts = sim.config.sellerCosts.slice().sort(function(a,b){ return +a-b;});
	for(i=0,l=Math.max(buyerValues.length,sellerCosts.length);i<l;++i){
	    xboth[i]=1+i;
	}
	var demand = {
	    name: 'unit value',
	    x: xboth.slice(0,buyerValues.length),
	    y: buyerValues,
	    mode: 'lines+markers',
	    type: 'scatter'
	};
	var supply = {
	    name: 'unit cost',
	    x: xboth.slice(0,sellerCosts.length),
	    y: sellerCosts,
	    mode: 'lines+markers',
	    type: 'scatter'
	};
	var layout = Object.assign({}, yaxisRange(sim), { xaxis: { range: [0, xboth.length] } } );
	var plotlyData = [demand, supply];
	return [plotlyData, layout];	
    };
}

module.exports.supplyDemand = supplyDemand;

function plotFactory(chart){
    "use strict";
    /* chart properties are title, log, names, xs, ys, modes, layout */
    return function(sim) {
	var series = transpluck(sim.logs[chart.log].data, { pluck: [].concat(chart.xs,chart.ys) });
	var traces = chart.names.map(function(name,i){
	    return {
		name: name,
		x: series[chart.xs[i%chart.xs.length]],
		y: series[chart.ys[i%chart.ys.length]],
		type: 'scatter',
		mode: chart.modes[i%chart.modes.length]
	    };
	});
	var layout = Object.assign({}, {title: chart.title}, yaxisRange(sim), chart.layout);
	return [traces, layout];
    };
}

module.exports.plotFactory = plotFactory;

function histogramFactory(chart){
    "use strict";
    /* req chart properties are title, names, logs, vars */ 
    /* opt chart properties are bins, range */
    return function(sim){ 
	var traces = chart.names.map(function(name,i){
	    var mylog = chart.logs[i%chart.logs.length];
	    var myvar = chart.vars[i%chart.vars.length];
	    return {
		name: name,
		x: transpluck(sim.logs[mylog].data, {pluck: [myvar]})[myvar],
		type: 'histogram',
		opacity:  0.60,
		nbinsx: 100
	    };
	});
	var myrange, mybins;
	var mymin,mymax; 
	if (chart.range){ 
	    myrange = chart.range;
	} else {
	    mymin = d3A.min(traces, function(trace){ 
		return d3A.min(trace.x);
	    });
	    mymax = d3A.max(traces, function(trace){
		return d3A.max(trace.x);
	    });
	    myrange = [mymin, mymax];
	}
	if (chart.bins) { 
	    mybins = chart.bins;
	} else {
	    mybins = Math.max(0, Math.min(200, Math.floor(1+mymax-mymin)));
	}
	if (mybins && mybins!==100)
	    traces.forEach(function(trace){ trace.nbinsx = mybins; });
	var layout ={
	    barmode: 'overlay',
	    xaxis: {
		range: myrange
	    },
	    title: chart.title
	};
	return [traces, layout];
    };
}

module.exports.histogramFactory = histogramFactory;

function histogram2DFactory(chart){
    "use strict";
    /* req chart properties are title, names, logs, vars */
    ['names','logs','vars'].forEach(function(prop){ 
	if (!Array.isArray(chart[prop]))
	    throw new Error("histogram2DFactory: Expected array for chart."+prop+" got: "+typeof(chart[prop]));
	if ((chart[prop].length===0) || (chart[prop].length>2))
	    throw new Error("histogram2DFactory: Expected "+prop+" to be array of length 1 or 2, got: "+chart[prop].length);
    });

    return function(sim){
	var series = chart.names.map(function(name,i){
	    var mylog = chart.logs[i%chart.logs.length];
	    var myvar = chart.vars[i%chart.vars.length];
	    return transpluck(sim.logs[mylog].data, 
			      {pluck: [myvar]})[myvar];
	});

	var points = Object.assign(
	    {},
	    {
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
	

	var density = Object.assign(
	    {},
	    {
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
	
	var upper = Object.assign(
	    {},
	    {
		x: series[0],
		name: chart.names[0],
		marker: { color: points.marker.color},
		yaxis: 'y2',
		type: 'histogram'
	    },
	    chart.upper
	);
	
	var right = Object.assign(
	    {},
	    {
		y: series[1],
		name: chart.names[1],
		marker: { color: points.marker.color},
		xaxis: 'x2',
		type: 'histogram'
	    },
	    chart.right
	);
	
	var axiscommon = Object.assign(
	    {},
	    {
		showgrid: false,
		zeroline: false
	    },
	    chart.axiscommon
	);

	var layout = Object.assign(
	    {},
	    {
		title: chart.title,
		showlegend: false,
		margin: {t: 50},
		hovermode: 'closest',
		bargap: 0,
		xaxis: Object.assign(
		    {},
		    axiscommon,
		    { domain: [0,0.8] }
		),
		yaxis: Object.assign(
		    {},
		    axiscommon,
		    { domain: [0,0.8] }
		),
		xaxis2: Object.assign(
		    {},
		    axiscommon,
		    { domain: [0.8,1] }
		),
		yaxis2: Object.assign(
		    {},
		    axiscommon,
		    { domain: [0.8,1] }
		)
	    },
	    chart.layout
	);

	return [[points, density, upper, right], layout];

    };
}

module.exports.histogram2DFactory = histogram2DFactory;

/* private method */
function prepOHLC(sim){
    "use strict";
    var series = transpluck(sim.logs.ohlc.data,['period','open','high','low','close']);
    var data = [
	{
	    name: 'open',
	    x: series.period,
	    y: series.open,
	    type: 'scatter',
	    mode: 'markers'
	},
	{
	    name: 'high',
	    x: series.period,
	    y: series.high,
	    type: 'scatter',
	    mode: 'markers'
	},
	{
	    name: 'low',
	    x: series.period,
	    y: series.low,
	    type: 'scatter',
	    mode: 'markers'
	},
	{
	    name: 'close',
	    x: series.period,
	    y: series.close,
	    type: 'scatter',
	    mode: 'lines+markers'
	}];

    return data;
}

function plotOHLCTimeSeries(){
    "use strict";
    return function(sim){
	var layout = yaxisRange(sim);	
	var data = prepOHLC(sim);
	return [data, layout];
    };
}

module.exports.plotOHLCTimeSeries = plotOHLCTimeSeries;

function build(arrayOfVisuals){
    "use strict";
    return arrayOfVisuals.map(function(visual){
	return module.exports[visual.f](visual);
    });
}

module.exports.build = build;
