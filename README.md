# single-market-robot-simulator-viz-plotly
[![Total alerts](https://img.shields.io/lgtm/alerts/g/DrPaulBrewer/single-market-robot-simulator-viz-plotly.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/DrPaulBrewer/single-market-robot-simulator-viz-plotly/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/DrPaulBrewer/single-market-robot-simulator-viz-plotly.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/DrPaulBrewer/single-market-robot-simulator-viz-plotly/context:javascript)

Middleware to generate chart data for plotly from single-market-robot-simulator's simulation logs.

Used at [Econ1.Net](https://econ1.net) and by an older prototype, [robot-trading-webapp](https://github.com/drpaulbrewer/robot-trading-webapp)

## Installation

     npm i single-market-robot-simulator-viz-plotly -S

## Summary

This module helps create visualizations of `single-market-robot-simulator` simulation data with `plotly.js:^1.12.0` charting library.

A particular visualization typically extracts row data contained in one or more simulations logs in browser memory into traces and layouts required by plotly.

## Documentation

The module has changed enough that the previously posted documentation may be incorrect.

To understand how this code is used, you can look at code in another module: [single-market-robot-simulator-app-framework](https://github.com/drpaulbrewer/single-market-robot-simulator-app-framework)

Note that Plotly.js is not listed as a dependency or called.  This code does the Extract-Transform steps and it is expected that the calls to Plotly are done in other code.

## Tests

Tests confirm that each of the visualizations defined in `./test/dataVisuals.json` will complete its extract-transform step when given randomized simulation data.

At this time, the tests are not elaborate enough to confirm that each visualization faithfully reproduces the simulation data. Instead, tests provide a means of detecting
a feature regression before committing new code.

## Copyright

2016- Paul Brewer Economic and Financial Technology Consulting LLC

## License

MIT License
