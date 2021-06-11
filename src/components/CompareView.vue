<template>
    <div class="CompareView">
        <div class="header-control container">
            <div class="row">
                <div class="col-sm-4">Number of Sequences: <input type="text" v-model="compareNumber" v-on:change="changeNumberOfCompare" /></div>
                <div class="col-sm-4">
                    <div class="page-control">
                        <button id="button_compare_prevpage" :disabled="page.current <= 1" v-on:click="prevPage">Prev</button>
                        {{ page.current }} / {{ page.total }}
                        <button id="button_compare_nextpage" :disabled="page.current >= page.total" v-on:click="nextPage">Next</button>
                    </div>
                </div>
                <div class="col-sm-4"><button id="button_compare_exportcsv" v-on:click="exportAsCsv" value="Export">Export</button></div>
            </div>
            
            <div class="switch_head" v-on:click="changeVisibility('filter_div')"><div id="filter_div_switch" class="switch">+</div> Filters:</div>
            <div class="filter" id="filter_div" style="display:none;">
                <div class="row">
                    <div class="col-sm-9 keyword">
                        <span class="label">Sequence:</span><input type="text" v-on:change="colorFilterBackground" v-model="conditions.key" placeholder='Search Key'/>
                        <label><input type="checkbox" v-on:change="colorFilterBackground" v-model="conditions.primary_only" />Primary Only</label>
                    </div>
                    <div class="col-sm-3 ratio"><span class="label">Ratio &gt;=</span><input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder='Cluster Ratio' v-model="threshold.ratio" >%</div>
                </div>
                <div class="row">
                    <div class="col-sm-3 ratio"><span>A: </span><input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of A" v-model="threshold.lb_A">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of A" v-model="threshold.A">%</div>
                    <div class="col-sm-3 ratio"><span>C: </span><input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of C" v-model="threshold.lb_C">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of C" v-model="threshold.C">%</div>
                    <div class="col-sm-3 ratio"><span>G: </span><input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of G" v-model="threshold.lb_G">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of G" v-model="threshold.G">%</div>
                    <div class="col-sm-3 ratio"><span>T: </span><input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of T" v-model="threshold.lb_T">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground" placeholder="Ratio of T" v-model="threshold.T">%</div>
                </div>
                <div class="col-sm-4"><button v-on:click="filterGraphs" value="Export">Filter</button></div>
            </div>
            <div class="switch_head" v-on:click="changeVisibility('scoring_function_div')" ><div id="scoring_function_div_switch" class="switch">+</div> Scoring Function:</div>
            <div id="scoring_function_div" style="display:none;">
                <table>
                    <tr v-for="(ff, index) in scoringFunctionNames" :key="index">
                    <td><input type="radio" name="scoring_function" style="margin-left:10px;margin-right:10px;" v-on:change="changeScoringFunctionProp" :value="index" :id="'radio_sfunc'+index" v-model="scoringFunctionIndex"> <label :for="'radio_sfunc'+index">{{ff}}</label></td>
                    </tr>
                </table>
            </div>
            <div class="switch_head" v-on:click="changeVisibility('compare_target_div')"><div id="compare_target_div_switch" class="switch">+</div>Target Type:</div>
            <div id="compare_target_div" style="margin-top:5px;display:none;">
                <div>
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_representative" v-model="compareTarget_This" value="cluster_representative" checked> <label for="radio_representative">Cluster Representatives</label> 
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_cluster_all" v-model="compareTarget_This" value="cluster_all"> <label for="radio_cluster_all">Cluster Members</label> 
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_sequences" v-model="compareTarget_This" value="sequences"> <label for="radio_sequences">Sequences</label> 
                </div>
            </div> 
        </div>
        <div class="graph-pane" v-for="(graph, index) in chartData" :key="index" :id="graph.id" style="float: left">
            <button class="copy-button" v-on:click="copySequence" :name="index">Copy Sequence</button>
            <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_1" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_1" type="button" v-on:click="copySequenceAndGo(options[index],preferences.copy_and_go.copy_and_go_url_1)" value="■">
            <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_2" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_2" type="button" v-on:click="copySequenceAndGo(options[index],preferences.copy_and_go.copy_and_go_url_2)" value="■">
            <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_3" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_3" type="button" v-on:click="copySequenceAndGo(options[index],preferences.copy_and_go.copy_and_go_url_3)" value="■">
            <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_4" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_4" type="button" v-on:click="copySequenceAndGo(options[index],preferences.copy_and_go.copy_and_go_url_4)" value="■">
            <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_5" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_5" type="button" v-on:click="copySequenceAndGo(options[index],preferences.copy_and_go.copy_and_go_url_5)" value="■">
            <compare-graph :chartData="chartData[index]" :options="options[index]" :width="graphWidth" :height="graphHeight"></compare-graph>
        </div>
    </div>
