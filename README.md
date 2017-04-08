single-market-robot-simulator-viz-plotly
======

Middleware to generate plot traces for plotly from single-market-robot-simulator's simulation logs.

Used by robot-trading-webapp

## Installation

     npm i single-market-robot-simulator-viz-plotly -S

## Summary

This module helps create visualizations of `single-market-robot-simulator` simulation data with `plotly.js:^1.12.0` charting library.

A particular visualization typically extracts row data contained in one or more simulations logs in browser memory into traces and layouts required by plotly.

## Example 

     const Plotly = require('plotly.js');
     const SMRS   = require('single-market-robot-simulator');
     const Viz    = require('single-market-robot-simulator-viz-plotly');
     var sim      = SMRS.runSimulation(...);
     var supplyDemandChartMaker  = Viz.supplyDemand(); // returns function(sim)
     var supplyDemandChartParams = supplyDemandChartMaker(sim);  // returns array containing [traces,layout] for Plotly.newPlot
     supplyDemandChartParams.unshift('plotOutputDivId');  // insert1st parameter for Plotly.newPlot -- the div Id
     Plotly.newPlot.apply(Plotly, supplyDemandChartParams);  // call Plotly.newPlot using the array for parameters

## Helper Functions

### Simulation ETL for Layout

#### viz.yaxisRange({Simulation} sim)
##### returns: {Object} layoutTraits
Extracts yaxis range from simulation configuration limits in `sim.config.L` and `sim.config.H`

### Simulation ETL for Charts

#### viz.supplyDemand()
##### returns: Function {Simulation}(sim)->{Array} [PlotlyTraces, PlotlyLayout]
Returns data-transformation function creating two traces representing aggregate demand and supply parameters input to simulation.

#### viz.plotFactory({Object} chart) 
##### returns: Function {Simulation}(sim)->{Array} [PlotlyTraces, PlotlyLayout]
Returns data-transformation function for Plotly with title chart.title, creating a trace for each name in chart.names, using data from corresponding chart.logs, chart.xs, chart.ys, chart.modes

#### viz.histogramFactory({Object} chart)
##### returns: Function {Simulation}(sim)->{Array} [PlotlyTraces, PlotlyLayout]
Returns data-transformation function for Plotly with title chart.title, creating overlaid histograms for each name in chart.names, using data from corresponding chart.logs, chart.vars

Optional chart properties:  chart.range, a two element array `[min,max]`; chart.bins, number, the number of bins for all histograms in this chart 

#### viz.histogram2DFactory({Object} chart)
##### returns: Function {Simulation}(sim)->{Array} [PlotlyTraces, PlotlyLayout]
Returns data-transformation function for Plotly with title chart.title, creating 2D contour plot with side histograms for 2 variables defined via arrays chart.names, chart.logs, chart.vars

#### viz.plotOHLCTimeSeries()
##### returns: Function {Simulation}(sim)->{Array} [PlotlyTraces, PlotlyLayout]
Returns data-transformation function for Plotly for OHLC Open-High-Low-Close Time Series with closing prices rendered as points connected by lines and the other series only points, no lines.

### Builder

The module includes a builder function that can take a JSON array of objects and build an array of data tranformation functions.  This makes it easier to build visualizations without repetitive coding.

Each element of the `arrayOfVisuals` should have these properties:

* f:  {String} module function to call to build data-transformation function (i.e. "plotFactory", "histogramFactory", "histogram2DFactory")
* chart properties appropriate to the function, i.e. title, names, logs, xs, ys, modes, vars, etc.  The chart object is not needed, only the properties.  

The builder returns an array of functions for the visualizations.  The properties are attached to each function in a .meta property.

### Copyright

2016 Paul Brewer Economic and Financial Technology Consulting LLC

### License

MIT License

