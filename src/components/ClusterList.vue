<template>
    <div class="ClusterList">
        <div>
            <div class="row header-control">
                <div class="col-sm-4">
                    <div class="row" id="subframediv">
                        <h2>Families</h2>
                        <span style="margin-top:10px">
                        <input type="radio" id="radio_clusterlist_subframe_member" name="cluster_subframe" style="margin-left:10px;margin-right:10px;" v-model="clusterSubFrame_This"  v-on:change="changeSubFrame"  value="member"> <label for="radio_clusterlist_subframe_member">Member</label> 
                        <input type="radio" id="radio_clusterlist_subframe_compare" name="cluster_subframe" style="margin-left:10px;margin-right:10px;" v-model="clusterSubFrame_This"  v-on:change="changeSubFrame"  value="compare"> <label for="radio_clusterlist_subframe_compare">Compare</label> 
                        </span>
                    </div> 
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
                        <button v-on:click="exportFile" id="button_clusterlist_export" value="Export">Export</button>
                    </div>
                </div>
            </div>
            <div class="filter" id="filter_cluster_div">
                <div class="row">
                    <div class="col-sm-9 keyword">
                        <span class="label">Sequence:</span><input type="text" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" v-model="conditions.key" placeholder='Search Key'/>
                        <label><input type="checkbox" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" v-model="conditions.primary_only" />Primary Only</label>
                    </div>
                    <div class="col-sm-3 ratio"><span class="label">Ratio &gt;=</span><input type="number" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" max=100 min=0 placeholder='Cluster Ratio' v-model="threshold.ratio" >%</div>
                </div>
                <div class="row">
                    <div class="col-sm-3 ratio"><span>A: </span><input type="number" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of A" v-model="threshold.lb_A">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" placeholder="Ratio of A" v-model="threshold.A">%</div>
                    <div class="col-sm-3 ratio"><span>C: </span><input type="number" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of C" v-model="threshold.lb_C">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" placeholder="Ratio of C" v-model="threshold.C">%</div>
                    <div class="col-sm-3 ratio"><span>G: </span><input type="number" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of G" v-model="threshold.lb_G">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" placeholder="Ratio of G" v-model="threshold.G">%</div>
                    <div class="col-sm-3 ratio"><span>T: </span><input type="number" v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" max=100 min=0 placeholder="Ratio of T" v-model="threshold.lb_T">-<input type="number" max=100 min=0 v-on:change="colorFilterBackground('filter_cluster_div','#ffaaaa')" placeholder="Ratio of T" v-model="threshold.T">%</div>
                </div>
            </div>
            <div class="row">
                <div class="col-sm-12" style="text-align: center">
                    <button value="Filter" v-on:click="searchClusterThreshold">Search</button>
                </div>
            </div>
