<template>
    <div class="app">
        <loading :active.sync="isLoading"
                 :can-cancel="false"
                 :is-full-page="true"></loading>
        <home v-if="mode == 'home'"></home>
        <div class="wrapper" v-else>

            <div class="rightPanel" >
                <div class="content">
                    <config-view v-if="mode == 'config'" :config="config" :presets="presets" v-on:configChanged="configChanged"></config-view>
                    <info-view v-if="mode == 'info'" :config="config" :info="info" ></info-view>
                    <multipane layout="horizontal" v-if="mode == 'cluster'">
                        <div :style="{ height: '400px', overflow: 'scroll' }">
                            <cluster-list :config="config" :clusterSubFrame:="clusterSubFrame" v-on:loadCompareOne="loadCompareOne" :preferences="preferences" :totalCount="seqCountOfDataSet" :clusterList="clusterList" :selected="activeCluster" :dataSetId="activeDataSet" v-on:clusterChanged="clusterChanged" v-on:changeClusterSubFrame="changeClusterSubFrame"  :clusterSearchConditions="clusterSearchConditions" :page="pageOfClusters" :sequencesThreshold="sequencesThreshold" :clusterThreshold="clusterThreshold" v-on:nextPage="nextClusterPage" v-on:prevPage="prevClusterPage" v-on:searchClusterThreshold="searchClusterThreshold"/>
                        </div>
                        <multipane-resizer></multipane-resizer>
                        <div :style="{  height: '400px', overflow: 'scroll' }">
                            <compare-one-view  ref="compareOneComponent"  v-if="clusterSubFrame == 'compare'" v-on:exportCompareOneCSV="exportCompareOneCSV" v-on:changeCompareOneTarget="changeCompareOneTarget"  :preferences="preferences"  :conditions="clusterSearchConditions" :threshold="clusterThreshold"  :target="activeDataSet" :graphWidth="compareOneWidth" :graphHeigh="compareOneHeight"></compare-one-view>
                            <sequence-list  v-if="clusterSubFrame == 'member'" v-on:loadCompareOne="loadCompareOne" :config="config" :preferences="preferences" :totalCount="seqCountOfCluster" :sequenceList="sequenceList" :dataSetId="activeDataSet" :clusterId="activeCluster" :sequenceSearchKey="sequenceSearchKey" :sequencesThreshold="sequencesThreshold" :page="pageOfSequences" v-on:nextPage="nextSequencePage" v-on:prevPage="prevSequencePage" v-on:searchSequencesThreshold="searchSequencesThreshold"/>
                        </div>
                        <multipane-resizer></multipane-resizer>
                    </multipane>
                    <multipane layout="horizontal" v-if="mode == 'sequence'">
                        <div :style="{ height: '400px', overflow: 'scroll' }">
                        <sequence-list :preferences="preferences"  v-on:clusterChanged="clusterChanged" v-on:loadCompareOne="loadCompareOne" :totalCount="allSequenceCount" :sequenceList="allSequenceList" :dataSetId="activeDataSet" :clusterId=null :sequenceSearchKey="sequenceSearchKey" :sequencesThreshold="sequencesThreshold" :aThreshold="aThreshold" :cThreshold="cThreshold" :tThreshold="tThreshold" :gThreshold="gThreshold" :clusterThreshold="clusterThreshold" :page="pageOfAllSequences" v-on:nextPage="nextAllSequencePage" v-on:prevPage="prevAllSequencePage" v-on:searchSequencesThreshold="searchSequencesThreshold"/>
                        </div>
                        <multipane-resizer></multipane-resizer>
                        <div :style="{  height: '400px', overflow: 'scroll' }">
                            <compare-one-view  ref="compareOneComponent" v-on:changeCompareOneTarget="changeCompareOneTarget" v-on:exportCompareOneCSV="exportCompareOneCSV"  :preferences="preferences"  :conditions="clusterSearchConditions" :threshold="clusterThreshold"  :target="activeDataSet" :graphWidth="compareOneWidth" :graphHeigh="compareOneHeight"></compare-one-view>
                        </div>
                        <multipane-resizer></multipane-resizer>
                    </multipane>
                    <compare-view v-if="mode == 'compare'" :preferences="preferences" :totalCount="allSequenceCount" :conditions="clusterSearchConditions" :threshold="clusterThreshold" :target="activeDataSet" :dataSets="compareDataSets" :dataList="compareDataList" :numberOfCompare="compareNumber" :compareTarget="compareTarget" :page="pageOfCompares" :graphWidth="compareWidth" :graphHeigh="compareHeight" v-on:nextPage="nextComparePage" v-on:prevPage="prevComparePage" v-on:setCompareTargetApp="setCompareTargetApp" v-on:changeCompareNumber="changeCompareNumber" v-on:updateCompareData="updateCompareData"></compare-view>
                    <venn-view v-if="mode == 'venn'"></venn-view>
                </div>
            </div>

            <div class="leftPanel">
                <div class="content">
                    <data-set-list ref="datasetListComponent" :selected="activeDataSet" v-on:dataSetChanged="dataSetChanged"/>
                    <div class="button-container">
                        <button v-on:click="analyze" value="Analyze" v-bind:disabled="mode != 'config'">Analyze</button>
                    </div>
                    <div class="button-container">
                        <button v-on:click="information" value="Information" v-bind:disabled="mode == 'config' || mode == 'home'">Information</button>
                    </div>
                    <div class="button-container">
                        <button v-on:click="cluster" value="View" v-bind:disabled="mode == 'config' || mode == 'home'">Families</button>
                    </div>
                    <div class="button-container">
                        <button v-on:click="sequence" value="Sequence" v-bind:disabled="mode == 'config' || mode == 'home'">Sequences</button>
                    </div>
                    <div class="button-container">
                        <button v-on:click="compare" value="Compare" v-bind:disabled="mode == 'config' || mode == 'home'">Compare</button>
                    </div>
                    <div class="button-container">
                        <button v-on:click="venn" value="Venn" v-bind:disabled="mode == 'config' || mode == 'home'">Venn Diagram</button>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script>
    import Home from './components/Home.vue';
    import ConfigView from './components/ConfigView.vue';
    import InfoView from './components/InfoView.vue';
    import DataSetList from './components/DataSetList.vue';
    import ClusterList from './components/ClusterList.vue';
    import SequenceList from './components/SequenceList.vue';
    import CompareView from './components/CompareView.vue';
    import CompareOneView from './components/CompareOneView.vue';
    import VennView from './components/VennView.vue';
    const { ipcRenderer } = window.require('electron');

    import Loading from 'vue-loading-overlay';
    import 'vue-loading-overlay/dist/vue-loading.css';

    import { Multipane, MultipaneResizer } from 'vue-multipane';

    export default {
        name: 'app',
        components: {
            Home,
            ConfigView,
            InfoView,
            DataSetList,
            ClusterList,
            SequenceList,
            CompareView,
            CompareOneView,
            VennView,
            Loading,
            Multipane,
            MultipaneResizer,
        },
        data: function () {
            return {
                preferences: null,
                config: null,
                presets: null,
                info: null,
                activeDataSet: null,
                dataSetList: [],
                activeCluster: null,
                clusterList: [],
                clusterSearchConditions: { key: '', 'primary_only': true },
                clusterThreshold: { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 },
                sequenceSearchKey: '',
                sequencesThreshold: { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 },
                sequenceList: [],
                seqCountOfDataSet: 0,
                seqCountOfCluster: 0,
                isLoading: false,
                allSequenceCount: 0,
                allSequenceList: [],
                compareDataSets: null,
                compareDataList: null,
                compareWidth: 400,
                compareHeight: 450,
                compareOneWidth: 800,
                compareOneHeight: 300,
                compareOneSeq:null,
                compareOneTarget:'cluster_representative',

                compareNumber: 5,
                clusterSubFrame:"member",
                compareTarget:"cluster_representative",
                mode: 'home',
                pageOfClusters: {'total': 1, 'current': 1, 'from': 1, 'to': 1},
                pageOfSequences: {'total': 1, 'current': 1, 'from': 1, 'to': 1},
                pageOfAllSequences: {'total': 1, 'current': 1, 'from': 1, 'to': 1},
                pageOfCompares: {'total': 1, 'current': 1, 'from': 1, 'to': 1},
            }
        },
        watch: {
            preferences: {
                handler: function (val, ) {
                    this.compareNumber = parseInt(val.compare.count, 10);
                    this.compareWidth = parseInt(val.compare.width, 10);
                    this.compareHeight = parseInt(val.compare.height, 10);
                },
                deep: true,
            },
            clusterSubFrame:{
                handler: function(val,){
                    if(val == "compare"){
                        this.getSequenceList();
                    }
                }
            }
        },
        created() {
            ipcRenderer.on('preferencesChanged', (event, preferences) => {
                this.preferences = preferences;
            });
            ipcRenderer.on('presetsChanged', (event, presets) => {
                this.presets = presets;
            });
            ipcRenderer.on('analysisChanged', (event, config) => {
                this.config = config;
                if (!config) {
                    this.mode = 'home';
                } else {
                    this.activeDataSet = null;
                    this.dataSetList = [];
                    this.activeCluster = null;
                    this.clusterList = [];
                    this.sequenceList = [];
                    this.seqCountOfDataSet = 0;
                    this.seqCountOfCluster = 0;
                    if (!config.analyzed) {
                        this.mode = 'config';
                    } else {
                        this.mode = 'cluster';
                    }
                    this.getDataSetList();
                }
            });
            ipcRenderer.on('dataSetListChanged', (event, datasets) => {
                this.isLoading = false;
                this.dataSetList = datasets;
                if(this.$refs.datasetListComponent){
                    this.$refs.datasetListComponent.updateList(this.dataSetList);
                }
                if (this.dataSetList.length > 0) {
                    this.dataSetChanged(this.dataSetList[0].id);
                }
            });
            ipcRenderer.on('clusterListChanged', (event, result) => {
                this.isLoading = false;
                this.seqCountOfDataSet = result['sequence_count'];
                this.clusterList = result['clusters'];
                let page = result['page'];
                let listSize = parseInt(this.preferences.view.list_size, 10);
                let from = (page - 1) * listSize + 1;
                let to = from + this.clusterList.length - 1;
                let total = Math.floor((result['cluster_count'] + listSize - 1) / listSize);
                this.pageOfClusters = {'total': total, 'current': page, 'from': from, 'to': to };
            });
            ipcRenderer.on('sequenceListChanged', (event, result) => {
                this.isLoading = false;
                this.seqCountOfCluster = result['sequence_count'];
                this.sequenceList = result['sequences'];
                let page = result['page'];
                let listSize = parseInt(this.preferences.view.list_size, 10);
                let from = (page - 1) * listSize + 1;
                let to = from + this.sequenceList.length - 1;
                let total = Math.floor((result['variant_count'] + listSize - 1) / listSize);
                this.pageOfSequences = { 'total': total, 'current': page, 'from': from, 'to': to };

            });
            ipcRenderer.on('allSequenceListChanged', (event, result) => {
                this.isLoading = false;
                this.allSequenceCount = result['sequence_count'];
                this.allSequenceList = result['sequences'];
                let page = result['page'];
                let listSize = parseInt(this.preferences.view.list_size, 10);
                let from = (page - 1) * listSize + 1;
                let to = from + this.allSequenceList.length - 1;
                let total = Math.floor((result['variant_count'] + listSize - 1) / listSize);
                this.pageOfAllSequences = { 'total': total, 'current': page, 'from': from, 'to': to }
            });
            ipcRenderer.on('dataSetInfoChanged', (event, result) => {
                let that = this;
                that.isLoading = false;
                that.info = result;
                that.info.get_merger_info = (kk)=>{
                    if(that.info["merger_results"]){
                        if( kk in that.info["merger_results"]){
                            return that.info["merger_results"][kk];
                        }
                    }
                    return "-";
                };
                
                that.info.mergedDataset = false;
                if(that.info["merger_results"]){
                    if( "merged_file" in that.info["merger_results"]){
                        that.info.mergedDataset = true;
                    }
                }
            });
            ipcRenderer.on('start-analysis', () => {
                if (this.mode != 'config') {
                    return;
                }
                this.isLoading = true;
            });
            ipcRenderer.on('finish-analysis', () => {
                this.isLoading = false;
                this.mode = 'cluster';
            });
            ipcRenderer.on('start-export', () => {
                this.isLoading = true;
            });
            ipcRenderer.on('finish-export', () => {
                this.isLoading = false;
            });
            ipcRenderer.on('showSettingsDialog', () => {
            });
            ipcRenderer.on('set-search-cluster-threshold', (e,arg) => {
                this.searchClusterThreshold(arg['conditions'],arg['threshold']);
            });
            ipcRenderer.on('set-compare-data', (event, args) => {
                this.compareDataSets = args['dataSets'];
                this.compareDataList = args['data'];
                let page = args['page'];
                let size = args['size'];
                let from = (page - 1) * size + 1;
                let to = from + this.compareDataList.length - 1;
                let total = Math.floor((args['total'] + size - 1) / size);
                this.pageOfCompares = { 'total': total, 'current': page, 'from': from, 'to': to }
            });
            ipcRenderer.on('update-compare-one-view',(event, args) => {
                if((this.clusterSubFrame == "compare" && this.mode == "cluster")
                || (this.mode == "sequence")){
                    this.$refs.compareOneComponent.setSelectedSequence(args['selected_sequence']);
                    this.$refs.compareOneComponent.updateCompareView(args['dataSets'],args['data'],this.compareOneTarget);
                }
            });

            this.getDataSetList();
            ipcRenderer.send('load-preferences', []);
            ipcRenderer.send('load-presets', []);
        },
        methods: {
            configChanged: function(config) {
                this.config = config;
            },
            changeClusterSubFrame: function(framename){
                this.clusterSubFrame = framename;
            },
            dataSetChanged: function(name) {
                this.activeDataSet = parseInt(name);
                this.activeCluster = null;
                this.clusterList = [];
                this.clusterSearchConditions = { key: '', 'primary_only': true };
                this.sequenceList = [];
                this.sequenceSearchKey = '';
                this.sequencesThreshold = { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 };
                this.aThreshold = null;
                this.cThreshold = null;
                this.tThreshold = null;
                this.gThreshold = null;
                this.lbaThreshold = null;
                this.lbcThreshold = null;
                this.lbtThreshold = null;
                this.lbgThreshold = null;
                this.clusterThreshold = { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 };
                this.getClusterList();
                this.getDatasetInfo();
            },
            clusterChanged: function(id) {
                this.activeCluster = id.toString();
                this.sequenceList = [];
                this.sequencesThreshold = { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 };
                this.aThreshold = null;
                this.cThreshold = null;
                this.tThreshold = null;
                this.gThreshold = null;
                this.lbaThreshold = null;
                this.lbcThreshold = null;
                this.lbtThreshold = null;
                this.lbgThreshold = null;
                this.sequenceSearchKey = '';
                this.getSequenceList();
            },
            searchClusterThreshold: function(conditions, threshold) {
                this.clusterSearchConditions = conditions;
                this.clusterThreshold = threshold;
                this.getClusterList();
                this.sequenceList = [];
            },
            searchSequencesThreshold: function(key, threshold) {
                this.sequenceSearchKey = key;
                this.sequencesThreshold = threshold;
                this.getSequenceList();
            },
            getDataSetList: function() {
                this.isLoading = true;
                ipcRenderer.send('load-datasets', []);
            },
            getClusterList: function() {
                this.isLoading = true;
                let threshold = {
                    count: Math.ceil(this.seqCountOfDataSet * this.clusterThreshold['ratio'] / 100.0),
                    A: this.clusterThreshold['A'],
                    C: this.clusterThreshold['C'],
                    G: this.clusterThreshold['G'],
                    T: this.clusterThreshold['T'],

                    lb_A: this.clusterThreshold['lb_A'],
                    lb_C: this.clusterThreshold['lb_C'],
                    lb_G: this.clusterThreshold['lb_G'],
                    lb_T: this.clusterThreshold['lb_T'],
                };
                ipcRenderer.send('load-clusters', [this.activeDataSet, this.clusterSearchConditions, this.preferences.view.list_size, this.pageOfClusters.current, threshold]);
            },
            getSequenceList: function() {
                //this.isLoading = true;
                let threshold = {
                    A: this.sequencesThreshold['A'],
                    C: this.sequencesThreshold['C'],
                    G: this.sequencesThreshold['G'],
                    T: this.sequencesThreshold['T'],

                    lb_A: this.sequencesThreshold['lb_A'],
                    lb_C: this.sequencesThreshold['lb_C'],
                    lb_G: this.sequencesThreshold['lb_G'],
                    lb_T: this.sequencesThreshold['lb_T'],
                    
                    count: this.sequencesThreshold['count'],
                };

                if(!this.activeCluster){
                    threshold['count'] = Math.ceil(this.sequencesThreshold['ratio'] / 100.0 * this.allSequenceCount)
                }else if(!threshold['count']){
                    //通常呼び出し元で指定される
                    threshold['count'] = Math.ceil(this.seqCountOfCluster * this.sequencesThreshold['ratio'] / 100.0);
                }

                ipcRenderer.send('load-sequences', [this.activeDataSet, this.activeCluster, this.sequenceSearchKey, this.preferences.view.list_size, this.pageOfSequences.current, threshold]);
            },
            
            loadCompareOne: function(seq) {
                //this.isLoading = true;
                this.compareOneSeq = seq;
                if(this.mode == "sequence"){
                    ipcRenderer.send('load-compare-one', {"selected_sequence":seq,"dataset_id":this.activeDataSet,"cluster_id":this.activeCluster,"key":this.compareOneSeq,"target":this.compareOneTarget});
                }else if (this.mode == "cluster"){
                    ipcRenderer.send('load-compare-one', {"selected_sequence":seq,"dataset_id":this.activeDataSet,"cluster_id":this.activeCluster,"key":null,"target":this.compareOneTarget});
                }
            },
            changeCompareOneTarget: function(target){
                this.compareOneTarget = target;
                ipcRenderer.send('load-compare-one', {"dataset_id":this.activeDataSet,"cluster_id":this.activeCluster,"key":this.compareOneSeq,"target":this.compareOneTarget});
            },

            getAllSequenceList: function() {
                this.isLoading = true;
                let threshold = {
                    count: Math.ceil(this.allSequenceCount * this.sequencesThreshold / 100.0),
                    A: this.sequencesThreshold['A'],
                    C: this.sequencesThreshold['C'],
                    G: this.sequencesThreshold['G'],
                    T: this.sequencesThreshold['T'],

                    lb_A: this.sequencesThreshold['lb_A'],
                    lb_C: this.sequencesThreshold['lb_C'],
                    lb_G: this.sequencesThreshold['lb_G'],
                    lb_T: this.sequencesThreshold['lb_T'],
                };
                ipcRenderer.send('load-all-sequences', [this.activeDataSet, this.preferences.view.list_size, this.pageOfAllSequences.current, threshold]);
            },
            getDatasetInfo() {
                this.isLoading = true;
                ipcRenderer.send('load-dataset-info', [this.activeDataSet]);
                let threshold = {
                    count: Math.ceil(this.allSequenceCount * this.sequencesThreshold / 100.0),
                    A: this.sequencesThreshold['A'],
                    C: this.sequencesThreshold['C'],
                    G: this.sequencesThreshold['G'],
                    T: this.sequencesThreshold['T'],
                    
                    lb_A: this.sequencesThreshold['lb_A'],
                    lb_C: this.sequencesThreshold['lb_C'],
                    lb_G: this.sequencesThreshold['lb_G'],
                    lb_T: this.sequencesThreshold['lb_T'],
                };
                ipcRenderer.send('load-all-sequences', [this.activeDataSet, this.preferences.view.list_size, this.pageOfAllSequences.current, threshold]);
            },
            exportCompareOneCSV: function(args){
                args["dataset_id"] = this.activeDataSet;
                ipcRenderer.send('export-compare-data',args);
            },
            changeCompareNumber: function(numberOfCompare) {
                this.compareNumber = numberOfCompare;
            },
            setCompareTargetApp:function(value) {
                this.compareTarget = value;
            },
            updateCompareData: function() {
                this.clusterThreshold['count'] = Math.ceil(this.allSequenceCount * this.clusterThreshold['ratio'] / 100.0);
                ipcRenderer.send('load-compare-data',
                    {
                        "dataset_id":this.activeDataSet,
                        "number_of_compare":this.compareNumber,
                        "page":this.pageOfCompares.current,
                        "compare_target":this.compareTarget,
                        "filter_settings": {"conditions":this.clusterSearchConditions
                        ,"threshold":this.clusterThreshold}
                    }
                 );
            },
            analyze: function() {
                ipcRenderer.send('analyze', [this.config]);
            },
            information: function() {
                this.mode = 'info';
            },
            compare: function() {
                this.mode = 'compare';
            },
            cluster: function() {
                this.activeCluster = null;
                this.mode = 'cluster';
                this.sequencesThreshold = { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 };
                this.aThreshold = null;
                this.cThreshold = null;
                this.tThreshold = null;
                this.gThreshold = null;
                this.sequenceSearchKey = '';
            },
            sequence: function() {
                this.activeCluster = null;
                this.mode = 'sequence';
                this.sequencesThreshold = { count: 0, ratio: 0, A: 100, C: 100, G: 100, T: 100 , lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0 };
                this.aThreshold = null;
                this.cThreshold = null;
                this.tThreshold = null;
                this.gThreshold = null;
                this.sequenceSearchKey = '';
            },
            venn: function() {
                this.mode = 'venn';
            },
            updatePage: function(target) {
                switch (target) {
                    case 'cluster':
                        this.getClusterList();
                        break;
                    case 'sequence':
                        this.getSequenceList();
                        break;
                    case 'all-sequence':
                        this.getAllSequenceList();
                        break;
                    case 'compare':
                        this.updateCompareData();
                        break;
                    default:
                }
            },

            nextPage: function(page, target) {
                page.current += 1;
                if (page.current > page.total) {
                    page.current = page.total;
                }
                this.updatePage(target);
            },

            prevPage: function(page, target) {
                page.current -= 1;
                if (page.current < 1) {
                    page.current = 1;
                }
                this.updatePage(target);
            },

            nextClusterPage: function() {
                this.nextPage(this.pageOfClusters, 'cluster');
            },

            prevClusterPage: function() {
                this.prevPage(this.pageOfClusters, 'cluster');
            },

            nextSequencePage: function() {
                this.nextPage(this.pageOfSequences, 'sequence');
            },

            prevSequencePage: function() {
                this.prevPage(this.pageOfSequences, 'sequence');
            },

            nextAllSequencePage: function() {
                this.nextPage(this.pageOfAllSequences, 'all-sequence');
            },

            prevAllSequencePage: function() {
                this.prevPage(this.pageOfAllSequences, 'all-sequence');
            },

            nextComparePage: function() {
                this.nextPage(this.pageOfCompares, 'compare');
            },

            prevComparePage: function() {
                this.prevPage(this.pageOfCompares, 'compare');
            },

            resize: function() {
            }
        }
    }
</script>

<style>
    @import 'style.css';

    #app {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        margin-top: 60px;
        border: 5px solid #ccf;
    }
    div.button-container {
        text-align: center;
        margin: 10px;
    }
    button {
        width: 120px;
    }

    .wrapper {
        width: 100%;
    }
    .content {
        margin: 0;
        padding: 1em;
    }
    .leftPanel {
        float: left;
        width: 180px;
    }
    .rightPanel {
        float: right;
        width: 100%;
        height: 100%;
        margin-left: -180px;
    }
    .rightPanel .content {
        margin-left: 180px;
    }

</style>
