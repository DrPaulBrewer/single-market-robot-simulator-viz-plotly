/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

import * as d3A from 'd3-array';
import transpluck from 'transpluck';
import stepify from 'stepify-plotly';

export function yaxisRange(sim){ 
    return {
        yaxis: {
            range: [(sim.config.L || 0), (sim.config.H || 200)]
        }
    };  
}

/* this exports all the functions below, and also assigns them to the helpers object.
 * Depending on the version of the babel compiler, sometimes it exports the helpers object because exports are static and not dynamically computed in es6 ... which might be counterintuitive.
 */

export function plotFactory(chart){
    
    /* chart properties are title, log or logs, names, xs, ys, modes, layout */

    return function(sim) {
        let series = null;
        if (chart.log)
            series = transpluck(sim.logs[chart.log].data, {pluck: [].concat(chart.xs,chart.ys)});
        const traces = chart.names.map(function(name,i){
            const xvar = chart.xs[i%chart.xs.length];
            const yvar = chart.ys[i%chart.ys.length];
            const mode = chart.modes[i%chart.modes.length];
            const type = 'scatter';
            if (chart.logs)
                series = transpluck(sim.logs[chart.logs[i%chart.logs.length]].data, { pluck: [xvar,yvar] });
            const x = series[xvar];
            const y = series[yvar];         
            return { name, mode, type, x, y };
        });
        let layout = Object.assign({}, {title: chart.title}, yaxisRange(sim), chart.layout);
        return [traces, layout];
    };
}

export const helpers = {

    supplyDemand(){
        return function(sim){
            let i,l;
            let xboth=[];
            let buyerValues = sim.config.buyerValues.slice().sort(function(a,b){ return +b-a;});
            let sellerCosts = sim.config.sellerCosts.slice().sort(function(a,b){ return +a-b;});
            for(i=0,l=Math.max(buyerValues.length,sellerCosts.length);i<l;++i){
                xboth[i]=i;
            }
            let demand = {
                name: 'unit value',
                x: xboth.slice(0,buyerValues.length),
                y: buyerValues,
                mode: 'lines+markers',
                type: 'scatter',
                steps: true
            };
            let supply = {
                name: 'unit cost',
                x: xboth.slice(0,sellerCosts.length),
                y: sellerCosts,
                mode: 'lines+markers',
                type: 'scatter',
                steps: true
            };
            let layout = Object.assign({}, yaxisRange(sim), { xaxis: { range: [0, xboth.length] } } );
            let plotlyData = [demand, supply].map(stepify);
            return [plotlyData, layout];        
        };
    },

    plotFactory,

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
        return plotFactory({
            title: 'Open,High,Low,Close Trade prices for each period',
            log: 'ohlc',
            names: ['open','high','low','close'],
            xs: ['period'],
            ys: ['open','high','low','close'],
            modes: ['markers','markers','markers','lines+markers']
        });
    },

    plotBidAskTradeTimeSeries(){
        return plotFactory({
            title: 'Bid,Ask,Trade time series',
            names: ['bids','asks','trades'],
            logs: ['buyorder','sellorder','trade'],
            modes: ['markers','markers','lines+markers'],
            xs: ['t'],
            ys: ['buyLimitPrice','sellLimitPrice','price']
        });
    },

    plotProfitTimeSeries(chart){
        return function(sim) {
            const numberOfPeriods = sim.logs.profit.data.length;
            const periods = [];
            for(let i=1,l=numberOfPeriods;i<=l;++i)
                periods.push(i);
            const profitHeader = [];
            for(let i=1,l=sim.numberOfBuyers;i<=l;++i)
                profitHeader.push('Buyer'+i);
            for(let i=1,l=sim.numberOfSellers;i<=l;++i)
                profitHeader.push('Seller'+i);
            const profitsByAgent = transpluck(sim.logs.profit.data, profitHeader);
            const traces = [];
            for(let i=0,l=sim.numberOfAgents;i<l;++i)
                traces.push(
                    {
                        x: periods,
                        y: profitsByAgent[profitHeader[i]],
                        name: profitHeader[i],
                        mode: 'markers',
                        marker: {
                            symbol: ((i<sim.numberOfBuyers)? "circle": "square")
                        },
                        type: 'scatter'
                    }
                );
            const layout = Object.assign({}, {title: "Profits for each agent and period"}, yaxisRange(sim), chart.layout);
            return [traces, layout];
        };
    }   
};

export function build(arrayOfVisuals, myLibrary=helpers){
    return arrayOfVisuals.map(function(visual){
        try {
            let f =  myLibrary[visual.f](visual);
            if (typeof(f)!=="function")
                throw new Error("visualization function named "+visual.f+" does not exist");
            f.meta = visual;
            return f;
        } catch(e){
            console.log(e); // eslint-disable-line no-console
            return undefined;
        }
    }).filter(function(visualFunction){ return typeof(visualFunction)==="function"; });
}