<!--            <div class="row">-->
<!--                <span v-if="page.current > 1"><span v-on:click="prevPage">Prev</span></span>-->
<!--                {{ page.current }} / {{ page.total }}-->
<!--                <span v-if="page.current < page.total"><span v-on:click="nextPage">Next</span></span>-->
<!--            </div>-->
            <table class="sequence-table">
                <tr>
                    <th class="index">Copy</th>
                    <th class="index">Index</th>
                    <th class="idCol" v-if="preferences.view.items.includes('id')">Family ID</th>
                    <th class="ngsIdCol" v-if="preferences.view.items.includes('ngs_id')">Representative NGS ID</th>
                    <th class="headCol" v-if="preferences.view.items.includes('head')">Head</th>
                    <th class="variableCol" v-if="preferences.view.items.includes('variable')">Variable</th>
                    <th class="tailCol" v-if="preferences.view.items.includes('tail')">Tail</th>
                    <th v-if="preferences.view.items.includes('variable_length')">Variable Length</th>
                    <th v-if="preferences.view.items.includes('total_length')">Total Length</th>
                    <th v-if="preferences.view.items.includes('count')">Count</th>
                    <th v-if="preferences.view.items.includes('ratio')">Ratio</th>
                    <th v-if="preferences.view.items.includes('a_ratio')">A Ratio</th>
                    <th v-if="preferences.view.items.includes('c_ratio')">C Ratio</th>
                    <th v-if="preferences.view.items.includes('g_ratio')">G Ratio</th>
                    <th v-if="preferences.view.items.includes('t_ratio')">T Ratio</th>
                </tr>
                <tr v-for="(cluster, index) in clusterList " :key="index" :id="cluster.id"
                         v-bind:class="[cluster.id == selected ? 'selected' : '']"
                         v-on:click="sequenceSelected(cluster.sequence[1],$event);clusterSelected(cluster.id, $event);">
                    <td><input type="button" v-on:click="copySequence(cluster.sequence[0],cluster.sequence[1],cluster.sequence[2])" value="■"></td>
                    <td>{{ page.from + index }}</td>
                    <td class="idCol" v-if="preferences.view.items.includes('id')">{{cluster.id}}</td>
                    <td class="ngsIdCol" v-if="preferences.view.items.includes('ngs_id')">{{cluster.seq_name}}</td>
                    <td class="headCol" v-if="preferences.view.items.includes('head') && !preferences.color.primers.includes('on')">{{cluster.sequence[0]}}</td>
                    <td class="headCol" v-if="preferences.view.items.includes('head') && preferences.color.primers.includes('on')">
                        <span v-for="(base, pos) in cluster.sequence[0]" :key="pos" :class="'base base-' + base">{{base}}</span>
                    </td>
                    <td v-if="preferences.view.items.includes('variable')">
                      <span v-for="(base, pos) in cluster.sequence[1]" :key="pos" :class="'base base-' + base">{{base}}</span>
                    </td>
                    <td class="tailCol" v-if="preferences.view.items.includes('tail') && !preferences.color.primers.includes('on')">{{cluster.sequence[2]}}</td>
                    <td class="tailCol" v-if="preferences.view.items.includes('tail') && preferences.color.primers.includes('on')">
                        <span v-for="(base, pos) in cluster.sequence[2]" :key="pos" :class="'base base-' + base">{{base}}</span>
                    </td>
                    <td v-if="preferences.view.items.includes('variable_length')">{{cluster.sequence[1].length}}</td>
                    <td v-if="preferences.view.items.includes('total_length')">{{cluster.sequence.reduce((lhs, rhs) => lhs + rhs.length, 0)}}</td>
                    <td v-if="preferences.view.items.includes('count')">{{cluster.count}} / {{totalCount}}</td>
                    <td v-if="preferences.view.items.includes('ratio')">{{(cluster.count / totalCount * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('a_ratio')">{{(cluster.a_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('c_ratio')">{{(cluster.c_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('g_ratio')">{{(cluster.g_ratio * 100).toFixed(2)}}%</td>
                    <td v-if="preferences.view.items.includes('t_ratio')">{{(cluster.t_ratio * 100).toFixed(2)}}%</td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>
const { ipcRenderer, clipboard } = window.require('electron');

export default {
    name: 'ClusterList',
    props: {
        preferences: Object,
        dataSetId: Number,
        totalCount: Number,
        clusterList: Array,
        selected: String,
        clusterSearchConditions: Object,
        config: Object,
        page: Object,
        clusterThreshold: Object,
        clusterSubFrame:String,
    },
    created() {
        this.conditions['key'] = this.clusterSearchConditions['key'];
        this.conditions['primary_only'] = this.clusterSearchConditions['primary_only'];
        this.threshold['ratio'] = this.clusterThreshold['ratio'];
        this.threshold['A'] = this.clusterThreshold['A'];
        this.threshold['C'] = this.clusterThreshold['C'];
        this.threshold['G'] = this.clusterThreshold['G'];
        this.threshold['T'] = this.clusterThreshold['T'];
        
        this.threshold['lb_A'] = this.clusterThreshold['lb_A'];
        this.threshold['lb_C'] = this.clusterThreshold['lb_C'];
        this.threshold['lb_G'] = this.clusterThreshold['lb_G'];
        this.threshold['lb_T'] = this.clusterThreshold['lb_T'];
    },
    mounted() {
        this.updateBaseColorAll();
        this.changeSubFrame();
    },
    updated() {
        this.updateBaseColorAll();
    },
    data() {
        return {
            selectedSequence:null,
            conditions: {
                key: '',
                primary_only: true,
            }, 
            clusterSubFrame_This:"member",
            threshold: {
                ratio: 0,
                A: 100,
                C: 100,
                G: 100,
                T: 100,
                lb_A: 0,
                lb_C: 0,
                lb_G: 0,
                lb_T: 0
            }
        }
    },
    methods: {
        
        colorFilterBackground: function(divid,color_str) {
            let ddiv = document.getElementById(divid);
            ddiv.style["background-color"] = color_str;
        },
        sequenceSelected(seq){
            this.selectedSequence = seq;
        },
        changeSubFrame:function(){
            this.$emit('changeClusterSubFrame',this.clusterSubFrame_This);
            if(this.clusterSubFrame_This == "compare"){
                this.$emit('loadCompareOne', this.selectedSequence);
            }
        },
        clusterSelected: function(clusterId) {
            this.$emit('clusterChanged', clusterId);
            if(this.clusterSubFrame_This == "compare"){
                this.$emit('loadCompareOne',  this.selectedSequence);
            }
        },
        exportFile: function() {
            ipcRenderer.send('export-cluster-data', [ this.dataSetId, this.conditions, this.threshold ]);
        },
        searchClusterThreshold: function() {
            let ddiv = document.getElementById("filter_cluster_div");
            ddiv.style["background-color"] = "#ffffff";
            this.$emit('searchClusterThreshold', this.conditions, this.threshold);
        },
        nextPage: function() {
            this.$emit('nextPage');
        },
        prevPage: function() {
            this.$emit('prevPage');
        },
        updateBaseColorAll() {
            this.updateBaseColor(document.querySelectorAll('div.ClusterList table.sequence-table tr td span'), "#ffffff");
            this.updateBaseColor(document.querySelectorAll('div.ClusterList table.sequence-table tr td span.base-A'), this.preferences.color.a);
            this.updateBaseColor(document.querySelectorAll('div.ClusterList table.sequence-table tr td span.base-C'), this.preferences.color.c);
            this.updateBaseColor(document.querySelectorAll('div.ClusterList table.sequence-table tr td span.base-G'), this.preferences.color.g);
            this.updateBaseColor(document.querySelectorAll('div.ClusterList table.sequence-table tr td span.base-T'), this.preferences.color.t);
        },
        updateBaseColor(nodeList, newColor) {
            for (let i = 0; i < nodeList.length; ++i) {
                nodeList[i].style.backgroundColor = newColor;
            }
        },
        copySequence: function(h,v,t){
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
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    tr.selected {
        background-color: #BABABA;
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
