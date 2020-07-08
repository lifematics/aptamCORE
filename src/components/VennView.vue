/**
* Created by doi on 2018/12/30.
*/
<template>
  <div class="VennView" style="height: 400px;">
    <div class="export">
      <div class="col-sm-8">
          <span><input type="radio" name="venn_target_type" id="radio_cluster" value="cluster" v-model="targetType"><label for="radio_cluster">Cluster</label></span>
          <span style="margin-left:8px"><input type="radio" name="venn_target_type" id="radio_sequence" value="sequence" v-model="targetType"><label for="radio_sequence">Sequence</label></span>
      </div>
    </div>  
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
        <button id="button_venn_export_combination" v-on:click="exportSequences">Export</button>
        <button id="button_venn_export_fastq_combination" v-on:click="exportSequencesFastq">Create Fastq</button>
      </div>

      <div class="export-end"></div>
    </div>
    <div class="row" style="margin-left:20px;text-weight:bold;">List combination among <input type="text" style="width:60px;margin-left:8px;margin-right:8px;" v-model="clusterNumberFilter" v-on:keyup="changeClusterNumberFilter" /> datasets.</div>
    <div v-for="(area, index) in selectedVennData" :key="index" class="row area-list" :id="'venn_combination_'+index"  :style="'padding-top:4px;padding-bottom:4px;background-color:rgb('+(255-index%2*32)+','+(255-index%2*32)+',255)'">
      <div class="col-sm-4">
        <button type="button" @click="exportVennSequence(area.sets)">Export</button>
        <button type="button" @click="exportVennSequenceFastq(area.ids)">Create Fastq</button>
      </div>
      <div class="col-sm-2" v-if="targetType == 'cluster'">{{area.size}} Clusters</div>
      <div class="col-sm-2" v-if="targetType == 'sequence'">{{area.size}} Sequences</div>
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
        targetType:"cluster",
        selectedVenTarget: Array,
        selectedVennData: Array,
        exportSettings: Object,
        clusterNumberFilter:""
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
        self.$emit("setLoadingApp",false);
      });
      ipcRenderer.send('get-venn-data', {"target_type":this.targetType});
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
        let self = this;
        var tooltip = d3.select("body").append("div").attr("class", "tooltip");
        div.selectAll("g")
                .on("mouseover", function(d) {
                  // sort all the areas relative to the current item
                  venn.sortAreas(div, d);

                  // Display a tooltip with the current size
                  tooltip.transition().duration(400).style("opacity", .9);
                  
                  if(self.targetType == "cluster"){
                    tooltip.text(d.size + " Clusters");
                  }else{
                    tooltip.text(d.size + " Sequences");
                  }

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
      targetType: {
        handler: function() {
          this.$emit("setLoadingApp",true);
          ipcRenderer.send('get-venn-data', {"target_type":this.targetType});
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
        ipcRenderer.send('export-intersection-sequence-data',{"settings":sets, "target_type":this.targetType});
      },
      exportSequences: function() {
        ipcRenderer.send('export-overlapped-sequences',  {"settings": this.exportSettings, "target_type":this.targetType});
      },
      exportVennSequenceFastq: function(ids) {
        let expset = {};
        for(let ii = 0;ii < this.dataSets.length;ii++){
          expset[this.dataSets[ii].id] = 0;
        }
        for(let ii = 0;ii < ids.length;ii++){
          expset[ids[ii]] = 1;
        }
        ipcRenderer.send('export-overlapped-sequences-fastq', {"settings": expset, "target_type":this.targetType});
      },
      exportSequencesFastq: function() {
        ipcRenderer.send('export-overlapped-sequences-fastq', {"settings": this.exportSettings, "target_type":this.targetType});
      },
      changeClusterNumberFilter:function(){
        let rcount = 0;
        for(let ii = 0;ii < this.selectedVennData.length;ii++){
          let ddiv = document.getElementById('venn_combination_'+ii);
          if(this.clusterNumberFilter.length > 0){
            if(this.clusterNumberFilter == this.selectedVennData[ii].sets.length+""){
              ddiv.style['display'] = 'flex';
              ddiv.style['flex-wrap'] = 'wrap';
              rcount += 1;
            }else{
              ddiv.style['display'] = 'none';
              continue;
            }
          }else{
              ddiv.style['display'] = 'flex';
              ddiv.style['flex-wrap'] = 'wrap';
              rcount += 1;
          }
          if(rcount%2 == 0){
            ddiv.style["background-color"] = "rgb(223,223,255)";
          }else{
            ddiv.style["background-color"] = "rgb(255,255,255)";
          }
        }
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
