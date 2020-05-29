/**
 * Created by doi on 2018/12/30.
 */
<template>
    <div class="CompareView">
        <div class="header-control container">
            <div class="row">
                <div class="col-sm-4">Number of Sequences: <input type="text" v-model="compareNumber" v-on:change="changeNumberOfCompare" /></div>
                <div class="col-sm-4"><label><input type="checkbox" v-model="checkFamilyMembers_This" v-on:change="changeCheckFamiliMembersProp" />Check Family Members</label></div>
                <div class="col-sm-4">
                    <div class="page-control">
                        <button :disabled="page.current <= 1" v-on:click="prevPage">Prev</button>
                        {{ page.current }} / {{ page.total }}
                        <button :disabled="page.current >= page.total" v-on:click="nextPage">Next</button>
                    </div>
                </div>
                <div class="col-sm-4"><button v-on:click="exportAsCsv" value="Export">Export</button></div>
            </div>
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
    name: 'Compare',
    components: {
        CompareGraph,
    },
    props: {
        preferences: Object,
        numberOfCompare: Number,
        checkFamilyMembers: Boolean,
        target: Number,
        page: Object,
        graphWidth: Number,
        graphHeight: Number,
        dataSets: Array,
        dataList: Array,
    },
    data() {
        return {
            compareNumber: this.numberOfCompare,
            checkFamilyMembers_This:this.checkFamilyMembers,//親の変数にバインドすると値の更新のタイミングが分からなかったので別変数を作った。。。
            chartData: [],
            options: [],
        }
    },
    watch: {
        target: {
            handler: function() {
                this.loadCompareData();
            }
        },
        dataList: {
            handler: function () {
                this.updateCompareView();
            },
            deep: true
        },
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
        changeCheckFamiliMembersProp: function() {
            this.$emit('checkFamilyMembersCompare', this.checkFamilyMembers_This);
            this.loadCompareData();
        },
        exportAsCsv: function() {
            ipcRenderer.send('export-compare-data', [this.target, this.numberOfCompare, this.page.current,this.checkFamilyMembers]);
        },
        copySequence: function(event) {
            let index = event.target.name;
            let option = this.options[index];
            clipboard.writeText(option.title.text);
        },
        loadCompareData: function() {
            if (this.numberOfCompare > 0) {
                this.$emit('updateCompareData');
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
</style>
