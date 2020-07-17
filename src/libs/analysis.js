const sqlite3 = require('sqlite3').verbose();
const exec = require('child_process').exec
var path = require('path');
var fs = require('fs');
var readline = require('readline');
var async = require('async');
var temp = require('temp');
const zlib     = require('zlib');
const { Exception } = require('handlebars');

const MERGER_CMD = '/tools/flash2';
const MERGER_ARGS = ' -z --allow-outies --max-overlap 1000 ';
//const FILTER_CMD = '/tools/filter';
const FILTER_CMD = '/tools/filter_gz';
const CLUSTER_CMD = '/tools/cd-hit-est';
const CLUSTER_ARGS = ' -g 1 -G 0 -aS 0.8 -aL 0.8 -A 0.8 -n 5 -M 4096 -T 0 ';//ToDo: T(hreads) は設定できるようにする
const VENN_CMD = '/tools/venn';

temp.track();

var logger = null;

function recordLog(message) {
    if (logger) {
        logger.info(message);
    }

    console.log(message);
}

var dateFormat = {
    _fmt : {
        hh: function(date) { return ('0' + date.getHours()).slice(-2); },
        h: function(date) { return date.getHours(); },
        mm: function(date) { return ('0' + date.getMinutes()).slice(-2); },
        m: function(date) { return date.getMinutes(); },
        ss: function(date) { return ('0' + date.getSeconds()).slice(-2); },
        dd: function(date) { return ('0' + date.getDate()).slice(-2); },
        d: function(date) { return date.getDate(); },
        s: function(date) { return date.getSeconds(); },
        yyyy: function(date) { return date.getFullYear() + ''; },
        yy: function(date) { return date.getYear() + ''; },
        t: function(date) { return date.getDate()<=3 ? ["st", "nd", "rd"][date.getDate()-1]: 'th'; },
        w: function(date) {return ["Sun", "$on", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]; },
        MMMM: function(date) { return ["January", "February", "$arch", "April", "$ay", "June", "July", "August", "September", "October", "November", "December"][date.getMonth()]; },
        MMM: function(date) {return ["Jan", "Feb", "$ar", "Apr", "$ay", "Jun", "Jly", "Aug", "Spt", "Oct", "Nov", "Dec"][date.getMonth()]; },
        MM: function(date) { return ('0' + (date.getMonth() + 1)).slice(-2); },
        M: function(date) { return date.getMonth() + 1; },
        $: function(date) {return 'M';}
    },
    _priority : ["hh", "h", "mm", "m", "ss", "dd", "d", "s", "yyyy", "yy", "t", "w", "MMMM", "MMM", "MM", "M", "$"],
    format: function(date, format){return this._priority.reduce((res, fmt) => res.replace(fmt, this._fmt[fmt](date)), format)}
}

class Notifier {

    apiKey = null;
    domain = null;
    mailAddress = null;
    isActive = false;

    setConfigs(apiKey, domain) {
        this.apiKey = apiKey;
        this.domain = domain;
    }

    activate(){
        isActive = true;
    }

    setAddress(mailAddress) {
        this.mailAddress = mailAddress;
    }

    send(error) {
        if (this.apiKey == null || this.domain == null) {
            return true;
        }
        if (this.mailAddress == null) {
            return true;
        }

        if (error == null) {
            this.sendImpl('aptamCORE: Analysis Finished', 'Your analysis was successfully finished.');
        } else {
            this.sendImpl('aptamCORE: Analysis Error', 'Your analysis failed because of the following reason:\n' + error);
        }
    }

    sendImpl(subject, text) {
        let data = {
            from: 'aptamCORE <info@sequence-analyzer.lifematics.co.jp>',
            to: this.mailAddress ,
            subject: subject,
            text: text,
        }
        const mailgun = require('mailgun-js')({apiKey: this.apiKey, domain: this.domain});
        mailgun.messages().send(data, function (error, body) {
            console.log(body);
        });
    }
}

class Analysis {

    constructor(base) {
        recordLog('base is ' + base);
        this.base = base;
        this.numEntries = {};
        this.path = null;
        this.db = null;
        this.tempDir = null;
        this.notifier = new Notifier();
        this.statisticDataRecorder = null;
        this.appPreferences = null;
    }
    
    setStatisticDataRecorder(rec){
        this.statisticDataRecorder = rec;
    }

    setNotificationSettings(apiKey, domain) {
        this.notifier.setConfigs(apiKey, domain);
    }

    setPreferences(pref){
        this.appPreferences = pref;
    }

    create(path, callback) {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
        }

