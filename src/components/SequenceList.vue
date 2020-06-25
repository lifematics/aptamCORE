/**
 * Created by doi on 2018/12/30.
 */
<template>
    <div class="SequenceList">
        <div>
            <div class="row header-control">
                <div class="col-sm-4">
                    <h2 style="margin-right:20px">Sequences</h2>
                </div>
                <div class="col-sm-4">
                    <div class="page-control">
                        <button :disabled="page.current <= 1" v-on:click="prevPage">Prev</button>
                        {{ page.current }} / {{ page.total }}
                        <button :disabled="page.current >= page.total" v-on:click="nextPage">Next</button>
                    </div>
                </div>
                <div class="col-sm-4">
                    <div class="">
                        <button v-on:click="exportAsCsv" value="Export">Export</button>
                    </div>
                </div>
            </div>
            <div class="filter" id="filter_seq_div">
                <div class="row">
                    <div class="col-sm-9 keyword"><span class="label">Sequence:</span><input type="text" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" v-model="search_key" placeholder='Search Key'/></div>
                    <div class="col-sm-3 ratio"><span class="label">Ratio &gt;=</span><input type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder='Cluster Ratio' v-model="threshold.ratio" >%</div>
                </div>
                <div class="row">
                    <div class="col-sm-3 ratio"><span>A: </span><input type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of A" v-model="threshold.lb_A">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of A" v-model="threshold.A">%</div>
                    <div class="col-sm-3 ratio"><span>C: </span><input type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of C" v-model="threshold.lb_C">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of C" v-model="threshold.C">%</div>
                    <div class="col-sm-3 ratio"><span>G: </span><input type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of G" v-model="threshold.lb_G">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of G" v-model="threshold.G">%</div>
                    <div class="col-sm-3 ratio"><span>T: </span><input type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of T" v-model="threshold.lb_T">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of T" v-model="threshold.T">%</div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm-12" style="text-align: center">
                    <button value="Filter" v-on:click="searchSequencesThreshold">Search</button>
                </div>
            </div>
            <table class="sequence-table">
                <tr>
                    <th class="index">Index</th>
                    <th class="idCol" v-if="preferences.view.items.includes('id')">Sequence ID</th>
                    <th class="ngsIdCol" v-if="preferences.view.items.includes('ngs_id')">NGS ID</th>
                    <th class="headCol" v-if="preferences.view.items.includes('head')">Head</th>
                    <th class="variableCol" v-if="preferences.view.items.includes('variable')">Variable</th>
                    <th class="tailCol"  v-if="preferences.view.items.includes('tail')">Tail</th>
                    <th v-if="preferences.view.items.includes('variable_length')">Variable Length</th>
                    <th v-if="preferences.view.items.includes('total_length')">Total Length</th>
                    <th v-if="preferences.view.items.includes('count')">Count</th>
                    <th v-if="preferences.view.items.includes('ratio')">Ratio</th>
                    <th v-if="preferences.view.items.includes('a_ratio')">A Ratio</th>
                    <th v-if="preferences.view.items.includes('c_ratio')">C Ratio</th>
                    <th v-if="preferences.view.items.includes('g_ratio')">G Ratio</th>
                    <th v-if="preferences.view.items.includes('t_ratio')">T Ratio</th>
                    <th v-if="preferences.view.items.includes('variable_distance')">Levenshtein Distance</th>
                </tr>
                <tr v-for="(sequence, index) in sequenceList" :key="index" 
                v-on:click="sequenceSelected(sequence.sequence[1],$event)">
                    <td>{{ page.from + index }}</td>
                    <td class="idCol" v-if="preferences.view.items.includes('id')">{{sequence.id}}</td>
                    <td class="ngsIdCol" v-if="preferences.view.items.includes('ngs_id')">{{sequence.name}}</td>
                    <td class="headCol" v-if="preferences.view.items.includes('head') && !preferences.color.primers.includes('on')">{{sequence.sequence[0]}}</td>
                    <td class="headCol" v-if="preferences.view.items.includes('head') && preferences.color.primers.includes('on')">
                        <span v-for="(base, pos) in sequence.sequence[0]" :key="pos" :class="'base base-' + base">{{base}}</span>
                    </td>
                    <td v-if="preferences.view.items.includes('variable')">
                      <span v-for="(base, pos) in sequence.sequence[1]" :key="pos" :class="'base base-' + base">{{base}}</span>
                    </td>
                    <td class="tailCol" v-if="preferences.view.items.includes('tail') && !preferences.color.primers.includes('on')">{{sequence.sequence[2]}}</td>
                    <td class="tailCol" v-if="preferences.view.items.includes('tail') && preferences.color.primers.includes('on')">
                        <span v-for="(base, pos) in sequence.sequence[2]" :key="pos" :class="'base base-' + base">{{base}}</span>
                    </td>
                    <td v-if="preferences.view.items.includes('variable_length')">{{sequence.sequence[1].length}}</td>
                    <td v-if="preferences.view.items.includes('total_length')">{{sequence.sequence.reduce((lhs, rhs) => lhs + rhs.length, 0)}}</td>
                    <td v-if="preferences.view.items.includes('count')">{{sequence.count}} / {{totalCount}}</td>
                    <td v-if="preferences.view.items.includes('ratio')">{{(sequence.count / totalCount * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('a_ratio')">{{(sequence.a_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('c_ratio')">{{(sequence.c_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('g_ratio')">{{(sequence.g_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('t_ratio')">{{(sequence.t_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('variable_distance')">{{sequence.distance}}</td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>
const { ipcRenderer } = window.require('electron');

export default {
    name: 'SequenceList',
    props: {
        preferences: Object,
        dataSetId: Number,
        clusterId: String,
        sequenceSearchKey: String,
        totalCount: Number,
        sequenceList: Array,
        config: Object,
        page: Object,
        mode:String,
        sequencesThreshold: Object,
    },
    created() {
        this.search_key = this.sequenceSearchKey;
        this.threshold['ratio'] = this.sequencesThreshold['ratio'];
        this.threshold['A'] = this.sequencesThreshold['A'];
        this.threshold['C'] = this.sequencesThreshold['C'];
        this.threshold['G'] = this.sequencesThreshold['G'];
        this.threshold['T'] = this.sequencesThreshold['T'];
        
        this.threshold['lb_A'] = this.sequencesThreshold['lb_A'];
        this.threshold['lb_C'] = this.sequencesThreshold['lb_C'];
        this.threshold['lb_G'] = this.sequencesThreshold['lb_G'];
        this.threshold['lb_T'] = this.sequencesThreshold['lb_T'];
    },
    data() {
        return {
            search_key: '',
            threshold: {
                ratio: 0, A: 100, C: 100, G: 100, T: 100, lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0
            },
        }
    },
    mounted() {
        this.updateBaseColorAll();
    },
    updated() {
        this.updateBaseColorAll();
    },
    methods: {
        colorFilterBackground: function(divid,color_str) {
            let ddiv = document.getElementById(divid);
            ddiv.style["background-color"] = color_str;
        },
        exportAsCsv: function() {
            this.threshold['count'] = this.totalCount * this.threshold['ratio'] / 100.0;
            ipcRenderer.send('export-sequence-data', [this.dataSetId, this.clusterId, this.search_key, this.threshold]);
        },
        sequenceSelected: function(seq) {
            if(this.mode == "sequence"){
                this.$emit('loadCompareOne', seq);
            }
        },
        searchSequencesThreshold: function() {
            let ddiv = document.getElementById("filter_seq_div");
            ddiv.style["background-color"] = "#ffffff";
            this.threshold['count'] = this.totalCount * this.threshold['ratio'] / 100.0;
            this.$emit('searchSequencesThreshold',this.search_key, this.threshold);
        },
        updateBaseColorAll() {
            this.updateBaseColor(document.querySelectorAll('div.SequenceList table.sequence-table tr td span.base-A'), this.preferences.color.a);
            this.updateBaseColor(document.querySelectorAll('div.SequenceList table.sequence-table tr td span.base-C'), this.preferences.color.c);
            this.updateBaseColor(document.querySelectorAll('div.SequenceList table.sequence-table tr td span.base-G'), this.preferences.color.g);
            this.updateBaseColor(document.querySelectorAll('div.SequenceList table.sequence-table tr td span.base-T'), this.preferences.color.t);
        },
        updateBaseColor(nodeList, newColor) {
            for (let i = 0; i < nodeList.length; ++i) {
                nodeList[i].style.backgroundColor = newColor;
            }
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
.allow-scroll {
    overflow: scroll;
}
/* display:block にしても横スクロールバーがなぜか表示されない・・・
.allow-scroll::-webkit-scrollbar {
  display: none;
}
*/

.filter .keyword input[type="text"] {
    width: 480px;
}
.filter .keyword input[type="number"] {
    width: 100px;
}
.filter .keyword input[type="checkbox"] {
    width: 100px;
}
.filter span.label {
    display: inline-block;
    width: 60px;
}
.filter .ratio input {
    width: 60px;
}

</style>
