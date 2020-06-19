/**
* Created by doi on 2018/12/30.
*/
<template>
  <div class="VennView" style="height: 400px;">

    <div class="dataset-selector row">
      <div class="col-sm-3" v-for="(item, index) in selectedVenTarget" :key="index">
        <input type="checkbox" :value="item.id" :id="'checkbox-' + item.id" v-model="item.value"/>
        <label :for="'checkbox-' + item.id">{{item.name}}</label>
      </div>
    </div>

    <div id="venn"/>

    <div class="export">
      <div>Common Sequence Export</div>

      <div class="export-item">
        <div v-for="(data, index) in dataSets" :key="index">
          <span>{{data.name}}</span>
          <span><label :for="'include-' + data.id"><input type="radio" :id="'include-' + data.id" :value="1" v-model="exportSettings[data.id]">Includes</label></span>
          <span><label :for="'exclude-' + data.id"><input type="radio" :id="'exclude-' + data.id" :value="-1" v-model="exportSettings[data.id]">Excludes</label></span>
          <span><label :for="'dontcare-' + data.id"><input type="radio" :id="'dontcare-' + data.id" :value="0" v-model="exportSettings[data.id]">Don't Care</label></span>
        </div>
      </div>

      <div class="export-item">
        <button v-on:click="exportSequences">Export</button>
      </div>

      <div class="export-end"></div>
    </div>

    <div v-for="(area, index) in selectedVennData" :key="index" class="row area-list">
      <div class="col-sm-2">
        <button type="button" @click="exportVennSequence(area.sets)">Export</button>
      </div>
      <div class="col-sm-2">{{area.size}} Families</div>
      <div class="col-sm-8">
        <span v-for="(item, i) in area.sets" :key="i"> {{item}} </span>
      </div>
    </div>

  </div>
</template>

<script>
  import * as d3 from 'd3';
  var venn = require('venn.js');
  var chart = venn.VennDiagram();

  const { ipcRenderer } = window.require('electron');

  export default {
    name: 'Compare',
    components: {
    },
    props: {
    },
    data() {
      return {
        vennData: Array,
        dataSets: Array,
        selectedVenTarget: Array,
        selectedVennData: Array,
        exportSettings: Object,
      }
    },
    
    destroyed: function(){
      ipcRenderer.removeAllListeners('set-venn-data');
    },
    mounted() {
      const self = this;
      ipcRenderer.on('set-venn-data', function(event, args) {
        self.dataSets = args['datasets'];
        self.selectedVenTarget = self.dataSets.map((dataSet) => { return {id: dataSet.id, name: dataSet.name, value: true} });
        self.vennData = args['counts'];
      });
      ipcRenderer.send('get-venn-data', []);
    },
    watch: {
      dataSets() {
        const self = this;
        this.exportSettings = Object.keys(this.dataSets).reduce(function(map, key) {
          let id = self.dataSets[key].id;
          map[id] = 0;
          return map;
        }, {} );
      },
      vennData() {
        let div = d3.select("#venn");
        this.updateVennDiagram();

        var tooltip = d3.select("body").append("div").attr("class", "tooltip");
        div.selectAll("g")
                .on("mouseover", function(d) {
                  // sort all the areas relative to the current item
                  venn.sortAreas(div, d);

                  // Display a tooltip with the current size
                  tooltip.transition().duration(400).style("opacity", .9);
                  tooltip.text(d.size + " Families");

                  // highlight the current path
                  var selection = d3.select(this).transition("tooltip").duration(400);
                  selection.select("path")
                          .style("stroke-width", 3)
                          .style("fill-opacity", d.sets.length == 1 ? .4 : .1)
                          .style("stroke-opacity", 1);
                })

                .on("mousemove", function() {
                  tooltip.style("left", (d3.event.pageX) + "px")
                          .style("top", (d3.event.pageY - 28) + "px");
                })

                .on("mouseout", function(d) {
                  tooltip.transition().duration(400).style("opacity", 0);
                  var selection = d3.select(this).transition("tooltip").duration(400);
                  selection.select("path")
                          .style("stroke-width", 0)
                          .style("fill-opacity", d.sets.length == 1 ? .25 : .0)
                          .style("stroke-opacity", 0);
                });
      },
      selectedVenTarget: {
        handler: function() {
          this.updateVennDiagram();
        },
        deep: true,
      },
    },
    methods: {
      updateVennDiagram: function() {
        const self = this;
        let div = d3.select("#venn");
        this.selectedVennData = this.vennData.filter((data) => {
          let intersection = data.sets.filter((item) => {
            return self.selectedVenTarget.find(function(element) {
              return element.value && element.name == item;
            }) != undefined;
          });
          return intersection.length == data.sets.length;
        });

        div.datum(this.selectedVennData).call(chart);
      },
      exportVennSequence: function(sets) {
        ipcRenderer.send('export-intersection-sequence-data', sets);
      },
      exportSequences: function() {
        ipcRenderer.send('export-overlapped-sequences', this.exportSettings);
      }
    },
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .area-list {
    margin: 5px 5px 5px 5px;
  }
  .tooltip {
    position: fixed;
  }
  .dataset-selector {
    margin: 30px;
  }

  .export {
    margin: 10px;
    padding: 10px;
  }
  .export-item {
    float: left;
    padding: 10px;
    margin: 10px;
  }
  .export-item span {
    margin: 10px;
  }
  .export border {
    border: solid 1px;
  }
  .export-end {
    clear: both;
  }
</style>