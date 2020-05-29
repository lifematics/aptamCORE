/**
 * Created by doi on 2018/12/30.
 */
<template>
    <div class="DataSetList">
        <h3>Datasets</h3>
        <draggable v-model="dataSetList" @start="drag=true" @end="drag=false" @choose="dataSetSelected" @sort="onSort">
            <div v-for="element in dataSetList" :key="element.id" v-bind:class="{ selected: element.id == selected }">{{element.name}}</div>
        </draggable>
        <hr/>
    </div>
</template>

<script>
import draggable from 'vuedraggable'
const { ipcRenderer } = window.require('electron')

export default {
    components: {
        draggable,
    },
    name: 'DataSetList',
    props: {
        msg: String,
        dataSetList: Array,
        selected: Number,
    },
    methods: {
        onSort: function() {
            let list = this.dataSetList.map((item) => { return item.id });
            ipcRenderer.send('onSorted', list);
        },
        dataSetSelected: function(event) {
            let index = event.oldIndex;
            this.$emit('dataSetChanged', this.dataSetList[index].id);
        },
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    div.selected {
        background-color: #BABABA;
    }
    div.DataSetList {
        margin: 10px;
    }
</style>
