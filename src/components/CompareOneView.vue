<template>
    <div class="CompareView">
        <div class="header-control container">
            <div class="row" id="compare_target_div" style="margin-top:5px">
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_representative" v-on:change="changeCompareTargetProp" v-model="compareTarget" value="cluster_representative" checked> <label for="radio_representative">Cluster Representatives</label> 
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_cluster_all" v-on:change="changeCompareTargetProp"  v-model="compareTarget" value="cluster_all"> <label for="radio_cluster_all">Cluster Members</label> 
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_sequences" v-on:change="changeCompareTargetProp"  v-model="compareTarget" value="sequences"> <label for="radio_sequences">Sequences</label> 
                <button id="button_compareone_export" v-on:click="exportAsCsv" value="Export" style="margin-left:30px;">Export</button>
                <button class="copy-button" v-on:click="copySequence">Copy Sequence</button>
            </div> 
            
        </div>
        <div class="graph-pane" v-for="(graph, index) in chartData" :key="index" :id="graph.id" style="float: left">
            <compare-graph :chartData="chartData[index]" :options="options[index]" :width="graphWidth" :height="graphHeight"></compare-graph>
        </div>
    </div>
</template>

<script>
const { clipboard } = window.require('electron');
const { ipcRenderer } = window.require('electron');
import CompareGraph from './CompareGraph.vue'

export default {
    name: 'CompareOne',
    components: {
        CompareGraph,
    },
    props: {
        preferences: Object,
        target: Number,
        totalCount: Number,
        graphWidth: Number,
        graphHeight: Number,
    },
    data() {
        return {
            numberOfCompare: 1,
            page: 1,
            compareTarget: "cluster_representative",
            conditions: {"key":"","primary_only":false},
            threshold: { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 },
            compareNumber: this.numberOfCompare,
            chartData: [],
            options: [],
            dataSets: Array,
            dataList: Array,
        }
    },
    watch: {
    },
    mounted() {
    },
    methods: {
        changeCompareTargetProp: function() {
            this.$emit("changeCompareOneTarget",this.compareTarget,this.selectedSequence);
        },
        exportAsCsv: function() {
            let self = this;
            let lines = [];
            if(!self.selectedSequence){
                return;
            }
            lines.push(self.selectedSequence);
            lines.push("DataSet,Sequence Count,Total Count,Ratio(%)");
            for(let ii = 0;ii < self.dataSets.length;ii++){
                lines.push(self.dataSets[ii].name+","
                +self.dataList[0].counts[self.dataSets[ii].id]+","
                +self.dataSets[ii].accepted_cluster_sequences+","
                +(self.dataList[0].counts[self.dataSets[ii].id]/self.dataSets[ii].accepted_cluster_sequences*100));
            }
            ipcRenderer.send('write_to_file',{"lines":lines});
        },
        copySequence: function() {
            if(this.selectedSequence){
                clipboard.writeText(this.selectedSequence);
            }
        },
        setSelectedSequence:function(seq){
            this.selectedSequence = seq;
            if(!seq){//seq が null の場合は初期化の命令
                this.updateCompareView(null,null,null);
            }
        },
        updateCompareView: function(datasets,datalist,comparetarget) {
            const self = this;
            if(!self.selectedSequence){
                self.chartData = [];
                self.options = [];
                return;
            }
            self.compareTarget = comparetarget;
            self.dataSets = datasets;
            self.dataList = datalist;
            if(!comparetarget){
                self.compareTarget = "cluster_representative";
            }else{
                self.compareTarget = comparetarget;
            }
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
            let selectedSequence_check ="";
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
                if(selectedSequence_check.length > 0){
                    selectedSequence_check += "\n";
                }
                let ttitle = this.selectedSequence;
                if(!data.sequence && selectedSequence_check.length == 0){
                    ttitle = "Not Found:"+this.selectedSequence;
                }
                selectedSequence_check += data.sequence+"";
                let option = {
                    title: {
                        display: true,
                        text: ttitle,
                    },
                    legend: {
                        position: 'right',
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
            });
            if(self.compareTarget != "cluster_all"){//cluster_all の場合は返ってくる配列（representative になるはず）が異なる場合があるのでチェックしない
                if(selectedSequence_check != "undefined"){
                    if(selectedSequence_check != self.selectedSequence){
                        throw "error in code??\n"+selectedSequence_check+"\n"+self.selectedSequence+"?????";
                    }
                }
            }
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