        const self = this;
        let db = new sqlite3.Database(path);
        db.serialize(() => {
            db.run("CREATE TABLE configs (quality_criteria INTEGER, number_of_low_quality_elements INTEGER, " +
                " min_variable_length INTEGER, max_variable_length INTEGER, " +
                " head_primer TEXT, number_of_head_primer_errors INTEGER," +
                " tail_primer TEXT, number_of_tail_primer_errors INTEGER," +
                " clustering_criteria INTEGER, min_cluster_size, created DATETIME,"+
                " analyzed DATETIME, "+
                " single_or_paired TEXT, cluster_complementary_sequences INTEGER"+
                ")", (error) => {
                if (error) {
                    self.notifier.send(error);
                    throw error;
                } else {
                    db.run("INSERT INTO configs (" +
                        " quality_criteria, number_of_low_quality_elements, " +
                        " min_variable_length, max_variable_length, " +
                        " head_primer, number_of_head_primer_errors, " +
                        " tail_primer, number_of_tail_primer_errors, " +
                        " clustering_criteria, min_cluster_size, " +
                        " created,"+
                        " single_or_paired,"+
                        " cluster_complementary_sequences"+
                        ") VALUES (15, 5, 0, 100, 'ATGCATGC', 5, 'GGACGGAC', 5, 90, 2, 'now()','single',0)", (error) => {
                        if (error) {
                            self.notifier.send(error);
                            throw error;
                        }
                    });
                }
            });

            db.run("CREATE TABLE fastqfiles (" +
                " id INTEGER PRIMARY KEY, " +
                " file1 TEXT, " +
                " file2 TEXT, " +
                " cycle_no INTEGER, "+
                " target_file TEXT " +
                ");", (error) => {
                   if (error) {
                        self.notifier.send(error);
                        throw error;
                   }
            }); 

            db.run("CREATE TABLE datasets (" +
                " id INTEGER PRIMARY KEY, " +
                " name TEXT, " +
                " path TEXT, " +
                " cycle_no INTEGER," +
                " processed_sequences INTEGER, " +
                " rejected_sequences INTEGER, " +
                " accepted_sequences INTEGER, " +
                " accepted_clusters INTEGER, " +
                " accepted_cluster_sequences INTEGER, " +
                " rejected_clusters INTEGER, " +
                " rejected_cluster_sequences INTEGER, " +
                " begin_datetime INTEGER, " +
                " end_datetime INTEGER " +
                " );", (error) => {
                    if (error) {
                        self.notifier.send(error);
                        throw error;
                    }
                });

            db.run("CREATE TABLE merger_results (" +
            " id INTEGER PRIMARY KEY, " +
            " source_file1 TEXT, " +
            " source_file2 TEXT, " +
            " merged_file TEXT, " +
            " num_merged_reads INTEGER," +
            " num_not_merged_reads1 INTEGER, " +
            " num_not_merged_reads2 INTEGER " +
            " );", (error) => {
               if (error) {
                    self.notifier.send(error);
                    throw error;
               }
            });

            db.run("CREATE TABLE clusters (id INTEGER PRIMARY KEY, name TEXT, dataset_id INTEGER, sequence TEXT, count INTEGER, a_ratio REAL, c_ratio REAL, g_ratio REAL, t_ratio REAL)", (error) => {
                if (error) {
                    self.notifier.send(error);
                    throw error;
                }
            });
            //シーケンスのテーブルにACTGの割合を表示するコラムを追加
            db.run("CREATE TABLE sequences (id INTEGER PRIMARY KEY, name TEXT, dataset_id INTEGER, cluster_id INTEGER, sequence TEXT, count INTEGER, a_ratio REAL, c_ratio REAL, g_ratio REAL, t_ratio REAL)", (error) => {
                if (error) {
                    self.notifier.send(error);
                    throw error;
                }
                db.close(function(err) {
                    self.setPath(path, callback);
                });
            });
        })
    }

    setPath(filepath, callback) {
        let self = this;
        if (filepath == null) {
            this.path = null;
            this.db = null;
            callback(null);
        } else {
            this.path = filepath;
            this.db = new sqlite3.Database(this.path);
            this.db.get("SELECT * FROM configs", function(error, row) {
                if(row["cluster_complementary_sequences"] === 0){
                    row["cluster_complementary_sequences"] = false;
                }else if(row["cluster_complementary_sequences"] === 1){
                    row["cluster_complementary_sequences"] = true;
                }

                if (error) {
                    self.notifier.send(error);
                    throw error;
                } else {
                    callback(row);
                }
            });
        }
    }

    getPath() {
        return this.path;
    }

    makeTempDir() {
        let pathInfo = path.parse(this.path);
        let now = new Date();
        now.setTime(Date.now());
        this.tempDir = path.join(pathInfo['dir'], pathInfo['base'] + '-' + dateFormat.format(now, 'yyyyMMddhhmmss'))
        fs.mkdirSync(this.tempDir);
    }

    contFastqReads(filename,callback){
        let that = this;
        let count = 0;
        const gzcheck = RegExp('\\.gz$');
        if(gzcheck.test(filename)){
            //下のコピペ。もっときれいな書き方があるかも
            fs.createReadStream(filename).pipe(zlib.createGunzip()).on('data', function(chunk) {
                for (let i=0; i < chunk.length; ++i){
                    if (chunk[i] == 10){ 
                        count++;
                    }
                }
            }).on('end', function() {
                if(count%4 != 0){
                    recordLog("WARNING: Number of lines in "+filename+" is not a multiple of 4. "+count.toString()+"\n Possibly the file is truncated.");
                }
                that.numEntries[filename] = Math.floor(count/4+0.00001);
                callback();
            });
        }else{
            fs.createReadStream(filename).on('data', function(chunk) {
                for (let i=0; i < chunk.length; ++i){
                    if (chunk[i] == 10){ 
                        count++;
                    }
                }
            }).on('end', function() {
                if(count%4 != 0){
                    recordLog("WARNING: Number of lines in "+filename+" is not a multiple of 4. "+count.toString()+"\n Possibly the file is truncated.");
                }
                that.numEntries[filename] = Math.floor(count/4+0.00001);
                callback();
            });
        }
    }

    addFastqToDB(config,filepathlist,index,callback,callback2){
        if(index >= filepathlist.length){
            callback2();
            return;
        }

        let self = this;
        let filepath = filepathlist[index];
        if(filepath["file1"].length + filepath["file2"].length == 0){
            if(index != filepathlist.length -1){
                recordLog("Empty dict is found. This is a bug in the code.");
                //中間に空要素があるのは許容しない
                throw "Empty dict is found. This is a bug in the code.";
            }
            callback2();
            return;
        }
        if(config.single_or_paired == "paired"){
            if(filepath["file1"].length == 0 || filepath["file2"].length == 0){
                recordLog("Please provide 2 files for each cycle.\n");
                throw "Please define 2 files for each cycle.\n";
            }
        }else if(config.single_or_paired == "single" || config.single_or_paired == "interleaved-paired"){
            if(filepath["file1"].length == 0 || filepath["file2"].length != 0){
                recordLog("Single End or Interleaved-Paired End mode accept only one file for each cycle. file1:"+filepath["file1"]+" \nfile2:"+filepath["file2"]+" \n");
                throw "Single End or Interleaved-Paired End mode accept only one file for each cycle. file1:"+filepath["file1"]+" \nfile2:"+filepath["file2"]+" \n";
            }
        }

        if(config.single_or_paired == "single"){
            let name = path.parse(filepath["file1"]).base;
            this.db.serialize(function() {
                self.db.get("SELECT COUNT(*) AS count FROM fastqfiles", function (error,row) {
                    if (error) {
                        self.notifier.send(error);
                        throw error;
                    }
                    self.db.run("INSERT INTO fastqfiles(file1,file2, cycle_no,target_file) VALUES (?, ?, ?, ?)",
                     [filepath["file1"],"", index,filepath["file1"]], function (error) {
                        self.db.run("INSERT INTO datasets(name, path, cycle_no) VALUES (?, ?, ?)", [name, filepath["file1"], index+1], function (error) {
                            callback(config,filepathlist,index+1,callback,callback2);
                        });
                    });
                });
            });
        }else{
            let name = path.parse(filepath["file1"]).base.replace(/(_R?1)?(\.fq|\.fastq)(.gz)?$/, '')+".merged";
            let outprefix = name+".flash2";
            const self = this;
            this.db.serialize(function() {
                self.db.get("SELECT COUNT(*) AS count FROM fastqfiles", function (error, row) {
                    if (error) {
                        self.notifier.send(error);
                        throw error;
                    }
                    let merged_output = path.join(self.tempDir,outprefix+".extendedFrags.fastq.gz");
                    let notcombined1 = path.join(self.tempDir,outprefix+".notCombined_1.fastq.gz");
                    let notcombined2 = path.join(self.tempDir,outprefix+".notCombined_2.fastq.gz");
                    let f2file = "";
                    if(config.single_or_paired == "paired"){
                        f2file = filepath["file2"];
                        recordLog(filepath["file1"]+" and "+filepath["file2"]+" will become "+merged_output);
                    }else{
                        f2file = "--interleaved";
                        recordLog(filepath["file1"]+" will become "+merged_output);
                    }
                    //これどうにかならないだろうか。。。
                    self.db.run("INSERT INTO fastqfiles(file1,file2, cycle_no,target_file) VALUES (?, ?, ?, ?)",
                     [filepath["file1"],f2file,merged_output], function (error) {
                        if (error) {
                            self.notifier.send(error);
                            throw error;
                        }
                        self.mergeReads(config,filepath["file1"],f2file,self.tempDir,outprefix,function(){
                            self.contFastqReads(merged_output,
                                function(){
                                    self.contFastqReads(notcombined1,
                                        function(){
                                           self.contFastqReads(notcombined2,
                                                function(){  
                                                    self.db.run("INSERT INTO merger_results(source_file1,source_file2,merged_file,num_merged_reads,num_not_merged_reads1,num_not_merged_reads2) VALUES (?, ?, ?, ?, ?, ?)", [
                                                        filepath["file1"],f2file,merged_output,
                                                        self.numEntries[merged_output],
                                                        self.numEntries[notcombined1],
                                                        self.numEntries[notcombined2]
                                                    ], function (error) {
                                                            if (error) {
                                                                self.notifier.send(error);
                                                                throw error;
                                                            }
                                                            self.db.run("INSERT INTO datasets(name, path, cycle_no) VALUES (?, ?, ?)"
                                                                , [name, merged_output, index+1]
                                                                , function (error) {
                                                                        if (error) {
                                                                            self.notifier.send(error);
                                                                            throw error;
                                                                        }
                                                                        callback(config,filepathlist,index+1,callback,callback2);
                                                                }
                                                            );
                                                        }
                                                    );
                                                }
                                           );
                                        }
                                    );
                                }
                            );
                        });
                    });
                });
            });
        }
    }

    addDataset_deprecated(filepath, callback) {
        let name = path.parse(filepath).base;
        const self = this;
        this.db.serialize(function() {
            self.db.get("SELECT COUNT(*) AS count FROM datasets", function (error, row) {
                if (error) {
                    self.notifier.send(error);
                    throw error;
                }
                self.db.run("INSERT INTO datasets(name, path, cycle_no) VALUES (?, ?, ?)", [name, filepath, row.count + 1], function (error) {
                    callback(this.lastID);
                });
            });
        });
    }

    mergeReads(config,input1,input2,tmpdir,outfileprefix, callback) {
        let command = "";
        if(config.single_or_paired == "paired"){
            command = '"'+this.base + MERGER_CMD +'" '+MERGER_ARGS+' '+ ' -d "'+tmpdir+ '" -o "'+outfileprefix+'" "'+input1+'" "'+input2+'"';
        }else if(config.single_or_paired == "interleaved_paired"){
            command = '"'+this.base + MERGER_CMD +'" '+MERGER_ARGS+' '+ ' -d "'+tmpdir+ '" --interleaved-input -o "'+outfileprefix+'" "'+input1+'"';
        }else{
            recordLog(config.single_or_paired+" is not a valid option.");
            throw config.single_or_paired+" is not a valid option.";
        }
        recordLog(command);
        let self = this;
        exec(command, function(error, stdout, stderr) {
            recordLog(stdout);
            recordLog(stderr);
            if (error) {
                self.notifier.send(error);
                throw error;
            }
            callback();
        });
    }

    filterSequences(config, input, callback) {
        let self = this;
        let full = path.join(this.tempDir, path.basename(input) + '.filtered.full.fasta');
        let variable = path.join(this.tempDir, path.basename(input) + '.filtered.variable.fasta');
        let command = '"'+this.base + FILTER_CMD + '" '
            + ' --input "' + input + '" --full "' + full + '" --variable "' + variable + '"'
            + ' --quality ' + config.quality_criteria + ' --criteria ' + config.number_of_low_quality_elements
            + ' --min ' + config.min_variable_length + ' --max ' + config.max_variable_length
            + ' --head "' + config.head_primer + '" --herror ' + config.number_of_head_primer_errors
            + ' --tail "' + config.tail_primer + '" --terror ' + config.number_of_tail_primer_errors;
        recordLog(command)
        exec(command, function(error, stdout, stderr) {
            recordLog(stderr);
            if (error) {
                self.notifier.send(error);
                throw error;
            }
            callback(full, variable, stdout);
        });
    }

    clusterSequences(config, input, callback) {
        let clusters = input + '.clusters';
        //let command =  this.base +  CLUSTER_CMD + ' -L/usr/local/Cellar/gcc@6/6.5.0_4/lib/gcc/6' + ' ' + CLUSTER_ARGS
        let command =  '"'+this.base +  CLUSTER_CMD + '" ' + CLUSTER_ARGS
            + ' -i ' + input + ' -o ' + clusters
            + ' -c ' + (config.clustering_criteria / 100.0);
        if(config.cluster_complementary_sequences){
            command = command + " -r 1 ";
        }else{
            command = command + " -r 0 ";
        }
        recordLog(command)

        const self = this;
        exec(command, function(error, stdout, stderr) {
            recordLog(stdout);
            recordLog(stderr);
            if (error != null) {　//cd-hit実行のエラー情報確認用
                self.notifier.send(error);
                throw error;                
            }
            callback(clusters, clusters + '.clstr');
        });
    }

    static sortByCount(list) {
        list.sort(function(lhs, rhs) {
            if (lhs.count > rhs.count) {
                return -1;
            } else if (lhs.count < rhs.count) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    static parseSequenceName(name) {
        let items = name.split(':');
        let seqName = items.slice(3).join(':');
        return {variableId: items[0], variableIndex: items[1], count: parseInt(items[2]), name: seqName};
    }

    static parseVariableSequenceName(name) {
        let items = name.split(':');
        let seqName = items.slice(2).join(':');
        return {variableId: items[0], count: parseInt(items[1]), name: seqName};
    }

    static findSequenceName(line) {
        let items = line.split(' >');
        items = items[1].split('...');
        return items[0];
    }

    loadSequences(sequences, callback) {
        let lineReader = readline.createInterface({
            input: fs.createReadStream(sequences)
        });

        const self = this;
        let info = null;
        let seqList = [];
        let sequenceList = {};
        lineReader.on('line', function(line) {
            if (info == null || line[0] == '>') {
                if (seqList.length > 0) {
                    let variableId = info['variableId'];
                    let variableIndex = info['variableIndex'];
                    if (sequenceList[variableId] == null) {
                        sequenceList[variableId] = {};
                    }
                    sequenceList[variableId][variableIndex] = {
                    variableId: info['variableId']
                    , variableIndex: info['variableIndex']
                    , name: info['name']
                    , sequence: seqList
                    , count: info['count'] };
                    seqList = [];
                }
                info = Analysis.parseSequenceName(line.substr(1));
            } else {
                seqList.push(line);
            }
        }).on('close',  function() {
            if (seqList.length > 0) {
                let variableId = info['variableId'];
                let variableIndex = info['variableIndex'];
                if (sequenceList[variableId] == null) {
                    sequenceList[variableId] = {};
                }
                sequenceList[variableId][variableIndex] = {
                variableId: info['variableId']
                , variableIndex: info['variableIndex']
                , name: info['name']
                , sequence: seqList
                , count: info['count'] };
                seqList = [];
            }
            callback(sequenceList);
        });
    }

    updateOrder(orders, index, callback) {
        const self = this;
        if (index >= orders.length) {
            callback();
        } else {
            self.db.run("UPDATE datasets SET cycle_no = ? WHERE id = ?", [index + 1, orders[index]], function () {
                self.updateOrder(orders, index + 1, callback);
            });
        }
    }

    updateOrders(orders, callback) {
        this.updateOrder(orders, 0, callback);
    }

    loadClusters(clusters, callback) {
        let lineReader = readline.createInterface({
            input: fs.createReadStream(clusters)
        });
        let clusterList = {};
        let clusterName = null;
        lineReader.on('line',  function (line) {
            if (clusterName == null || line[0] === '>') {
                clusterName = line.substr(1);
                clusterList[clusterName] = {name: clusterName, count: 0, sequences: []};
            } else {
                let name = Analysis.findSequenceName(line);
                let info = Analysis.parseVariableSequenceName(name);
                clusterList[clusterName]['count'] += parseInt(info['count']);
                clusterList[clusterName]['sequences'].push(info['variableId']);
            }
        }).on('close', function() {
            callback(clusterList);
        });
    }

    insertSequencesForTheClusterImpl(datasetId, clusterId, sequences, index, statement, callback) {
        const self = this;
        if (index >= sequences.length) {
            statement.finalize();
            callback();
        } else {
            let sequence = sequences[index];
            let ratio = this.calcBaseRatioList(sequence['sequence'][1]);
            statement.run([sequence['name'] + ':' + sequence['variableId'] + ':' + sequence['variableIndex'], datasetId, clusterId, sequence['sequence'].join('-'), sequence['count'], ratio['A'], ratio['C'], ratio['G'], ratio['T']], function(error) {
                if (error) {
                    self.notifier.send(error);
                    throw error;
                } else {
                    self.insertSequencesForTheClusterImpl(datasetId, clusterId, sequences,index + 1, statement, callback);
                }
            });
        }
    }

    calcBaseRatioList(sequence) {
        return {
            A: this.calcBaseRatio(sequence, 'A'),
            C: this.calcBaseRatio(sequence, 'C'),
            G: this.calcBaseRatio(sequence, 'G'),
            T: this.calcBaseRatio(sequence, 'T'),
        };
    }

    calcBaseRatio(sequence, base) {
        let pattern = new RegExp(base, 'g');
        let matched = sequence.match(pattern, sequence);
        if (matched) {
            return matched.length / sequence.length;
        } else {
            return 0.0;
        }
    }

    insertSequencesForTheCluster(datasetId, clusterId, sequences, callback) {
        let sequenceStatement = this.db.prepare("INSERT INTO sequences(name, dataset_id, cluster_id, sequence, count,a_ratio, c_ratio, g_ratio, t_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        this.insertSequencesForTheClusterImpl(datasetId, clusterId, sequences, 0, sequenceStatement, callback);
    }

    insertSequencesAndClustersImpl(datasetId, sequenceList, clusterList, clusterNames, minClusterSize, index, accepted, rejected, callback) {
        const self = this;
        let rejected_this={//コールバックで呼ばれる関数の引数に手を加えるのが気持ち悪かったのでコピーした
            cluster: rejected['cluster'],
            sequence: rejected['sequence']
        };

        while(true){//こうしないとスタックがあふれる
            if (index >= clusterNames.length) {
                callback(accepted, rejected_this);
                break;
            } else {
                let clusterName = clusterNames[index];
                let cluster = clusterList[clusterName];
                let count = 0;
                let sequences = [];
                for (let i = 0; i < cluster['sequences'].length; ++i) {
                    let variableId = cluster['sequences'][i];
                    for (let variableIndex in sequenceList[variableId]) {
                        let sequence = sequenceList[variableId][variableIndex];
                        count += parseInt(sequence['count']);
                        sequences.push(sequence);
                    }
                }

                if (count < minClusterSize) {
                    index += 1;
                    rejected_this['cluster'] += 1;
                    rejected_this['sequence'] += count;
                } else {
                    Analysis.sortByCount(sequences);
                    let primarySequence = sequences[0]['sequence'];
                    let ratio = this.calcBaseRatioList(primarySequence[1]);
                    this.db.run("INSERT INTO clusters (name, dataset_id, sequence, count, a_ratio, c_ratio, g_ratio, t_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        [cluster['name'], datasetId, primarySequence.join('-'), cluster['count'], ratio['A'], ratio['C'], ratio['G'], ratio['T']], function (error) {
                            if (error) {
                                self.notifier.send(error);
                                throw error;
                            } else {
                                self.insertSequencesForTheCluster(datasetId, this.lastID, sequences,function () {
                                    self.insertSequencesAndClustersImpl(
                                        datasetId,
                                        sequenceList,
                                        clusterList,
                                        clusterNames,
                                        minClusterSize,
                                        index + 1,
                                        {cluster: accepted['cluster'] + 1,
                                        sequence: accepted['sequence'] + count
                                        }, rejected_this, callback);
                                });
                            }
                      });
                    break;
                }
            }
        }
    }

    insertSequencesAndClusters(datasetId, sequenceList, clusterList, minClusterSize, callback) {
        this.insertSequencesAndClustersImpl(datasetId, sequenceList, clusterList, Object.keys(clusterList), minClusterSize,0,
            {cluster: 0, sequence: 0}, {cluster: 0, sequence: 0},
            function(accepted, rejected) {
            callback(accepted, rejected);
        });
    }

    importSequencesAndClusters(datasetId, sequences, clusters, minClusterSize, callback) {
        const self = this;
        self.loadSequences(sequences, function(sequenceList) {
            recordLog(Object.keys(sequenceList).length + " sequences are loaded from" + sequences + ".");
            self.loadClusters(clusters, function(clusterList) {
                recordLog(Object.keys(clusterList).length + " clusters are loaded " + clusters + ".");
                self.db.exec('BEGIN TRANSACTION');
                self.insertSequencesAndClusters(datasetId, sequenceList, clusterList, minClusterSize, function(accepted, rejected) {
                    self.db.exec('COMMIT');
                    callback(accepted, rejected);
                });
            });
        });
    }

    recordAnalysisResult(datasetId, filterResult, accepted, rejected, beginTime, endTime, config, callback) {
        let self = this;
        let sql = "UPDATE datasets SET " +
            " processed_sequences = ?, " +
            " accepted_sequences = ?, " +
            " rejected_sequences = ?, " +
            " accepted_clusters = ?, " +
            " accepted_cluster_sequences = ?, " +
            " rejected_clusters = ?, " +
            " rejected_cluster_sequences = ?, " +
            " begin_datetime = ?, " +
            " end_datetime = ? " +
            " WHERE id = ? ";
        let params = [
            filterResult.total, filterResult.accepted, filterResult.rejected,
            accepted['cluster'], accepted['sequence'], rejected['cluster'], rejected['sequence'],
            beginTime, endTime, datasetId
        ];

        //最低限処理時間を推測するための情報を持っておく
        if(this.statisticDataRecorder && filterResult.accepted > 1000){
            let prevdata = this.statisticDataRecorder.get();
            let pinfo = prevdata["processInfo"];
            if(!pinfo){
                pinfo = [];
            }
            while(pinfo.length > 20){
                pinfo.splice(0,1);
            }
            pinfo.push({'filterResultTotal':filterResult.total
            ,'filterResultAccepted':filterResult.accepted
            ,'beginTime':beginTime
            ,'endTime':endTime
            ,'clusteringCriteria':config.clustering_criteria
            ,'maxVariableLength':config.max_variable_length
            });

            this.statisticDataRecorder.save("processInfo",pinfo);

            let val = [];
            let val2 = [];
            let ans = [];
            for(let ii = 0;ii < pinfo.length;ii++){//いくつかの変数を使って予測する
                let v = [
                    1.0,
                    pinfo[ii]['filterResultTotal'],
                    pinfo[ii]['clusteringCriteria'],
                    pinfo[ii]['maxVariableLength']
                ];
                let v2 = [
                    1.0,
                    pinfo[ii]['filterResultAccepted'],
                    pinfo[ii]['clusteringCriteria'],
                    pinfo[ii]['maxVariableLength']
                ];
                val.push(this.prepareValuesForTimeEstimation(v));
                val2.push(this.prepareValuesForTimeEstimation(v2));
                ans.push(
                    pinfo[ii]['endTime']-pinfo[ii]['beginTime']
                );
            }
            
            let beta = this.nelderMeadForTimeEstimation(val,ans);
            this.statisticDataRecorder.save("estim_total_beta",beta);

            let beta2 = this.nelderMeadForTimeEstimation(val2,ans);
            this.statisticDataRecorder.save("estim_acc_beta",beta2);

        }
        this.db.run(sql, params, (error) => {
            if (error) {
                self.notifier.send(error);
                throw error;
            }
            callback();
        });
    }

    nelderMeadForTimeEstimation(value_list,answers){
        let betas = [];
        let alpha=1.0;
        let gamma=2.0;
        let rho=1.0/2.0;
        let sigma=1.0/2.0;
        let num_betas = value_list[0].length;
        let num_candidates = value_list[0].length+1;
        for(let ii = 0;ii < num_candidates;ii++){
            let beta = [];
            for(let jj = 0;jj < num_betas;jj++){
                if(ii == jj){
                    beta.push(1);
                }else{
                    beta.push(0);
                }
            }
            betas.push(beta);
        }
        let calc_loss = function(val,bt,ans){
            let ret = 0;
            for(let jj = 0;jj < val.length;jj++){
                let res = 0;
                for(let kk = 0;kk < num_betas;kk++){
                    res += bt[kk]*val[jj][kk];
                }
                ret += Math.abs(res-ans[jj]);
            }
            return ret;
        };

        let losses = [];
        for(let cc = 0;cc < num_candidates;cc++){
            let loss_sum= calc_loss(value_list,betas[cc],answers);  
            losses.push({idx:cc,loss:loss_sum});
        }

        for(let tt = 0;tt < 10000;tt++){
            losses.sort(
                function(a,b){
                    if(a.loss < b.loss){
                        return -1;
                    }
                    if(a.loss > b.loss){
                        return 1;
                    }
                    return 0;
                }
            );
            let idx_zero = losses[0]["idx"];
            let idx_last = losses[losses.length-1]["idx"];
            let xcenter = [];
            for(let cc = 0;cc < num_candidates-1;cc++){
                for(let bb = 0;bb < num_betas;bb++){
                    if(cc == 0){
                        xcenter[bb] = 0;
                    }
                    xcenter[bb] += betas[cc][bb];
                }
            }
            for(let bb = 0;bb < num_betas;bb++){
                xcenter[bb] /= num_candidates;
            }
            let xnex = [];
            for(let bb = 0;bb < num_betas;bb++){
                xnex.push(xcenter[bb]+alpha*(xcenter[bb]-betas[idx_last][bb]));
            }
            let nex_loss = calc_loss(value_list,xnex,answers);
            if(nex_loss >= losses[0]["loss"] && nex_loss < losses[losses.length-2]["loss"]){
                betas[idx_last] = xnex;
                losses[losses.length-1]["loss"] = nex_loss;
            }else if(nex_loss < losses[0]["loss"]){
                let xnex2 = [];
                for(let bb = 0;bb < num_betas;bb++){
                    xnex2.push(xcenter[bb]+gamma*(betas[idx_last][bb]-xcenter[bb]));
                }
                let nex_loss2 = calc_loss(value_list,xnex2,answers);
                if(nex_loss2 < nex_loss){
                    betas[idx_last] = xnex2;
                    losses[losses.length-1]["loss"] = nex_loss2;
                }else{
                    betas[idx_last] = xnex;
                    losses[losses.length-1]["loss"] = nex_loss;
                }
            }else{
                let xnex3 = [];
                for(let bb = 0;bb < num_betas;bb++){
                    xnex3.push(xcenter[bb]+rho*(betas[idx_last][bb]-xcenter[bb]));
                }
                let nex_loss3 = calc_loss(value_list,xnex3,answers);
                if(nex_loss3 < losses[losses.length-1]["loss"]){
                    betas[idx_last] = xnex3;
                    losses[losses.length-1]["loss"] = nex_loss3;
                }else{
                    for(let cc = 1;cc < num_candidates;cc++){
                        let idxx = losses[cc]["idx"];
                        for(let bb = 0;bb < num_betas;bb++){
                            betas[idxx][bb] = betas[idx_zero][bb]+sigma*(betas[idxx][bb]-betas[idx_zero][bb]);
                        }
                        losses[cc]["loss"] = calc_loss(value_list,betas[idxx],answers);
                    }
                }
            }
        }
        losses.sort(
            function(a,b){
                if(a["loss"] < b["loss"]){
                    return -1;
                }
                if(a["loss"] > b["loss"]){
                    return 1;
                }
                return 0;
            }
        );
        return betas[losses[0]["idx"]];
    }

    prepareValuesForTimeEstimation(vvalues){
        let values_ = [];
        for(let ii = 0;ii < vvalues.length;ii++){
            values_.push(vvalues[ii]);
        }
        let values = [];
        for(let ii = 0;ii < values_.length;ii++){
            values.push(values_[ii]);
            for(let jj = ii;jj < values_.length;jj++){
                values.push(values_[ii]*values_[jj]);
            }
        }
        return values;
    }

    estimateProcessingTime(vvalues,beta){
        let values = this.prepareValuesForTimeEstimation(vvalues);
        if(values.length != beta.length){
            console.log("The time estimation was failed. Please check the code.");
            console.log(vvalues);
            console.log(beta);
            return 0;
        }
        let ret = 0.0;
        for(let ii=0;ii < beta.length;ii++){
            if(ii == 0){
                ret += beta[0];
            }else{
                ret += values[ii]*beta[ii];
            } 
        }
        return ret;
    }

    analyzeImpl(config, datasetList, index, callback) {
        const self = this;
        if (index >= datasetList.length) {

            let ccompcode = 0;
            if(config.cluster_complementary_sequences){
                if(config.cluster_complementary_sequences != 0){
                    ccompcode = 1;
                }
            }

            this.db.run("UPDATE configs SET " +
                " quality_criteria = ?, number_of_low_quality_elements = ?, " +
                " min_variable_length = ?, max_variable_length = ?, " +
                " head_primer = ?, number_of_head_primer_errors = ?, " +
                " tail_primer = ?, number_of_tail_primer_errors = ?, " +
                " clustering_criteria = ?, min_cluster_size = ?, " +
                " analyzed = ?," +
                " single_or_paired = ?," +
                " cluster_complementary_sequences = ?", [
                config.quality_criteria, config.number_of_low_quality_elements,
                config.min_variable_length, config.max_variable_length,
                config.head_primer, config.number_of_head_primer_errors,
                config.tail_primer, config.number_of_tail_primer_errors,
                config.clustering_criteria, config.min_cluster_size,
                'now()',
                config.single_or_paired, ccompcode,
                ], (error) => {
                    if (error) {
                        self.notifier.send(error);
                        throw error;
                    }
                    self.notifier.send(null); //成功した場合
                    callback();
                });
        } else {
            let row = datasetList[index];
            let begin = Date.now();
            self.filterSequences(config, row.path, function (full, variable, result) {
                recordLog('filter finished.');
                let filterResult = JSON.parse(result);
                self.clusterSequences(config, variable, function (sequences, clusters) {
                    recordLog('clustering finished.');
                    recordLog('loading clusters from ' + clusters);
                    recordLog('loading sequences from ' + full);
                    self.importSequencesAndClusters(row.id, full, clusters, config.min_cluster_size, function(accepted, rejected) {
                        recordLog(row.id + ' : ' + accepted['cluster'] + " clusters and " + accepted['sequence'] + " sequences were accepted.");
                        recordLog(row.id + ' : ' + rejected['cluster'] + " clusters and " + rejected['sequence'] + " sequences were rejected.");
                        let end = Date.now();
                        self.recordAnalysisResult(row.id, filterResult, accepted, rejected, begin, end, config, function() {
                            self.analyzeImpl(config, datasetList, index + 1, callback);
                        });
                    });
                });
            });
        }
    }

    analyze(config,files, callback) {
        
        this.makeTempDir();
        this.notifier.setAddress(config.mail_address);
        const log4js = require('log4js')
        log4js.configure({
            appenders : {
                system : {type : 'file', filename : path.join(this.tempDir, 'system.log') }
            },
            categories : {
                default : {appenders : ['system'], level : 'debug'},
            }
        });
        logger = log4js.getLogger('system');
        const self = this;


        self.addFastqToDB(config,files,0,
                function(config_,files_,index,callback1,callback2){
                    self.addFastqToDB(config_,files_,index,callback1,callback2);
                }
            ,
            function(){
                self.getDataSets(function(rows) {
                    self.analyzeImpl(config, rows, 0, function() {
                        callback();
                    });
                });
            }
        );
    }

    getDataSets(callback) {
        if (this.db == null) {
            recordLog('db is not opened.');
            callback([]);
            return;
        }
        this.db.all('SELECT * FROM datasets ORDER BY cycle_no', function (err, rows) {
            if (err) {
                throw err;
            }
            callback(rows);
        });
    }

    getDataSetClusterCountByPrimary(dataSetId, conditions, threshold, callback) {
        let baseQuery =
            " SELECT "
            + "     COUNT(*) AS count "
            + " FROM "
            + "     clusters "
            + " WHERE "
            + "     dataset_id = ? ";
        let baseParams = [dataSetId];
        let { query, params } = this.setSearchConditions('clusters', baseQuery, baseParams, conditions, threshold);
        recordLog(query);
        recordLog(params);
        this.db.get(query, params, function (error, row) {
            if (error) {
                throw error;
            }
            callback(row.count);
        });
    }

    //conditions の中に key として配列が入っており、その配列が含まれるクラスターの数を数える
    //部分文字列検索とかで使う
    //たまに getDataSetClusterCountByPrimary と同じ用途で使われていることがあるようだ
    getDataSetClusterCountByAll(dataSetId, conditions, threshold, callback) {
        let baseQuery =
            " SELECT "
            + "     COUNT( DISTINCT(clusters.id)) AS count "
            + " FROM "
            + "     clusters "
            + "     INNER JOIN sequences ON sequences.cluster_id = clusters.id "
            + " WHERE "
            + "     clusters.dataset_id = ? ";
        let baseParams = [dataSetId];
        let { query, params } = this.setSearchConditions('sequences', baseQuery, baseParams, conditions, threshold);
        this.db.get(query, params, function (error, row) {
            if (error) {
                throw error;
            }
            callback(row.count);
        });
    }

    //ページ数表示とかのために数を数える
    getDataSetClusterCount(dataSetId, conditions, threshold, callback) {
        if (this.db == null) {
            callback(0);
        } else {
            if (conditions && conditions['primary_only']) {
                this.getDataSetClusterCountByPrimary(dataSetId, conditions, threshold, callback);
            } else {
                this.getDataSetClusterCountByAll(dataSetId, conditions, threshold, callback);
            }

        }
    }
    
    setSearchConditions(target, query, params, conditions, threshold) {
        if (conditions) {
            if (conditions['key']) {
                query += ' AND ' + target + '.sequence LIKE ? ';
                params.push('%-%' + conditions['key'] + '%-%');
            }
        }
        if (threshold) {
            if (threshold['count'] > 0) {
                query += ' AND ' + target + '.count >= ? ';
                params.push(threshold['count']);
            }
            if (threshold['A'] < 100) {
                query += ' AND ' + target + '.a_ratio <= ? ';
                params.push(threshold['A'] / 100.0);
            }
            if (threshold['C'] < 100) {
                query += ' AND ' + target + '.c_ratio <= ? ';
                params.push(threshold['C'] / 100.0);
            }
            if (threshold['G'] < 100) {
                query += ' AND ' + target + '.g_ratio <= ? ';
                params.push(threshold['G'] / 100.0);
            }
            if (threshold['T'] < 100) {
                query += ' AND ' + target + '.t_ratio <= ? ';
                params.push(threshold['T'] / 100.0);
            }
            
            //lower bound
            if (threshold['lb_A'] > 0) {
                query += ' AND ' + target + '.a_ratio >= ? ';
                params.push(threshold['lb_A'] / 100.0);
            }
            if (threshold['lb_C'] > 0) {
                query += ' AND ' + target + '.c_ratio >= ? ';
                params.push(threshold['lb_C'] / 100.0);
            }
            if (threshold['lb_G'] > 0) {
                query += ' AND ' + target + '.g_ratio >= ? ';
                params.push(threshold['lb_G'] / 100.0);
            }
            if (threshold['lb_T'] > 0) {
                query += ' AND ' + target + '.t_ratio >= ? ';
                params.push(threshold['lb_T'] / 100.0);
            }
            
        }
        return { query, params };
    }

    getDataSetSequenceCount(dataSetId, callback) {
        if (this.db == null) {
            callback(0);
        } else {
            let params = [ dataSetId ];
            let query =
                " SELECT "
                + "     SUM(count) AS count "
                + " FROM "
                + "     clusters "
                + " WHERE "
                + "     dataset_id = ? ";
            this.db.get(query, params, function (error, row) {
                if (error) {
                    throw error;
                }
                callback(row.count);
            });
        }
    }

    processClusterSequenceData(clusters, callback) {
        let clusterList = clusters.map(c => ({
            id: c.id,
            name: c.name,
            seq_name: c.seq_name,
            dataset_id: c.dataset_id,
            sequence: c.sequence.split('-'),
            count: c.count,
            a_ratio: c.a_ratio,
            c_ratio: c.c_ratio,
            g_ratio: c.g_ratio,
            t_ratio: c.t_ratio
        }));
        callback(clusterList);
    }

    getCluster(dataSetId, clusterId, callback) {
        if (this.db == null) {
            callback([]);
            return;
        }

        const self = this;

        let query =
            " SELECT "
            + "     clusters.id AS id, "
            + "     clusters.dataset_id AS dataset_id, "
            + "     clusters.name AS name, "
            + "     sequences.name AS seq_name, "
            + "     clusters.sequence AS sequence, "
            + "     clusters.count AS count, "
            + "     clusters.a_ratio AS a_ratio, "
            + "     clusters.c_ratio AS c_ratio, "
            + "     clusters.g_ratio AS g_ratio, "
            + "     clusters.t_ratio AS t_ratio "
            + " FROM "
            + "     clusters "
            + "     INNER JOIN sequences on clusters.dataset_id = sequences.dataset_id AND clusters.sequence = sequences.sequence "
            + " WHERE clusters.dataset_id = ? AND clusters.id = ?";
        let params = [ dataSetId, clusterId ];
        recordLog(query);
        recordLog(params);
        this.db.all(query, params, function (error, rows) {
            if (error) {
                throw error;
            }
            self.processClusterSequenceData(rows, function(clusterList) {
                callback(clusterList[0]);
            });
        });
    }

    getClustersByPrimarySequences(dataSetId, conditions, threshold, number, page, numClusters, count, callback) {
        let baseQuery =
            " SELECT "
            + "     clusters.id AS id, "
            + "     clusters.dataset_id AS dataset_id, "
            + "     clusters.name AS name, "
            + "     sequences.name AS seq_name, "
            + "     clusters.sequence AS sequence, "
            + "     clusters.count AS count, "
            + "     clusters.a_ratio AS a_ratio, "
            + "     clusters.c_ratio AS c_ratio, "
            + "     clusters.g_ratio AS g_ratio, "
            + "     clusters.t_ratio AS t_ratio "
            + " FROM "
            + "     clusters "
            + "     INNER JOIN sequences on clusters.dataset_id = sequences.dataset_id AND clusters.sequence = sequences.sequence "
            + " WHERE clusters.dataset_id = ? ";
        let baseParams = [ dataSetId ];
        let { query, params } = this.setSearchConditions('clusters', baseQuery, baseParams, conditions, threshold);

        this.executeClusterQuery(query, params, number, page, numClusters, count, callback);
    }

    getClustersByAllSequences(dataSetId, conditions, threshold, number, page, numClusters, count, callback) {
        let baseQuery =
            " SELECT "
            + "     clusters.id AS id, "
            + "     clusters.dataset_id AS dataset_id, "
            + "     clusters.name AS name, "
            + "     sequences.name AS seq_name, "
            + "     clusters.sequence AS sequence, "
            + "     clusters.count AS count, "
            + "     clusters.a_ratio AS a_ratio, "
            + "     clusters.c_ratio AS c_ratio, "
            + "     clusters.g_ratio AS g_ratio, "
            + "     clusters.t_ratio AS t_ratio "
            + " FROM "
            + "     clusters "
            + "     INNER JOIN sequences on clusters.dataset_id = sequences.dataset_id AND clusters.sequence = sequences.sequence "
            + " WHERE clusters.id IN ("
            + "     SELECT "
            + "         DISTINCT clusters.id AS id "
            + "     FROM "
            + "         clusters "
            + "         INNER JOIN sequences on clusters.dataset_id = sequences.dataset_id AND clusters.id = sequences.cluster_id "
            + "     WHERE clusters.dataset_id = ? ";

        let baseParams = [ dataSetId ];
        let { query, params } = this.setSearchConditions('sequences', baseQuery, baseParams, conditions, threshold)
        query += " )";

        this.executeClusterQuery(query, params, number, page, numClusters, count, callback);
    }

    executeClusterQuery(query, params, number, page, numClusters, count, callback)
    {
        query += ' ORDER BY CAST(clusters.count AS INTEGER) DESC ';
        if (number) {
            let offset = number * (page - 1);
            query += ' LIMIT ? OFFSET ? ';
            params.push(number);
            params.push(offset);
        }
        recordLog(query);
        recordLog(params);
        const self = this;
        this.db.all(query, params, function (error, rows) {
            if (error) {
                throw error;
            }
            self.processClusterSequenceData(rows, function(clusterList) {
                callback({sequence_count: count, cluster_count: numClusters, clusters: clusterList, page: page});
            });
        });
    }

    getClusters(dataSetId, conditions, number, page, threshold, callback) {
        if (this.db == null) {
            callback([]);
            return;
        }
        const self = this;
        recordLog('getClusters');
        recordLog(conditions);
        self.getDataSetClusterCount(dataSetId, conditions, threshold, function (numClusters) {
            self.getDataSetSequenceCount(dataSetId,function(count) {
                if (conditions && conditions['primary_only']) {
                    self.getClustersByPrimarySequences(dataSetId, conditions, threshold, number, page, numClusters, count, callback)
                } else {
                    self.getClustersByAllSequences(dataSetId, conditions, threshold, number, page, numClusters, count, callback)
                }
            });
        });
    }

    getClusterSequenceCountImpl(dataSetId, clusterId, conditions, threshold, target, callback) {
        if (this.db == null) {
            callback(0);
        } else {
            let baseQuery = ('SELECT ' + target + ' AS count FROM sequences WHERE dataset_id = ?');
            let baseParams = [ dataSetId ];
            if (clusterId) {
                baseQuery += ' AND cluster_id = ? ';
                baseParams.push(clusterId);
            }
            let { query, params } = this.setSearchConditions('sequences', baseQuery, baseParams, conditions, threshold);
            recordLog(query);
            recordLog(params);
            this.db.get(query, params, function (error, rows) {
                if (error) {
                    throw error;
                }
                callback(rows.count);
            });
        }
    }

    getClusterSequenceVariants(dataSetId, clusterId, conditions, threshold, callback) {
        this.getClusterSequenceCountImpl(dataSetId, clusterId, conditions, threshold, 'COUNT(*)', callback);
    }

    getClusterSequenceCount(dataSetId, clusterId, callback) {
        this.getClusterSequenceCountImpl(dataSetId, clusterId, { key: null }, null,'SUM(count)', callback);
    }

    //sequence として返るのは文字列の配列であり、0 が 5' primer, 1 が variables, 2 が 3' primer
    processSequenceData(sequences, representative, callback) {
        const self = this;
        let seqList = sequences.map(function(seq) {
            let sequence = seq.sequence.split('-');
            let distance = '-';
            if (representative) {
                distance = self.levenshteinDistance(sequence[1], representative[1]);
            }
            return {
                id: seq.id,
                name: seq.name,
                dataset_id: seq.dataset_id,
                cluster_id: seq.cluster_id,
                sequence: sequence,
                distance: distance,
                count: seq.count,
                a_ratio: seq.a_ratio,
                c_ratio: seq.c_ratio,
                g_ratio: seq.g_ratio,
                t_ratio: seq.t_ratio
            };
        });
        callback(seqList);
    }

    getSequencesImpl(dataSetId, cluster, key, number, page, threshold, callback) {
        const self = this;
        recordLog('number = ' + number);
        let clusterId = (cluster ? cluster.id : null);
        self.getClusterSequenceVariants(dataSetId, clusterId, { key: key, primary_only: true }, threshold, function(numVariants) {
            self.getClusterSequenceCount(dataSetId, clusterId, function (count) {
                let baseQuery = 'SELECT * FROM sequences WHERE dataset_id = ? ';
                let baseParams = [ dataSetId ];
                if (clusterId) {
                    baseQuery += ' AND cluster_id = ? ';
                    baseParams.push(clusterId);
                }
                let { query, params } = self.setSearchConditions('sequences', baseQuery, baseParams, { key: key, primary_only: true }, threshold);
                query += ' ORDER BY CAST(count AS INTEGER) DESC ';
                if (number) {
                    let offset = number * (page - 1);
                    query += ' LIMIT ? OFFSET ? ';
                    params.push(number);
                    params.push(offset);
                }
                recordLog(query);
                recordLog(params);
                self.db.all(query, params, function (error, rows) {
                    if (error) {
                        throw error;
                    }
                    self.processSequenceData(rows, (cluster ? cluster.sequence : null), function(seqList) {
                        callback({
                            sequence_count: count,
                            variant_count: numVariants,
                            sequences: seqList,
                            page: page
                        });
                    });
                });
            });
        });
    }

    getSequences(dataSetId, clusterId, key, number, page, threshold, callback) {
        if (this.db == null) {
            callback([]);
            return;
        }
        const self = this;
        if (clusterId) {
            this.getCluster(dataSetId, clusterId, function(cluster) {
                self.getSequencesImpl(dataSetId, cluster, key, number, page, threshold, callback);
            });
        } else {
            self.getSequencesImpl(dataSetId, null, key, number, page, threshold, callback);
        }
    }

    getClusterCount(dataSetId, sequence, callback) {
        this.db.get('SELECT * FROM clusters WHERE dataset_id = ? AND sequence LIKE ?', [dataSetId, '%-' + sequence + '-%'], function (error, rows) {
            if (error) {
                throw error;
            }
            callback(rows ? rows.count : 0);
        });
    }

    //指定の配列の数を取得する
    getSequenceCount(dataSetId, sequence, callback) {
        let that = this;
        that.db.get('SELECT * FROM sequences WHERE dataset_id = ? AND sequence LIKE ?', [dataSetId, '%-' + sequence + '-%'], function (serror, srows) {
            if (serror) {
                throw serror;
            }
            callback(srows ? srows.count : 0);
        });
    }

    //指定の配列が含まれる Cluster に含まれる全配列の数を取得する
    getClusterCount_All(dataSetId, sequence, callback) {
        let that = this;
        that.db.get('SELECT * FROM sequences WHERE dataset_id = ? AND sequence LIKE ?', [dataSetId, '%-' + sequence + '-%'], function (serror, srows) {
            if (serror) {
                throw serror;
            }
            if(srows){
                that.db.get('SELECT * FROM clusters WHERE dataset_id = ? AND id = ?'
                , [dataSetId, srows.cluster_id +''], function (error, rows) {
                    if (error) {
                        throw error;
                    }
                    callback(rows ? rows.count : 0);
                });
            }else{
                callback(0);
            }
        });
    }

    prepareCompareDataImpl(dataSets, sequences, dataSetIndex, sequenceIndex, data, compareTarget, callback) {
        const self = this;
        if (dataSetIndex >= dataSets.length) {
            if ((sequenceIndex + 1) >= sequences.length) {
                callback(data);
            } else {
                self.prepareCompareDataImpl(dataSets, sequences, 0, sequenceIndex + 1, data, compareTarget, callback);
            }
        } else {
            let dataSetId = dataSets[dataSetIndex].id;
            if(compareTarget == "cluster_all"){
                self.getClusterCount_All(dataSetId, sequences[sequenceIndex], function(count) {
                    if (sequenceIndex >= data.length) {
                        data.push({sequence: sequences[sequenceIndex], counts: {}});
                    }
                    data[sequenceIndex]['counts'][dataSetId] = count;
                    self.prepareCompareDataImpl(dataSets, sequences, dataSetIndex + 1, sequenceIndex, data, compareTarget, callback);
                });
            }else if(compareTarget == "cluster_representative"){
                self.getClusterCount(dataSetId, sequences[sequenceIndex], function(count) {
                    if (sequenceIndex >= data.length) {
                        data.push({sequence: sequences[sequenceIndex], counts: {}});
                    }
                    data[sequenceIndex]['counts'][dataSetId] = count;
                    self.prepareCompareDataImpl(dataSets, sequences, dataSetIndex + 1, sequenceIndex, data, compareTarget, callback);
                });
            }else if (compareTarget == "sequences"){
                self.getSequenceCount(dataSetId, sequences[sequenceIndex], function(count) {
                    if (sequenceIndex >= data.length) {
                        data.push({sequence: sequences[sequenceIndex], counts: {}});
                    }
                    data[sequenceIndex]['counts'][dataSetId] = count;
                    self.prepareCompareDataImpl(dataSets, sequences, dataSetIndex + 1, sequenceIndex, data, compareTarget, callback);
                });
            }else{
                console.log(compareTarget+" is not a valid target tag.");
            }
        }
    }

    setCompareDataFilter(searchkey,threshold){
        this.compareSearchKey = searchkey;
        this.compareThreshold = threshold;
    }

    prepareCompareData(dataSets, sequecnes, compareTarget,callback) {
        const self = this;
        self.prepareCompareDataImpl(dataSets, sequecnes, 0, 0, [], compareTarget,function(data) {
            callback(data);
        });
    }

    getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings,scoringFunction, callback) {
        const self = this;
        if(scoringFunction){
            let sorter_func = function(dataSets, sequences, compareTarget){
                self.prepareCompareData(dataSets, sequences, compareTarget, function(data_tmp) {
                    let data_sorter = [];
                    /*
                    let scoringFunction = function(ratiolist){
                        let lmin = ratiolist[ratiolist.length-1];
                        for(let ii = 0;ii < ratiolist.length-1;ii++){
                            lmin = Math.min(ratiolist[ii+1]-ratiolist[ii],lmin);
                        }
                        return lmin;
                    };
                    */

                    for(let tt = 0;tt < data_tmp.length;tt++){
                        if(dataSets.length > 1){
                            let data_ratio = [];
                            for(let dd = 0;dd < dataSets.length;dd++){
                                let ratio = data_tmp[tt].counts[dataSets[dd].id] / dataSets[dd].accepted_cluster_sequences * 100;
                                data_ratio.push(ratio);
                            }
                            //console.log(data_tmp[tt].sequence);
                            //console.log(scoringFunction(data_ratio));
                            data_sorter.push([scoringFunction(data_ratio),data_tmp[tt]]);
                        }else{
                            data_sorter.push([0,data_tmp[0]]);
                        }
                    }
                    data_sorter.sort(
                        function(a,b){
                            if(a[0] < b[0]){
                                return -1;
                            }
                            if(a[0] > b[0]){
                                return 1;
                            }
                            return 0;
                        }
                    );
                    data_sorter.reverse();
                    let start = (page - 1) * numberOfCompare;
                    callback(dataSets, data_sorter.slice(start,start+numberOfCompare).map((item) => { return item[1]; }));
                });
            };
            
            if(compareTarget == 'sequences'){
                //ToDo: numberOfCompare が Preference と機能重複しているので変更
                self.getDataSets(function(dataSets) {
                    self.getSequences(dataSetId, null, filterSettings["conditions"]["key"], null, 0, filterSettings["threshold"], function(result) {
                        let sequence_list = result.sequences;
                        let sequences = sequence_list.map((item) => { return item.sequence[1]; });
                        sorter_func(dataSets, sequences, compareTarget);
                    });
                });
            }else{
                self.getDataSets(function(dataSets) {
                    self.getClusters(dataSetId, filterSettings["conditions"], null, null, filterSettings["threshold"], function(result) {
                        let clusters = result.clusters;
                        let sequences = clusters.map((item) => { return item.sequence[1]; });
                        sorter_func(dataSets, sequences, compareTarget);
                    });
                });
            }
        }else{
            if(compareTarget == 'sequences'){
                //ToDo: numberOfCompare が Preference と機能重複しているので変更
                self.getDataSets(function(dataSets) {
                    self.getSequences(dataSetId, null, filterSettings["conditions"]["key"], null, 0, filterSettings["threshold"], function(result) {
                        let sequence_list = result.sequences;
                        let start = (page - 1) * numberOfCompare;
                        let sequences = sequence_list.map((item) => { return item.sequence[1]; }).slice(start, start + numberOfCompare);
                        self.prepareCompareData(dataSets, sequences, compareTarget, function(data) {
                            callback(dataSets, data);
                        })
                    });
                });
            }else if(compareTarget == "cluster_representative"){

                self.getDataSets(function(dataSets) {
                    self.getClusters(dataSetId, filterSettings["conditions"], null, null, filterSettings["threshold"], function(result) {
                        let clusters = result.clusters;
                        let start = (page - 1) * numberOfCompare;
                        let sequences = clusters.map((item) => { return item.sequence[1]; }).slice(start, start + numberOfCompare);
                        self.prepareCompareData(dataSets, sequences, compareTarget, function(data) {
                            callback(dataSets, data);
                        })
                    });
                });
            }else if(compareTarget == "cluster_all"){//Compare 用
                self.getDataSets(function(dataSets) {
                    self.getClusters(dataSetId, filterSettings["conditions"], null, null, filterSettings["threshold"], function(result) {
                        let clusters = result.clusters;
                        let start = (page - 1) * numberOfCompare;
                        let sequences = clusters.map((item) => { return item.sequence[1]; }).slice(start, start + numberOfCompare);
                        if(sequences.length == 1 && filterSettings["conditions"]["key"]){
                            sequences = [filterSettings["conditions"]["key"]];
                        }
                        //let sequences = [];
                        self.prepareCompareData(dataSets, sequences, compareTarget, function(data) {
                            callback(dataSets, data);
                        })
                    });
                });
            }
        }
    }

    getDataSetInfo(dataSetId, callback) {
        const self = this;
        self.db.get('SELECT * FROM datasets WHERE id = ?', [dataSetId], function (error, row) {
            if (error) {
                throw error;
            }
            callback(row);
        });
    }
    
    getMergerInfo(dataSetId, callback) {
        const self = this;
        self.db.get('SELECT * FROM merger_results WHERE id = ?', [dataSetId], function (error, row) {
            if (error) {
                throw error;
            }
            callback(row);
        });
    }    

    exportDataSetAsFastaFile(dataSets, index, files, target_type, callback) {
        const self = this;
        if (index >= dataSets.length) {
            callback(files);
            return;
        }
        //一時ファイルに Fasta を出力
        let dataSetId = dataSets[index].id;
        temp.open('fasta', function(error, info) {
            if (error) {
                throw error;
            }
            if(target_type == "cluster"){
                self.getClusters(dataSetId, null, null, null, 0, function(result) {
                    result.clusters.forEach(function(cluster) {
                        fs.writeSync(info.fd, ">" + cluster.name + "\n");
                        fs.writeSync(info.fd, cluster.sequence[1] + "\n");
                    });
                    fs.close(info.fd, function(error) {
                        files[dataSetId] = info.path;
                        self.exportDataSetAsFastaFile(dataSets, index + 1, files, target_type, callback);
                    });
                });
            }else if(target_type == "sequence"){
                self.getSequences(dataSetId,null , "", null, null, {
                    ratio: 0, A: 100, C: 100, G: 100, T: 100, lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0
                }
                , function(result) {
                    result.sequences.forEach(function(sequence) {
                        fs.writeSync(info.fd, ">" + sequence.name + "\n");
                        fs.writeSync(info.fd, sequence.sequence[1] + "\n");
                    });
                    fs.close(info.fd, function(error) {
                        files[dataSetId] = info.path;
                        self.exportDataSetAsFastaFile(dataSets, index + 1, files, target_type, callback);
                    });
                });
            }else{
                throw type+" is not defined.";
            }
            
        });
    }

    exportDataSetAsFasta(dataSets, type, callback) {
        this.exportDataSetAsFastaFile(dataSets, 0, {}, type,function(files) {
            callback(files);
        });
    }

    getVennData(type, callback) {
        const self = this;
        self.getDataSets(function(dataSets) {
            self.exportDataSetAsFasta(dataSets, type, function(fileList) {
                let files = Object.keys(fileList).map(function(id) { return fileList[id]; });
                let command = '"'+self.base + VENN_CMD + '" --command summary --include "' + files.join('" --include "') + '"';
                recordLog(command);
                exec(command, function(error, stdout, stderr) {
                    let vennData = eval(stdout);
                    let result = [];
                    vennData.forEach((item) => {
                        let entry = {sets: [],ids:[], size: item.size};
                        item.sets.forEach((index) => {
                            entry.sets.push(dataSets[index].name);
                            entry.ids.push(dataSets[index].id);
                        })
                        result.push(entry);
                    });
                    recordLog(stderr);
                    callback({ datasets: dataSets, counts: result });
                });
            });
        });
    }

    exportAsCsv(filename, sqlresult ,datatype, callback) {
        let that = this;
        let dataList=null;
        if(datatype == "cluster") {
            dataList = sqlresult.clusters;
        }else if(datatype == "family_sequence"){
            dataList = sqlresult.sequences;
        }else if (datatype== "sequence"){
            dataList = sqlresult.sequences;
        }else{
            throw "Undefined datatype "+datatype; 
        }
        fs.open(filename, 'w', function(error, fd) {
            if (error) {
                throw error;
            }
            if(!that.appPreferences){
                fs.writeSync(fd, "ID,Name,Sequence,Count\r\n");
                dataList.forEach((dataItem) => {
                    fs.writeSync(fd, dataItem.id + "," + dataItem.name + "," + dataItem.sequence.join('') + "," + dataItem.count + "\r\n");
                });

            }else{
                let preferences = that.appPreferences.get();
                let tags = [];
                if(datatype == "cluster") {
                    tags = [
                        'id',
                    'ngs_id',
                    'head',
                    'variable',
                    'tail',
                    'variable_length',
                    'total_length',
                    'count',
                    'ratio',
                    'a_ratio',
                    'c_ratio',
                    'g_ratio',
                    't_ratio'];
                }else if(datatype == "family_sequence"){
                    tags = [
                        'id',
                    'ngs_id',
                    'head',
                    'variable',
                    'tail',
                    'variable_length',
                    'total_length',
                    'count',
                    'ratio',
                    'a_ratio',
                    'c_ratio',
                    'g_ratio',
                    't_ratio',
                    'variable_distance'
                    ];
                }else if (datatype== "sequence"){

                    tags = [
                        'id',
                    'ngs_id',
                    'head',
                    'variable',
                    'tail',
                    'variable_length',
                    'total_length',
                    'count',
                    'ratio',
                    'a_ratio',
                    'c_ratio',
                    'g_ratio',
                    't_ratio'
                    ];

                }else{
                    throw "Undefined datatype "+datatype; 
                }
                let utags = [];
                for(let ii = 0;ii < tags.length;ii++){
                    if(preferences.view.items.includes(tags[ii])){
                        utags.push(tags[ii]);
                    }
                }
                for(let ii = 0;ii < utags.length;ii++){
                    fs.writeSync(fd, utags[ii]);
                    if(ii < utags.length-1){
                        fs.writeSync(fd,",");
                    }else{
                        fs.writeSync(fd,"\r\n");
                    }
                }
                dataList.forEach((ddat) => {
                    let dats = {
                    'id':ddat.id,
                    'ngs_id':"",
                    'head': ddat.sequence[0],
                    'variable': ddat.sequence[1],
                    'tail': ddat.sequence[2],
                    'variable_length':ddat.sequence[1].length,
                    'total_length': ddat.sequence[0].length+ddat.sequence[1].length+ddat.sequence[2].length,
                    'count':ddat.count+"/"+sqlresult["sequence_count"],
                    'ratio':(ddat.count/sqlresult["sequence_count"]*100)+"%",
                    'a_ratio':(ddat.a_ratio*100)+"%",
                    'c_ratio':(ddat.c_ratio*100)+"%",
                    'g_ratio':(ddat.g_ratio*100)+"%",
                    't_ratio':(ddat.t_ratio*100)+"%"
                    };

                    if(datatype == "cluster"){
                        dats["ngs_id"] = ddat.seq_name;
                    }else{
                        dats["ngs_id"] = ddat.name;
                    }

                    if(datatype == "family_sequence"){
                        dats["variable_distance"] = ddat.distance;
                    }

                    for(let ii = 0;ii < utags.length;ii++){
                        fs.writeSync(fd, dats[utags[ii]]+"");
                        if(ii < utags.length-1){
                            fs.writeSync(fd,",");
                        }else{
                            fs.writeSync(fd,"\r\n");
                        }
                    }
                });


            }
            fs.close(fd, function(error) {
                if (error) {
                    throw error;
                }
                callback();
            });
        });
    }

    exportAsFasta(filename, dataList, callback) {
        fs.open(filename, 'w', function(error, fd) {
            if (error) {
                throw error;
            }

            dataList.forEach((dataItem) => {
                for (let i = 0; i < dataItem.count; ++i) {
                    fs.writeSync(fd, ">" + dataItem.id + "-" + dataItem.name.replace(' ', '_') + "-" + (i + 1) + "\r\n");
                    fs.writeSync(fd, dataItem.sequence.join('') + "\r\n");
                }
            });

            fs.close(fd, function(error) {
                if (error) {
                    throw error;
                }
                callback();
            });
        });
    }

    exportClusters(dataSetId, filename, conditions ,clusterThresholdNumber, callback) {
        const self = this;
        self.getClusters(dataSetId, conditions, null, null, clusterThresholdNumber, function (result) {
            let ext = path.extname(filename);
            if (ext == '.csv') {
                self.exportAsCsv(filename, result, "cluster",callback);
            } else if (ext == '.fasta') {
                let clusters = result.clusters;
                self.exportAsFasta(filename, clusters, callback);
            } else{
                callback();
                throw new Exception(ext+" is not supported format.");
            }
        });
    }

    exportSequences(dataSetId, clusterId, filename, key, threshold, callback) {
        const self = this;
        self.getSequences(dataSetId, clusterId, key, null, null, threshold, function (result) {
            let ext = path.extname(filename);
            if (ext == '.csv') {
                if(clusterId !== null){
                    self.exportAsCsv(filename, result, "family_sequence", callback);
                }else{
                    self.exportAsCsv(filename, result, "sequence", callback);
                }
            } else if (ext == '.fasta') {
                self.exportAsFasta(filename, result.sequences, callback);
            } else {
                callback();
                throw new Exception(ext+" is not supported format.");
            }
        });
    }

    exportCommonSequences(dataSetNames, target_type, filename, callback) {
        const self = this;
        self.getDataSets(function(dataSets) {
            dataSets = dataSets.filter((dataSet) => {
               return dataSetNames.includes(dataSet.name);
            });
            self.exportDataSetAsFasta(dataSets, target_type, function(fileList) {
                let files = Object.keys(fileList).map(function(id) { return fileList[id]; });
                let format = path.extname(filename).substr(1);//拡張子の取得
                let command = '"'+self.base + VENN_CMD + '" --command ' + format + ' --include "' + files.join('" --include "') + '"';
                recordLog(command);
                exec(command, function(error, stdout, stderr) {
                    if (error) {
                        recordLog(error);
                    }
                    recordLog(stderr);
                    fs.writeFileSync(filename, stdout);
                    callback();
                });
            });
        });
    }

    exportOverlappedSequences(exportSettings, target_type, filename, callback) {
        const self = this;
        self.getDataSets(function(dataSets) {
            self.exportDataSetAsFasta(dataSets, target_type, function(fileList) {
                //exportSettings は最初に与えられたファイル順（1 開始）を key、含めるか排除するかを示す整数を value に持つオブジェクトだと思う
                let config = Object.keys(exportSettings).reduce(function(list, id) {
                    if (exportSettings[id] == 1) {
                        list['includes'].push(fileList[id]);
                    } else if (exportSettings[id] == -1) {
                        list['excludes'].push(fileList[id]);
                    }
                    return list;
                }, {'includes': [], 'excludes': []});
                let format = path.extname(filename).substr(1);
                let command = '"'+self.base + VENN_CMD + '" --command ' + format;
                command += ' --include "' + config['includes'].join('" --include "') + '"';
                if(config['excludes'].length > 0){
                    command += ' --exclude "' + config['excludes'].join('" --exclude "') + '"';
                }
                recordLog(command);
                exec(command, function(error, stdout, stderr) {
                    if (error) {
                        recordLog(error);
                    }
                    recordLog(stderr);
                    fs.writeFileSync(filename, stdout);
                    callback();
                });
            });
        });
    }
    getOutputFastqName(dirname,dataset){
        return dirname+'/'+dataset.name.replace(/[^.A-Za-z0-9\-]/,"_")+"."+dataset.cycle_no+".fastq.gz";
    };
    exportOverlappedSequencesFastq(exportSettings, target_type, filename, callback) {
        const self = this;
        self.getDataSets(function(dataSets) {
            self.exportDataSetAsFasta(dataSets, target_type, function(fileList) {
                //exportSettings は最初に与えられたファイル順（1 開始）を key、含めるか排除するかを示す整数を value に持つオブジェクトだと思う
                let config = Object.keys(exportSettings).reduce(function(list, id) {
                    if (exportSettings[id] == 1) {
                        list['includes'].push(fileList[id]);
                    } else if (exportSettings[id] == -1) {
                        list['excludes'].push(fileList[id]);
                    }
                    return list;
                }, {'includes': [], 'excludes': []});
                let format = path.extname(filename).substr(1);
                let command = '"'+self.base + VENN_CMD + '" --command csv ';
                command += ' --include "' + config['includes'].join('" --include "') + '"';
                if(config['excludes'].length > 0){
                    command += ' --exclude "' + config['excludes'].join('" --exclude "') + '"';
                }
                recordLog(command);
                /*
                {プロセスが kill される場合 https://lealog.hateblo.jp/entry/2013/04/04/010943
                encoding: 'utf8',
                timeout: 0,
                maxBuffer: 200*1024,
                killSignal: 'SIGTERM',
                cwd: null,// = CurrentWorkingDirectory
                env: null// = EnvironmentVariables
                }
                */
                exec(command, function(error, stdout, stderr) {
                    if (error) {
                        recordLog(error);
                    }
                    recordLog(stderr);
                    let slis = stdout.split(/[\r\n]+/);
                    self.getDataSets(function(dataSets) {
                        for(let dd = 0;dd < dataSets.length;dd++){
                            let dataSetId = dataSets[dd].id;
                            //let sequence_and_count = [];
                            let func_list = [
                                function(sequence_and_count){
                                    let gz = zlib.createGzip();
                                    const writer = fs.createWriteStream(self.getOutputFastqName(filename,dataSets[dd]));
                                    
                                    gz.pipe(writer);
                                    gz.on('error', function(err){
                                        if(err){
                                            recordLog("gzip error", err);
                                        }
                                    });
                                    
                                    /*gz.on('finish', function(){
                                        recordLog("finished.");
                                    });
                                    */
                                    for(let ii = 0;ii < sequence_and_count.length;ii++){
                                        let s = sequence_and_count[ii][0];
                                        let p = s.replace(/./gi, 'P');

                                        let c = sequence_and_count[ii][1];
                                        for(let ci = 0;ci < c;ci++){
                                            gz.write("@seq:"+ii+":"+ci+"\n");
                                            gz.write(s+"\n");
                                            gz.write("+\n");
                                            gz.write(p+"\n");
                                        }
                                    }
                                    gz.end();
                                }
                            ];
                            
                            for(let ii = 0;ii < slis.length;ii++){
                                let skey = slis[slis.length-1-ii];
                                if(skey.length < 1){
                                    continue;
                                }
                                let conditions = {key: skey,primary_only: true,};
                                let threshold={ratio: 0, A: 100,C: 100,G: 100,T: 100,lb_A: 0,lb_C: 0,lb_G: 0,lb_T: 0};
                                //dataSet に含まれるクラスターを全部取ってフィルタする
                                let current_func = function(sequence_and_count){
                                    self.getClusters(dataSetId, conditions, 1000000000,1, threshold,
                                        function(resultc) {
                                            let flist2 = [];
                                            for(let cc = 0;cc < resultc.clusters.length;cc++){
                                                //部分一致なので完全一致をとる
                                                if(resultc.clusters[cc].sequence[1] != skey){
                                                    continue;
                                                }
                                                flist2.push(
                                                    function(){
                                                        self.getSequences(dataSetId,resultc.clusters[cc].id , "", null, null, threshold, function (result) {
                                                            for(let ss = 0;ss < result.sequences.length;ss++){
                                                                sequence_and_count.push(
                                                                    [
                                                                        result.sequences[ss].sequence[0]
                                                                        +result.sequences[ss].sequence[1]
                                                                        +result.sequences[ss].sequence[2]
                                                                        ,result.sequences[ss].count
                                                                    ]
                                                                );
                                                            }
                                                            
                                                            if(flist2.length == 0){
                                                                let prev_func = func_list.pop();
                                                                prev_func(sequence_and_count);
                                                            }else{
                                                                let prev_func = flist2.pop();
                                                                prev_func();
                                                            }
                                                        });
                                                    }
                                                );
                                            }
                                            if(flist2.length == 0){
                                                let prev_func = func_list.pop();
                                                prev_func(sequence_and_count);
                                            }else{
                                                let prev_func = flist2.pop();
                                                prev_func();
                                            }
                                        }
                                    );
                                };
                                func_list.push(current_func);
                            }
                            let prev_func = func_list.pop();
                            prev_func([]);
                        }
                    });
                    callback();
                });
            });
        });
    }

    exportCompareData(dataSetId, numberOfCompare, page, filename, compareTarget, filterSettings, scoring_function, callback) {
        this.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, scoring_function, function(dataSets, dataList) {
            fs.open(filename, 'w', function(error, fd) {
                if (error) {
                    throw error;
                }
                dataList.forEach(function(data) {
                    fs.writeSync(fd, data.sequence + "\r\n");
                    fs.writeSync(fd, "DataSet,Sequence Count,Total Count,Ratio(%)\r\n");
                    dataSets.forEach(function (dataSet) {
                        let ratio = data.counts[dataSet.id] / dataSet.accepted_cluster_sequences * 100;
                        fs.writeSync(fd, dataSet.name + ',' + data.counts[dataSet.id] + ',' + dataSet.accepted_cluster_sequences + ',' + ratio + "\r\n");
                    })
                    fs.writeSync(fd, "\r\n");
                });
                fs.close(fd, function (error) {
                    if (error) {
                        throw error;
                    }
                    callback();
                });
            });
        });
    }

    generateReverseComplementStrand(ss){
        let aar = Array.from(ss.toUpperCase().replace(/[^A-Z]/g,""));
        let dpp = ss.toUpperCase().replace(/[A-Z]/g,"");
        if(dpp.length > 0){
            console.log(dpp+" was dropped.");
        }
        aar.reverse();
        let ret = [];
        let hs = {"A":"T","G":"C","T":"A","C":"G"};
        for(let ii = 0;ii < aar.length;ii++){
            if(aar[ii] in hs){
                ret.push(hs[aar[ii]]);
            }else{
                ret.push("N")
            }
        }
        return ret.join('');
    }
    
    levenshteinDistance(str1, str2) {
        let ret1 = this.levenshteinDistance_run(str1,str2);
        let ret2 = this.levenshteinDistance_run(str1,this.generateReverseComplementStrand(str2));
        if(ret2 < ret1){
            return ret1+"("+ret2+")";
        }else{
            return ret1;
        }
    }
    
    levenshteinDistance_run(str1, str2) {
        var len1 = str1.length;
        var len2 = str2.length;

        var d = [];
        for (let i = 0; i <= len1; ++i) {
            d[i] = [];
            d[i][0] = i;
        }
        for (let i = 0; i <= len2; ++i) {
            d[0][i] = i;
        }

        let cost = 0;
        for (let i = 1; i <= len1; ++i) {
            for (let j = 1; j <= len2; ++j) {
                cost = str1[i - 1] == str2[j - 1] ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            }
        }
        return d[len1][len2];
    }
}

module.exports = Analysis;
