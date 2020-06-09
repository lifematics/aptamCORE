/**
 * Created by doi on 2018/12/30.
 */
<template>
    <div class="CompareView">
        <div class="header-control container">
            <div class="row" id="compare_target_div" style="margin-top:5px">
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_representative" v-on:change="changeCompareTargetProp" v-model="compareTarget_This" value="cluster_representative" checked> <label for="cluster_representative">Cluster Representatives</label> 
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_cluster_all" v-on:change="changeCompareTargetProp"  v-model="compareTarget_This" value="cluster_all"> <label for="radio_cluster_all">Cluster Members</label> 
                <input type="radio" name="compare_target" style="margin-left:10px;margin-right:10px;" id="radio_sequences" v-on:change="changeCompareTargetProp"  v-model="compareTarget_This" value="sequences"> <label for="radio_sequences">Sequences</label> 
            </div> 
            <div class="col-sm-4"><button v-on:click="exportAsCsv" value="Export">Export</button></div>
        </div>
        <div class="graph-pane" v-for="(graph, index) in chartData" :key="index" :id="graph.id" style="float: left">
            <button class="copy-button" v-on:click="copySequence" :name="index">Copy Sequence</button>
            <compare-graph :chartData="chartData[index]" :options="options[index]" :width="graphWidth" :height="graphHeight"></compare-graph>
        </div>
    </div>
</template>

<script>
const { ipcRenderer, clipboard } = window.require('electron');

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
        dataSets: Array,
        dataList: Array,
    },
    data() {
        return {
            numberOfCompare: 1,
            page: 1,
            compareTarget: "cluster_representative",
            conditions: {"key":"","primary_only":false},
            threshold: { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 },
            compareNumber: this.numberOfCompare,
            compareTarget_This:this.compareTarget,//親の変数にバインドすると値の更新のタイミングが分からなかったので別変数を作った。。。
            chartData: [],
            options: [],
        }
    },
    watch: {
    },
    mounted() {
        let that = this;
    },
    methods: {
        changeCompareTargetProp: function() {
            this.$emit('setCompareTargetApp', this.compareTarget_This);
            this.updateCompareView();
        },
        exportAsCsv: function() {
            this.threshold['count'] = Math.ceil(this.totalCount * this.threshold['ratio'] / 100.0);
            ipcRenderer.send('export-compare-data', {
                "dataset_id": this.target,
                "number_of_compare": this.numberOfCompare,
                "page": this.page.current,
                "compare_target": this.compareTarget,
                "filter_settings": {"conditions":this.conditions,"threshold":this.threshold}
            });   
        },
        copySequence: function(event) {
            let index = event.target.name;
            let option = this.options[index];
            clipboard.writeText(option.title.text);
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
