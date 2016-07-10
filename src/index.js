/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

import * as d3A from 'd3-array';
import transpluck from 'transpluck';

export function yaxisRange(sim){ 
    return {
        yaxis: {
            range: [(sim.config.L || 0), (sim.config.H || 200)]
        }
    };  
}

/* this exports all the functions below, and also assigns them to the helpers object.
 * It does not export the helpers object because exports are static and not dynamically computed ... which might be counterintuitive.
 */

export const helpers = {

    supplyDemand(){
        return function(sim){
            let i,l;
            let xboth=[];
            let buyerValues = sim.config.buyerValues.slice().sort(function(a,b){ return +b-a;});
            let sellerCosts = sim.config.sellerCosts.slice().sort(function(a,b){ return +a-b;});
            for(i=0,l=Math.max(buyerValues.length,sellerCosts.length);i<l;++i){
                xboth[i]=1+i;
            }
            let demand = {
                name: 'unit value',
                x: xboth.slice(0,buyerValues.length),
                y: buyerValues,
                mode: 'lines+markers',
                type: 'scatter'
            };
            let supply = {
                name: 'unit cost',
                x: xboth.slice(0,sellerCosts.length),
                y: sellerCosts,
                mode: 'lines+markers',
                type: 'scatter'
            };
            let layout = Object.assign({}, yaxisRange(sim), { xaxis: { range: [0, xboth.length] } } );
            let plotlyData = [demand, supply];
            return [plotlyData, layout];        
        };
    },


    plotFactory(chart){

        /* chart properties are title, logs, names, xs, ys, modes, layout */

        return function(sim) {
            let series = transpluck(sim.logs[chart.log].data, { pluck: [].concat(chart.xs,chart.ys) });
            let traces = chart.names.map(function(name,i){
                return {
                    name,
                    x: series[chart.xs[i%chart.xs.length]],
                    y: series[chart.ys[i%chart.ys.length]],
                    type: 'scatter',
                    mode: chart.modes[i%chart.modes.length]
                };
            });
            let layout = Object.assign({}, {title: chart.title}, yaxisRange(sim), chart.layout);
            return [traces, layout];
        };
    },


    histogramFactory(chart){

        /* req chart properties are title, names, logs, vars */ 
        /* opt chart properties are bins, range */

        return function(sim){ 
            let traces = chart.names.map(function(name,i){
                let mylog = chart.logs[i%chart.logs.length];
                let mylet = chart.vars[i%chart.vars.length];
                return {
                    name,
                    x: transpluck(sim.logs[mylog].data, {pluck: [mylet]})[mylet],
                    type: 'histogram',
                    opacity:  0.60,
                    nbinsx: 100
                };
            });
            let myrange, mybins;
            let mymin,mymax; 
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
            let layout ={
                barmode: 'overlay',
                xaxis: {
                    range: myrange
                },
                title: chart.title
            };
            return [traces, layout];
        };
    },


    histogram2DFactory(chart){

        /* req chart properties are title, names, logs, vars */

        ['names','logs','vars'].forEach(function(prop){ 
            if (!Array.isArray(chart[prop]))
                throw new Error("histogram2DFactory: Expected array for chart."+prop+" got: "+typeof(chart[prop]));
            if ((chart[prop].length===0) || (chart[prop].length>2))
                throw new Error("histogram2DFactory: Expected "+prop+" to be array of length 1 or 2, got: "+chart[prop].length);
        });

        return function(sim){
            let series = chart.names.map(function(name,i){
                let mylog = chart.logs[i%chart.logs.length];
                let mylet = chart.vars[i%chart.vars.length];
                return transpluck(sim.logs[mylog].data, 
                                  {pluck: [mylet]})[mylet];
            });

            let points = Object.assign(
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
            

            let density = Object.assign(
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
            
            let upper = Object.assign(
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
            
            let right = Object.assign(
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
            
            let axiscommon = Object.assign(
                {},
                {
                    showgrid: false,
                    zeroline: false
                },
                chart.axiscommon
            );

            let layout = Object.assign(
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
    },


    plotOHLCTimeSeries(){
        function prepOHLC(sim){
            let series = transpluck(sim.logs.ohlc.data,['period','open','high','low','close']);
            let data = [
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


        return function(sim){
            let layout = yaxisRange(sim);       
            let data = prepOHLC(sim);
            return [data, layout];
        };
    }
};

export function build(arrayOfVisuals, myLibrary=helpers){
    return arrayOfVisuals.map(function(visual){
        return myLibrary[visual.f](visual);
    });
}


