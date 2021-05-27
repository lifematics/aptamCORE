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
                        <button id="button_sequencelist_export" v-on:click="exportFile" value="Export">Export</button>
                    </div>
                </div>
            </div>
            <div class="filter" id="filter_seq_div">
                <div class="row">
                    <div class="col-sm-9 keyword"><span class="label">Sequence:</span><input type="text" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" v-model="search_key" placeholder='Search Key'/></div>
                    <div class="col-sm-3 ratio"><span class="label">Ratio &gt;=</span><input type="number" id="text_threshold_sequence_ratio" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder='Cluster Ratio' v-model="threshold.ratio" >%</div>
                </div>
                <div class="row">
                    <div class="col-sm-3 ratio"><span>A: </span><input id="text_threshold_sequence_a_lb" type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of A" v-model="threshold.lb_A">-<input id="text_threshold_sequence_a" type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of A" v-model="threshold.A">%</div>
                    <div class="col-sm-3 ratio"><span>C: </span><input id="text_threshold_sequence_c_lb" type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of C" v-model="threshold.lb_C">-<input id="text_threshold_sequence_c" type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of C" v-model="threshold.C">%</div>
                    <div class="col-sm-3 ratio"><span>G: </span><input id="text_threshold_sequence_g_lb" type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of G" v-model="threshold.lb_G">-<input id="text_threshold_sequence_g" type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of G" v-model="threshold.G">%</div>
                    <div class="col-sm-3 ratio"><span>T: </span><input id="text_threshold_sequence_t_lb" type="number" v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of T" v-model="threshold.lb_T">-<input id="text_threshold_sequence_t" type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_seq_div','#ffaaaa')" placeholder="Ratio of T" v-model="threshold.T">%</div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm-12" style="text-align: center">
                    <button id="button_sequence_search" value="Filter" v-on:click="searchSequencesThreshold">Search</button>
                </div>
            </div>
            <table class="sequence-table">
                <tr>
                    <th class="index" v-if="preferences.view.items.includes('copy_button')">Copy</th>
                    <th class="index" v-if="preferences.view.items.includes('copy_and_go_button')">Copy and Go</th>
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
                v-bind:class="[sequence.id == selected ? 'selected' : '']"
                v-on:click="sequenceSelected(sequence.sequence[1],$event);setSequenceSelected(sequence.id)">
                    <td v-if="preferences.view.items.includes('copy_button')"><input type="button" v-on:click="copySequence(sequence.sequence[0],sequence.sequence[1],sequence.sequence[2],null)" value="■"></td>
                    <td v-if="preferences.view.items.includes('copy_and_go_button')">
                        <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_1" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_1" type="button" v-on:click="copySequence(sequence.sequence[0],sequence.sequence[1],sequence.sequence[2],preferences.copy_and_go.copy_and_go_url_1)" value="■">
                        <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_2" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_2" type="button" v-on:click="copySequence(sequence.sequence[0],sequence.sequence[1],sequence.sequence[2],preferences.copy_and_go.copy_and_go_url_2)" value="■">
                        <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_3" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_3" type="button" v-on:click="copySequence(sequence.sequence[0],sequence.sequence[1],sequence.sequence[2],preferences.copy_and_go.copy_and_go_url_3)" value="■">
                        <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_4" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_4" type="button" v-on:click="copySequence(sequence.sequence[0],sequence.sequence[1],sequence.sequence[2],preferences.copy_and_go.copy_and_go_url_4)" value="■">
                        <input v-b-popover.hover.top="preferences.copy_and_go.copy_and_go_url_5" v-if="preferences.view.items.includes('copy_and_go_button') && preferences.copy_and_go.copy_and_go_url_5" type="button" v-on:click="copySequence(sequence.sequence[0],sequence.sequence[1],sequence.sequence[2],preferences.copy_and_go.copy_and_go_url_5)" value="■">
                    </td>
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
const { ipcRenderer,clipboard } = window.require('electron');

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
            selected:-1,
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
        exportFile: function() {
            this.threshold['count'] = this.totalCount * this.threshold['ratio'] / 100.0;
            ipcRenderer.send('export-sequence-data', [this.dataSetId, this.clusterId, this.search_key, this.threshold]);
        },
        sequenceSelected: function(seq) {
            if(this.mode == "sequence"){
                this.$emit('loadCompareOne', seq);
            }
        },
        setSequenceSelected: function(seqid) {
            this.selected = seqid;
        },
        searchSequencesThreshold: function() {
            let ddiv = document.getElementById("filter_seq_div");
            ddiv.style["background-color"] = "#ffffff";
            this.threshold['count'] = this.totalCount * this.threshold['ratio'] / 100.0;
            this.$emit('searchSequencesThreshold',this.search_key, this.threshold);
        },
        updateBaseColorAll() {
            this.updateBaseColor(document.querySelectorAll('div.SequenceList table.sequence-table tr td span'), "#ffffff");
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

        copySequence: function(h,v,t,url){
            let ret = "";
            if(this.preferences.view.items.includes("head")){
                ret += h;
            }
            if(this.preferences.view.items.includes("variable")){
                ret += v;
            }
            if(this.preferences.view.items.includes("tail")){
                ret += t;
            }
            clipboard.writeText(ret);
            if(url){
                ipcRenderer.send('open-url',[url]);
            }
        }
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

    tr.selected {
        background-color: #BABABA;
    }

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
