/* eslint-env node, mocha */
/* eslint no-console: "off", newline-per-chained-call: "off" */

import '@babel/polyfill';
import assert from 'assert';
import 'should';
import * as VIZ from '../src/index.js';
import * as singleMarketRobotSimulator from 'single-market-robot-simulator';
import config1 from './sim1.json';
import config2 from './sim2.json';
import config3 from './sim3.json';
import dataVisuals from './dataVisuals.json';

const { Simulation } = singleMarketRobotSimulator;

let sim1,sim2,sim3;
let visuals;

global.window = {screen: { width: 400 }}; // eslint-disable-line no-global-assign

describe('run Example simulations', function(){
  it('should run and finish sim1', function(){
    sim1 = new Simulation(config1).run({sync:true});
  });
  it('should run and finish sim2', function(){
    sim2 = new Simulation(config2).run({sync:true});
  });
  it('should run and finish sim3', function(){
    sim3 = new Simulation(config3).run({sync:true});
  });
});

describe('visualizations', function(){
  it('should build visuals OK', function(){
    visuals = VIZ.build(dataVisuals);
  });
  it(`should build the correct number of visuals (${dataVisuals.length})`, function(){
    assert(visuals.length===dataVisuals.length);
  });
  it('each visual should be an instance of VIZ.VisualizationFactory', function(){
    visuals.forEach((v)=>(assert(v instanceof VIZ.VisualizationFactory)));
  });
  it('each visual .meta should contain original configuration', function(){
    visuals.forEach((v,j)=>{
      v.meta.should.deepEqual(dataVisuals[j]);
    });
  });
  it('should run each visualization OK on [sim1,sim2,sim3] with minimal sanity checking of output', function(){
    function testSingleLoadedViz(v, vl){
      assert(vl instanceof VIZ.Visualization,"assert: vl is a VIZ.Visualization for "+v.meta.title);
      assert(Array.isArray(vl.data),"assert vl.data is an array for "+v.meta.title);
      vl.data.length.should.be.above(0);
      assert(typeof(vl.layout)==='object',"assert vl.layout is an object for "+v.meta.title);
      assert(Object.keys(vl.layout).length>0,"assert vl.layout is non-empty for "+v.meta.title);
    }
    visuals.forEach((v)=>{
      let vLoaded;
      try {
        vLoaded = v.load({
          from: [sim1,sim2,sim3]
        });
      } catch(e){
        e.message = 'visual '+v.meta.title+': Function :'+v.meta.f+': Error :'+e.message;
        throw e;
      }
      if (v.meta.input==='study'){
        return testSingleLoadedViz(v,vLoaded);
      }
      assert(Array.isArray(vLoaded), "detail visualization should yield an array ");
      vLoaded.length.should.equal(3);
      vLoaded.forEach((vl)=>(testSingleLoadedViz(v,vl)));
    });
  });
});
