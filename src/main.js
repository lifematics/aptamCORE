import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import VueSplit from 'vue-split-panel'

const { ipcRenderer } = window.require('electron');

Vue.config.productionTip = false;
Vue.use(BootstrapVue);
Vue.use(VueSplit);

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import App from './App.vue'

new Vue({
    render: h => h(App),
}).$mount('#app');

// eslint-disable-next-line
ipcRenderer.on('home', (event, arg) => {
});

// eslint-disable-next-line
ipcRenderer.on('sequence', (event, arg) => {
});

// eslint-disable-next-line
ipcRenderer.on('compare', (event, arg) => {
});
