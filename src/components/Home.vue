<template>
  <center style="padding:20%">
    <div class="Home">
      <button type="button" v-on:click="start_new_analysis"  style="background-color:white;border:solid 3px blue; border-radius: 5px;font-size:24px;margin-left:40px;margin-right:40px;">New Analysis</button> 
      <button type="button" v-on:click="open_analysis"  style="background-color:white;border:solid 3px blue; border-radius: 5px;font-size:24px;margin-left:40px;margin-right:40px;">Open Analysis</button>
    </div>
  </center>
</template>

<script>

const { ipcRenderer } = window.require('electron');
export default {
  name: 'Home',

  methods: {
    start_new_analysis: function() {
      ipcRenderer.send('start-new-analysis', []);
    },
    open_analysis: function() {
      ipcRenderer.send('open-analysis', []);
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
</style>