</template>

<script>
const { ipcRenderer, clipboard } = window.require('electron');

import CompareGraph from './CompareGraph.vue'

export default {
    name: 'Compare',
    components: {
        CompareGraph,
    },
    props: {
        preferences: Object,
        numberOfCompare: Number,
        target: Number,
        totalCount: Number,
        page: Object,
        conditions: Object,
        threshold: Object,
        graphWidth: Number,
        graphHeight: Number,
        dataSets: Array,
        dataList: Array,
        scoringFunctionNames:Array,
    },
    data() {
        return {
            compareNumber: this.numberOfCompare,
            scoringFunction:[],
            compareTarget_This:"cluster_representative",
            chartData: [],
            options: [],
            scoringFunctionIndex:0,
        }
    },
    watch: {
        compareTarget_This: {
            handler: function () {
                this.loadCompareData();
            },
            deep: true //いらないと思うが
        },
        dataList: {
            handler: function () {
                this.updateCompareView();
            },
            deep: true
        },
        target: {
            handler: function () {
                this.loadCompareData();
            },
            deep: true //いらないと思うが
        },
    },
    
    destroyed: function(){
    },
    mounted() {
        this.loadCompareData();
    },
    methods: {
        changeNumberOfCompare: function() {
            if (this.compareNumber) {
                this.$emit('changeCompareNumber', parseFloat(this.compareNumber));
                this.loadCompareData();
            }
        },
        colorFilterBackground: function() {
            let ddiv = document.getElementById("filter_div");
            ddiv.style["background-color"] = "#ffaaaa";
        },
        filterGraphs: function() {
            let ddiv = document.getElementById("filter_div");
            ddiv.style["background-color"] = "#ffffff";
            if (this.numberOfCompare > 0) {
                this.loadCompareData();
            }
        },
        changeScoringFunctionProp: function() {
            this.loadCompareData();
        },        
        changeVisibility:function(targetname){
            let ddiv = document.getElementById(targetname);
            let sdiv = document.getElementById(targetname+"_switch");
            if(ddiv.style["display"] == "none"){
                ddiv.style["display"] = "block"
                if(sdiv){
                    sdiv.innerText = "-";
                }
            }else{
                ddiv.style["display"] = "none"
                if(sdiv){
                    sdiv.innerText = "+";
                }
            }
        },
        copySequence: function(event) {
            let index = event.target.name;
            let option = this.options[index];
            if(option){
                clipboard.writeText(option.title.text);
            }else{
                clipboard.writeText("undefined");
            }
        },
        copySequenceAndGo: function(option,url) {
            if(option){
                const regex = /.+:[\s]*/ig;
                let xtex = option.title.text.replaceAll(regex, "");
                clipboard.writeText(xtex);
                if(url){
                    ipcRenderer.send('open-url',[url]);
                }
            }else{
                clipboard.writeText("undefined");
            }
        },
        exportAsCsv: function() {
            this.threshold['count'] = Math.ceil(this.totalCount * this.threshold['ratio'] / 100.0);
            ipcRenderer.send('export-compare-data', {
                "dataset_id": this.target,
                "number_of_compare": this.numberOfCompare,
                "page": this.page.current,
                "compare_target": this.compareTarget_This,
                "filter_settings": {"conditions":this.conditions,"threshold":this.threshold},
                "scoring_function":this.scoringFunctionNames[this.scoringFunctionIndex]
            });   
        },
        loadCompareData: function() {
            if (this.numberOfCompare > 0) {
                this.$emit('setLoadingApp',true);
                this.threshold['count'] = Math.ceil(this.totalCount * this.threshold['ratio'] / 100.0);
                let argss = {
                        "dataset_id": this.target,
                        "number_of_compare": this.numberOfCompare,
                        "page": this.page.current,
                        "compare_target": this.compareTarget_This,
                        "filter_settings": {"conditions":this.conditions,"threshold":this.threshold},
                        "scoring_function":this.scoringFunctionNames[this.scoringFunctionIndex]
                };
                ipcRenderer.send('load-compare-data',
                    argss
                 );
            }
        },
        updateCompareView: function() {
            const self = this;

            let colors = [
                '#a6cee3',
                '#1f78b4',
                '#b2df8a',
                '#33a02c',
                '#fb9a99',
                '#e31a1c',
                '#fdbf6f',
                '#ff7f00',
                '#cab2d6',
                '#6a3d9a',
                '#ffff99',
                '#b15928',
            ];

            self.chartData = [];
            self.options = [];
            let dataSetIds = [];
            let dataSetNames = [];
            let sequenceCountList = [];
            self.dataSets.forEach((dataSet) => {
                dataSetIds.push(dataSet.id);
                dataSetNames.push(dataSet.name);
                sequenceCountList.push(dataSet.accepted_cluster_sequences)
            });

            let graphIndex = this.page.from;
            self.dataList.forEach((data, dataIndex) => {
                let dataEntryList = [];
                dataSetIds.forEach((id, index) => {
                    let value = data.counts[id];
                    if (self.preferences.compare.value == 'ratio') {
                        value = (value / sequenceCountList[index] * 100);
                    }
                    dataEntryList.push({
                        label: dataSetNames[index],
                        backgroundColor: colors[index % 12],
                        data: [ value ],
                    });
                });
                let item = {
                    id: 'graph-' + dataIndex,
                    labels:[''],
                    datasets: dataEntryList,
                };
                let option = {
                    title: {
                        display: true,
                        text: graphIndex + ' : ' + data.sequence,
                    },
                    legend: {
                        position: 'bottom',
                    },
                    responsive: false,
                    maintainAspectRatio: false,
                    scales: {
                        yAxes: [
                            {
                                ticks: { beginAtZero: true },
                                gridLines: { display: true  }
                            }
                        ],
                        xAxes: [
                            {
                                gridLines: { display: false }
                            }
                        ]
                    }
                };
                self.chartData.push(item);
                self.options.push(option);
                ++graphIndex;
            });
        },
        nextPage: function() {
            this.$emit('nextPage');

        },
        prevPage: function() {
            this.$emit('prevPage');
        },
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
    margin: 40px 0 0;
}
ul {
    list-style-type: none;
    padding: 0;
}
li {
    display: inline-block;
    margin: 0 10px;
}
a {
    color: #42b983;
}
.small {
    max-width: 600px;
    margin:  150px auto;
}

.CompareView {
    float: left;
}

.copy-button {
    float: right;
}

div.switch {
    width: 30px;
    text-align: center;
    cursor:pointer;
    margin-left:-15px;
}
div.switch_head{
    display: -ms-flexbox;
    display: flex;
    -ms-flex-wrap: wrap;
    flex-wrap: wrap;
    font-size:14px;
    font-weight:bold;
    cursor:pointer;
}

div.filter {
    padding:3px;
}

.filter .keyword input[type="text"] {
    width: 480px;
}
.filter .keyword input[type="number"] {
    width: 100px;
}
.filter .keyword input[type="checkbox"] {
    margin-left: 10px;
}

.filter span.label {
    display: inline-block;
    width: 60px;
}
.filter .ratio input {
    width: 60px;
}
</style>
