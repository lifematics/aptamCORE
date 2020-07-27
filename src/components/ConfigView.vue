<template>
    <div class="ConfigView">
        
        <div class="preset">
            <h2>Fastq Files</h2>
            <div id="fastq_list_div" style="font-size:large"></div> 
            <div id="single_or_paired_div">
            <input type="radio" name="single_or_paired" id="radio_single" v-on:change="validateFastqList" v-model="$data.single_or_paired" value="single" checked> <label for="radio_single">Single-End</label>
            <input type="radio" name="single_or_paired" id="radio_paired" v-on:change="validateFastqList" v-model="$data.single_or_paired" value="paired"> <label for="radio_paired">Paired-End</label>
            <input type="radio" name="single_or_paired" id="radio_interleaved_paired" v-on:change="validateFastqList" v-model="$data.single_or_paired" value="interleaved_paired"> <label for="radio_interleaved_paired">Interleaved-Paired-End</label>
            </div> 
        </div>
        
        <div class="preset">
            <button @click="estimateFinishTime">Estimate</button>
            Estimated Processing Time: <span id="span_finish_time">N/A</span>
        </div>
        <hr/>

        <h2>Parameters</h2>
        <div class="preset">
            <span>Preset:</span>
            <select id="config_selector" name="configurations" v-model="$data.selected_preset">
                <option v-for="name in Object.keys(presets)" :key="name">{{ name }}</option>
            </select>
            <button @click="onLoadPresets">Load Preset</button>
            <button @click="onRemovePreset">Remove Preset</button>
        </div>

        <hr/>

        <div class="preset">
            <span>Preset Name</span>
            <input type="text" v-model="$data.preset_name"/>
            <button @click="onSavePreset">Save As Preset</button>
        </div>

        <h5>Filter Settings:</h5>
        <table class="settings">
            <tr class="row">
                <th>Quality Criteria</th>
                <td><input type="text" id="text_qual" name="quality_criteria" v-model="$data.quality_criteria"/></td>
            </tr>
            <tr class="row">
                <th>Max Low Quality Elements</th>
                <td><input type="text" id="text_max_low_qual" name="number_of_low_quality_elements" v-model="$data.number_of_low_quality_elements"/></td>
            </tr>
            <tr class="row">
                <th>Length of Variable</th>
                <td>
                    <input type="text" id="text_min_var_len" name="min_variable_length" v-model="$data.min_variable_length"/>
                    -
                    <input type="text" id="text_max_varlen" name="max_variable_length" v-model="$data.max_variable_length"/>
                </td>
            </tr>
            <tr class="row">
                <th>Head Sequence: Forward Primer (5' to 3')</th>
                <td><input type="text" id="text_head_prim" name="head_primer" v-model="$data.head_primer"/></td>
            </tr>
            <tr class="row">
                <th>Maximum Head Sequence Error</th>
                <td><input type="text" id="text_max_head_err" name="number_of_head_primer_errors" v-model="$data.number_of_head_primer_errors"/></td>
            </tr>
            <tr class="row">
                <th>Tail Sequence: Complementary of Reverse Primer (5' to 3')</th>
                <td><input type="text" id="text_tail_prim" name="tail_primer" v-model="$data.tail_primer"/></td>
            </tr>
            <tr class="row">
                <th>Maximum Tail Sequence Error</th>
                <td><input type="text" id="text_max_tail_err" name="number_of_tail_primer_errors" v-model="$data.number_of_tail_primer_errors"/></td>
            </tr>
        </table>

        <hr/>

        <h5>Clustering Settings:</h5>
        <table class="settings">
            <tr class="row">
                <th>Similarity Criteria</th>
                <td><input type="text" id="text_sim_cri" name="clustering_criteria" v-model="$data.clustering_criteria"/></td>
            </tr>
            <tr class="row">
                <th>Cluster Size Criteria</th>
                <td><input type="text" id="text_siz_cri" name="min_cluster_size" v-model="$data.min_cluster_size"/></td>
            </tr>
            <tr class="row">
                <th>Cluster Complementary Sequences</th>
                <td><input type="checkbox" id="check_clus_comp" sname="cluster_complementary_sequences" v-model="$data.cluster_complementary_sequences"/></td>
            </tr>
        </table>
        <div v-if="hasLicense">
            <hr/>
            <h5>Mail Notification Settings:</h5>
            <table class="settings">
                <tr class="row">
                    <th>Mail Address</th>
                    <td><input type="text" id="text_mail_add" name="mail_address" v-model="$data.mail_address"/></td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script>
    const { ipcRenderer } = window.require('electron');
    const path = window.require('path');
    export default {
        name: 'ConfigView',
        props: {
            hasLicense: Boolean,
            config: Object,
            presets: Object,
        },
        data() {
            return {
                preset_name: '',
                quality_criteria: this.config.quality_criteria,
                number_of_low_quality_elements: this.config.number_of_low_quality_elements,
                min_variable_length: this.config.min_variable_length,
                max_variable_length: this.config.max_variable_length,
                head_primer: this.config.head_primer,
                number_of_head_primer_errors: this.config.number_of_head_primer_errors,
                tail_primer: this.config.tail_primer,
                number_of_tail_primer_errors: this.config.number_of_tail_primer_errors,
                clustering_criteria: this.config.clustering_criteria,
                min_cluster_size: this.config.min_cluster_size,
                selected_preset: '',
                mail_address: this.config.mail_address,
                cluster_complementary_sequences: this.config.cluster_complementary_sequences,
                single_or_paired: this.config.single_or_paired,
            }
        },
        computed: {
            _config() {
                return {
                    quality_criteria: parseInt(this.$data.quality_criteria),
                    number_of_low_quality_elements: parseInt(this.$data.number_of_low_quality_elements),
                    min_variable_length: parseInt(this.$data.min_variable_length),
                    max_variable_length: parseInt(this.$data.max_variable_length),
                    head_primer: this.$data.head_primer,
                    number_of_head_primer_errors: parseInt(this.$data.number_of_head_primer_errors),
                    tail_primer: this.$data.tail_primer,
                    number_of_tail_primer_errors: parseInt(this.$data.number_of_tail_primer_errors),
                    clustering_criteria: parseInt(this.$data.clustering_criteria),
                    min_cluster_size: parseInt(this.$data.min_cluster_size),
                    cluster_complementary_sequences:this.$data.cluster_complementary_sequences,
                    single_or_paired:this.$data.single_or_paired,
                    mail_address: this.$data.mail_address
                }
            }
        },
        watch: {
            _config: {
                handler: function (val) {
                    this.$emit('configChanged', val);
                },
                deep: true,
            }
        },
        destroyed: function(){
          ipcRenderer.removeAllListeners('addFastqFiles');
          ipcRenderer.removeAllListeners('set-etf');
        },
        mounted: function(){
            let that = this;
            
            that.fastqList = new Array();
            that.fastqList.push({"file1":"","file2":""});
            ipcRenderer.on('addFastqFiles', (event,args) => {
                that.addFastqInList(args["fastq_list"],args["start_pos"],args["file_label"],args["overwrite"]);
            });

            ipcRenderer.on('set-etf', (event,arg) => {
                document.getElementById("span_finish_time").innerHTML = arg;
            });

            that.loadDefaultPreset();
        },
        methods: {
            estimateFinishTime:function(){
                ipcRenderer.send('estimate-finish-time',[this.config]);
            },
            removeFastqDDEvent:function(target){
                target.removeEventListener();
            },
            createFastqInstance:function(f1,f2){
                return {"file1":f1,"file2":f2};
            },
            getSingleOrPaired:function(){
                //this.$data.single_or_paired だけでいいかもしれない
                return this.$data.single_or_paired;
            },
            showAddDatasetDialog:function(startpos,filelabel,allowmulti,overwrite){
                ipcRenderer.send('show-add-dataset-dialog',{"start_pos":startpos,"file_label":filelabel,"allow_multi":allowmulti,"overwrite":overwrite});//本体の方のリストを更新
            },
            addFastqDDEvent:function(target){
                
                //Fastq のファイル名が表示されるコンポーネントにイベントを登録する
                let that = this;
                target.addEventListener("dragover", function(event) {
                    target.style["border-color"] = "darkblue";
                    event.preventDefault();
                }, false);
                target.addEventListener("dragenter", function(event) {
                    event.preventDefault();
                    that.addBorder(event);
                }, false);
                target.addEventListener("dragleave", function(event) {
                    target.style["border-color"] = "white";
                    event.preventDefault();
                    that.removeBorder(event);
                }, false);
                target.addEventListener("click", function(event) {
                    event.preventDefault();
                    let pfilelabel = event.target.filelabel;
                    let startpos = event.target.fastqid;
                    //クリックされた項目に何もファイルが設定されていない場合は複数選択挿入モード
                    that.showAddDatasetDialog(startpos,pfilelabel,true,false);
                },false);
                target.addEventListener("drop", function(event) {
                    target.style["border-color"] = "white";
                    event.preventDefault();

                    //http://sagatto.com/20180831_file_upload_at_drag_and_drop_by_vue
                    let fileList = event.target.files ? event.target.files : event.dataTransfer.files;
                    if(fileList && fileList.length > 0){
                        let files    = [];
                        for(let i = 0; i < fileList.length; i++){
                            files.push(fileList[i].path);
                        }
                        
                        let pfilelabel = event.target.filelabel;
                        let startpos = event.target.fastqid;
                        that.addFastqInList(files,startpos,pfilelabel,false);
                    }else{
                        let pfilelabel = event.target.filelabel;
                        let startpos = event.target.fastqid;
                        that.fastqDrop(event,startpos+";"+pfilelabel);
                    }
                }, false);
            },
            checkFastqName(filename1,filename2){
                let slen = Math.min(filename1.length,filename2.length);
                let lastmatch = -1;
                for(let ii = 0;ii < slen;ii++){
                    if(filename1.charAt(ii) == filename2.charAt(ii)){
                        lastmatch = ii;
                    }else{
                        break;
                    }
                }
                let f1 = filename1.substring(0,lastmatch+1);
                let r1 = filename1.substring(lastmatch+1);
                let f2 = filename2.substring(0,lastmatch+1);
                let r2 = filename2.substring(lastmatch+1);
                let retname1 = filename1;
                let retname2 = filename2;

                let reg1 = RegExp('^R?1\\.(fastq|fq)(.gz)?$');
                let reg2 = RegExp('^R?2\\.(fastq|fq)(.gz)?$');
                if(reg1.test(r1) && reg2.test(r2)){
                    return [filename1,filename2];
                }
                if(r1.length > 0){
                    retname1 = f1+"<span style=\"color:red\">"+r1+"</span>";
                }else{
                    retname1 = "<span style=\"color:red\">"+filename1+"</span>";
                }
                if(r2.length > 0){
                    retname2 = f2+"<span style=\"color:red\">"+r2+"</span>";
                }else{
                    retname2 = "<span style=\"color:red\">"+filename2+"</span>";
                }
                return [retname1,retname2];

            },
            fastqDragStart(event){
                event.dataTransfer.setData("text", event.target.positionInList);
            },
            fastqDragOver(event){
                event.preventDefault();
            },
            fastqDrop(event,targetpos){
                //event.dataTransfer.getData("text") 内の文字列および targetpos が
                //<List 内 インデクス>;<file1 もしくは file2>
                //となっている必要がある
                let positionTag_start = event.dataTransfer.getData("text");
                let positionTag_end = targetpos;//drop は イベントを設定した要素以外が Target に入ることがある？？
                let pps = positionTag_start.split(";");
                let ppe = positionTag_end.split(";");
                let fid_s = parseInt(pps[0]);
                let fid_e = parseInt(ppe[0]);

                let that = this;
                let dsname = that.fastqList[fid_s][pps[1]];
                that.fastqList[fid_s][pps[1]] = "";
                if(that.fastqList[fid_e][ppe[1]].length > 0){
                    let insertpos = -1;
                    if(fid_e < fid_s){
                        insertpos = fid_e;
                    }else{
                        insertpos = fid_e+1;
                    }
                    that.fastqList.splice(insertpos, 0,{"file1":"","file2":""});
                    that.fastqList[insertpos][ppe[1]] = dsname;
                }else{
                    that.fastqList[fid_e][ppe[1]] = dsname;
                }
                that.validateFastqList();
            },
            shortenFilePath(filepath){
                let ret = filepath;
                if(filepath.length > 100){
                    let dirr = path.dirname(filepath);
                    let basee = path.basename(filepath);
                    if(basee.length > 95){
                        ret = ".../"+basee;
                    }else{
                        if(100-4-basee.length >= basee.length){
                            ret = filepath;
                        }else{
                            ret = dirr.substring(0,100-4-basee.length)+".../"+basee;
                        }
                    }
                }
                return ret;
            },
            genFastqComponent:function(innertext,fid,filelabel){
                let that = this;
                let parentdiv = document.createElement("div");
                parentdiv.draggable = "true";
                parentdiv.positionInList = fid+";"+filelabel;
                parentdiv.addEventListener("dragover",function(e){
                    e.preventDefault();
                });
                parentdiv.addEventListener("dragstart",function(e){
                    that.fastqDragStart(e);
                });
                parentdiv.addEventListener("drop",function(e){
                    e.preventDefault();
                    that.fastqDrop(e,parentdiv.positionInList);
                });

                parentdiv.className = "FastqBox";
                let filename =  document.createElement("span");
                filename.addEventListener("click", function(event) {
                    event.preventDefault();
                    let pfilelabel = filelabel;
                    let startpos = fid;
                    //単数選択上書きモード
                    that.showAddDatasetDialog(startpos,pfilelabel,false,true);
                },false);
                filename.style["width"] = "200px";
                filename.style["padding"] = "0px";
                if(innertext.indexOf("<") == -1){
                    filename.innerHTML = that.shortenFilePath(innertext);
                }else{
                    filename.innerHTML = innertext;
                }
                filename.style["cursor"] = "pointer";

                let removebutton =  document.createElement("span");
                removebutton.innerHTML ="remove";
                removebutton.style["width"] = "64px";
                removebutton.style["cursor"] = "pointer";
                removebutton.style["padding-left"] = "1px";
                removebutton.style["padding-right"] = "1px";
                removebutton.style["margin-left"] = "15px";
                removebutton.style["border"] = "solid 1px #000000";
                removebutton.style["background-color"] = "lightgray";
                
                removebutton.addEventListener("click",function(){
                    that.fastqList[fid][filelabel] = "";
                    if(that.fastqList[fid]["file1"].length == 0 && that.fastqList[fid]["file2"].length == 0){
                        that.fastqList.splice(fid,1);
                    }
                    that.validateFastqList();
                });

                parentdiv.appendChild(filename);
                parentdiv.appendChild(removebutton);
                parentdiv.fastqid = fid;

                return parentdiv;
            },
            genDDComponent:function(fid,filelabel){
                let filefield = document.createElement("div");
                filefield.className = "DDBox";
                this.addFastqDDEvent(filefield);
                filefield.innerHTML="Drag & Drop file(s) here.";
                filefield.fastqid = fid;
                filefield.filelabel = filelabel;
                return filefield;
            },
            validateFastqList:function(){
                //コストは小さいと思うのでコンポーネントも毎回全部作り直す。
                let that = this;
                let pparent=document.getElementById("fastq_list_div");
                pparent.innerHTML = "";
                if(that.getSingleOrPaired() == "single" || that.getSingleOrPaired() == "interleaved_paired"){
                    for(let ii = 0;ii < that.fastqList.length;ii++){
                        that.fastqList[ii]["file2"] = "";
                    }
                }

                let updated = true;
                while(updated){
                    updated = false;
                    for(let ii = 0;ii < that.fastqList.length-1;ii++){
                        if(that.fastqList[ii]["file1"] == "" && that.fastqList[ii]["file2"] == ""){
                            that.fastqList.splice(ii,1);
                            updated = true;
                            break;
                        }
                    }
                }
                if(that.fastqList.length == 0){
                    that.fastqList.push({"file1":"","file2":""});
                }
                if(that.fastqList[that.fastqList.length-1]["file1"].length != 0
                    ||that.fastqList[that.fastqList.length-1]["file2"].length != 0){
                    that.fastqList.push({"file1":"","file2":""});
                }


                ipcRenderer.send('set-fastq',[that.fastqList]);//本体の方のリストを更新

                if(that.getSingleOrPaired() == "paired"){
                    for(let ii = 0;ii < that.fastqList.length;ii++){
                        let pchild = document.createElement("div");
                        
                        if(ii != that.fastqList.length -1){
                            pchild.style["margin-bottom"] = "5px";
                        }

                        //ペアになるファイルの名前が怪しい場合に色を付ける
                        let fnames = that.checkFastqName(that.fastqList[ii]["file1"],that.fastqList[ii]["file2"]);
                        if(that.fastqList[ii]["file1"].length == 0){
                            let fcon = that.genDDComponent(ii,"file1");
                            pchild.appendChild(fcon);
                        }else{
                            let fcon = that.genFastqComponent(fnames[0],ii,"file1");
                            fcon.fastqid = ii;
                            pchild.appendChild(fcon);
                        }
                        
                        if(that.fastqList[ii]["file2"].length == 0){
                            let fcon = that.genDDComponent(ii,"file2");
                            fcon.style["margin-left"] = "25px";
                            pchild.appendChild(fcon);
                        }else{
                            let fcon = that.genFastqComponent("┗ rev: "+fnames[1],ii,"file2");

                            fcon.style["margin-left"] = "25px";
                            pchild.appendChild(fcon);
                        }
                        
                        pparent.appendChild(pchild);
                    }
                }else{
                    for(let ii = 0;ii < that.fastqList.length;ii++){
                        if(that.fastqList[ii]["file1"].length == 0){
                            let fcon = that.genDDComponent(ii,"file1");
                            pparent.appendChild(fcon);
                        }else{
                            let fcon = that.genFastqComponent(that.fastqList[ii]["file1"],ii,"file1");
                            pparent.appendChild(fcon);
                        }
                    }
                }
            },

            addFastqInList:function(files,startpos,pfilelabel,overwrite){
                let that = this;
                
                if(files.length == 0){
                    return;
                }
                let labels = ["file1"];
                
                if(this.getSingleOrPaired() == "paired"){
                    labels.push("file2");
                }

                outer:for(let ii = startpos;ii < that.fastqList.length;ii++){
                    for(let ll = 0;ll < labels.length;ll++){
                        let plab = labels[ll];
                        if(ii == startpos && pfilelabel == "file2" && plab == "file1"){
                            continue;
                        }
                        if((!overwrite) && that.fastqList[ii][plab] !== ""){
                            continue;
                        }
                        that.fastqList[ii][plab] = files.shift();
                        if(files.length == 0){
                            break outer;
                        }
                    }
                }

                outer:while(files.length > 0){
                    let pfas = that.createFastqInstance("","");
                    that.fastqList.push(pfas);
                    for(let ll = 0;ll < labels.length;ll++){
                        let plab = labels[ll];
                        pfas[plab] = files.shift();
                        if(files.length == 0){
                            break outer;
                        }
                    }
                }
                //最後の項目に値があったら新しい項目を追加する
                if(that.fastqList[that.fastqList.length-1]["file1"] != "" 
                || that.fastqList[that.fastqList.length-1]["file2"] != "" ){
                    let pfas = that.createFastqInstance("","");
                    that.fastqList.push(pfas);
                }

                that.validateFastqList();
            },

            addBorder:function(e){
                e.target.style.border = "dashed 3px #0033aa";
            },
            removeBorder:function(e){
                e.target.style.border =  "solid 3px #ffffff";
            },
            onLoadPresets: function () {
                let preset = this.presets[this.selected_preset];
                if(!preset){
                    this.validateFastqList();
                    return;
                }
                this.preset_name = this.selected_preset;
                
                //新パラメータ
                if(!("cluster_complementary_sequences" in preset)){
                    this["cluster_complementary_sequences"] = false;
                }
                if(!("single_or_paired" in preset)){
                    this["single_or_paired"] = "single";
                }

                for (let key in preset) {
                    this[key] = preset[key];
                }

                this.$emit('configChanged', this._config);
                this.validateFastqList();
            },

            onRemovePreset: function () {
                //remove 後はリストから selected_preset が消えるので、挙動について確証が持てない。
                //とりあえず今のところは remove 直後の selected_preset は remove された preset の名前になっている。
                //同じ名前を Save As Preset すると、表示領域に直ちに現れる。
                //つまりコンボボックスは selected_preset を選択しているつもりになっている。
                //仕様が変わるとエラーになるかもしれない。
                ipcRenderer.send('removePreset', [this.selected_preset]);
            },

            loadDefaultPreset: function () {
                let that = this;
                if("default" in that.presets){
                    that.selected_preset = "default";
                    that.onLoadPresets();
                }else if("" in that.presets){
                    that.selected_preset = "";
                    that.onLoadPresets();
                }else{
                    that.validateFastqList();
                }
            },
            onSavePreset: function () {
                ipcRenderer.send('savePreset', [this.preset_name, this._config]);
            },
            
        }
    }
</script>
<style>

    div.DDBox{
        border-style: dashed;
        border-color:white;
        background-color:#a0d0ff;
        font-size:16px;
        cursor:pointer;
        padding-left:20px;
    }
    div.FastqBox{
        border-style: solid;
        border-color:white;
        border-width:3px;
        justify-content: center;
        font-size:16px;
        background-color:white;
    }

</style>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

    div.ConfigView {
        margin: 30px;
    }

    div.preset * {
        margin: 10px;
    }

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

    .preset-selection {
        margin: 30px;
    }

    table.settings {
        margin-left: 30px;
    }

    table.settings th {
        text-align: left;
        width: 400px;
    }
</style>
