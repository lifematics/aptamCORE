const {app, Menu, BrowserWindow, ipcMain, dialog, webContents} = require('electron');
const path = require('path');
const url = require('url');
const process = require('process');
const Analysis = require('./src/libs/analysis');
const AppPreferences = require('./src/libs/preferences');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
//ToDo 名前の変更
const AnalysisPresets = require('./src/libs/presets');

var window = null;
var analysis = null;
var appPreferences = null;
var analysisPresets = null;
var statisticData = null;
var windowTitle = '';
var fastqList = [];//{file1:Fastq へのパス, file2:Fastq へのパス}のリスト。
var scoringFunctionArr = [];
var defaultFilePath_debug = null;



//上昇傾向をとるためのスコア関数の設定
scoringFunctionArr.push(
    [
        "Ratio in the selected dataset"
        ,null
    ]
);
scoringFunctionArr.push(
    [
        "Minimum Diff: min(ratio$round_2-ratio$round_1,ratio$round_3-ratio$round_2,ratio$round_4-ratio$round_3....)"
        ,function(ratiolist){
            let lmin = ratiolist[ratiolist.length-1];
            for(let ii = 0;ii < ratiolist.length-1;ii++){
                lmin = Math.min(ratiolist[ii+1]-ratiolist[ii],lmin);
            }
            return lmin;
        }
    ]
);
scoringFunctionArr.push(
    [
        "Final Diff: ratio$last_round - ratio$first_round"
        ,function(ratiolist){
            return ratiolist[ratiolist.length-1]-ratiolist[0];
        }
    ]
);
scoringFunctionArr.push(
    [
        "Minimum Scale: min(ratio$round_2/(ratio$round_1+0.00001),ratio$round_3/(ratio$round_2+0.00001),ratio$round_4/(ratio$round_3+0.00001)....)"
        ,function(ratiolist){
            let lmin = ratiolist[1]/(ratiolist[0]+0.00001);
            for(let ii = 0;ii < ratiolist.length-1;ii++){
                lmin = Math.min(ratiolist[ii+1]/(ratiolist[ii]+0.00001),lmin);
            }
            return lmin;
        }
    ]
);
scoringFunctionArr.push(
    [
        "Final Scale: ratio$last_round/(ratio$first_round+0.00001)"
        ,function(ratiolist){
            return (ratiolist[ratiolist.length-1]/(ratiolist[0]+0.00001));
        }
    ]
);
//他コンポーネントでも使えるようにインスタンスの整理
var scoringFunctionDic = {};
var scoringFunctionNames = [];
for(let ii = 0;ii < scoringFunctionArr.length;ii++){
    scoringFunctionNames.push(scoringFunctionArr[ii][0]);
    scoringFunctionDic[scoringFunctionArr[ii][0]] = scoringFunctionArr[ii][1];
}


function analysisChanged(analysisConfig) {
    window.webContents.send('analysisChanged', analysisConfig);
    retrieveWindowTitle();
}

function retrieveWindowTitle(){
    let path = analysis.getPath();
    if (path) {
        window.setTitle(windowTitle + ' ' + path);
    } else {
        window.setTitle(windowTitle);
    }
}

function sendDataSetList()
{
    analysis.getDataSets((rows) => {
        window.webContents.send('dataSetListChanged', rows);
    });
}

function showSettingsDialog()
{
    appPreferences.show();
}

app.on('ready', () => {

    windowTitle = 'aptamCORE';

    window = new BrowserWindow({
        title: windowTitle,
        width: 1280,
        height: 960,
        webPreferences: {
            webSecurity: true,
            nodeIntegration: true,
            defaultFontSize: 12,
        }
    });

    let basedir = "."
    if (process.env.NODE_ENV === 'debug') {
        basedir = process.cwd();
        basedir = basedir.replace(/node_modules[\\\/]+electron[\\\/]+dist$/,"dist");
        analysis = new Analysis(basedir);
        window.loadURL('http://localhost:8080/');
        windowTitle = windowTitle + ' ' + process.env.npm_package_version;
    } else {
        basedir = path.dirname(app.getPath('exe'));
        analysis = new Analysis(basedir);
        window.loadURL(url.format({
            pathname: path.join(__dirname, 'dist/index.html'),
            protocol: 'file:',
            slashes: true,
        }))
        windowTitle = windowTitle + ' ' + app.getVersion();
    }
    
    
    if (fs.existsSync(path.join(basedir,'license_keys.lic'))) {
        appPreferences = new AppPreferences(true);
    }else{
        appPreferences = new AppPreferences(false);
    }
    window.webContents.on('did-finish-load', function() {
        window.webContents.send('hasLicense', [appPreferences.hasLicense]);
        window.webContents.send('set-scoring-function-names',scoringFunctionNames);
    });
    appPreferences.setListener(function(preferences) {
        window.webContents.send('preferencesChanged', preferences);
    });

    analysisPresets = new AnalysisPresets('presets');
    statisticData = new AnalysisPresets('statistics');

    window.setTitle(windowTitle);


    // Emitted when the window is closed.
    window.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        window = null
    });

    app.on('window-all-closed', () => {
      app.quit();
    });

    createMenu();

    ipcMain.on('set-default-file-path', (event, args) => {
        defaultFilePath_debug = args["defaultFilePath"];
    });
    ipcMain.on('open-url', (event, args) => {
        require('electron').shell.openExternal(args[0]);
    });

    ipcMain.on('load-preferences', (event, args) => {
        window.webContents.send('preferencesChanged', appPreferences.get());
    });
    ipcMain.on('load-presets', (event, args) => {
        window.webContents.send('presetsChanged', analysisPresets.get());
    });
    ipcMain.on('savePreset', (event, args) => {
        analysisPresets.save(args[0], args[1]);
        
        //writeFileSync なので問題ないはず
        window.webContents.send('presetsChanged', analysisPresets.get());
    });
    ipcMain.on('removePreset', (event, args) => {
        analysisPresets.remove(args[0]);
        window.webContents.send('presetsChanged', analysisPresets.get());
    });

    analysis.setStatisticDataRecorder(statisticData);
    analysis.setPreferences(appPreferences);

    //preferences を変更する。テストでの使用以外は想定していない。
    ipcMain.on('change-preferences-debug',(event,args) => {
        appPreferences.changePreferencesDebug(args['preferences']);
        analysis.setPreferences(appPreferences);
        window.webContents.send('preferencesChanged', appPreferences.get());
    });

    //dataset を変更する。テストでの使用以外は想定していない。
    ipcMain.on('change-dataset-debug',(event,args) => {
        window.webContents.send('changeDataset',args);
    });

    
    ipcMain.on('load-datasets', (event, args) => {
        sendDataSetList();
    });
    ipcMain.on('load-clusters', (event, args) => {
        let dataSetId = args[0];
        let searchConditions = args[1];
        let listSize = args[2];
        let page = args[3];
        let threshold = args[4];
        analysis.getClusters(dataSetId, searchConditions, listSize, page, threshold, (result) => {
            window.webContents.send('clusterListChanged', result);
        });
    });
    ipcMain.on('load-sequences', (event, args) => {
        let dataSetId = args[0];
        let clusterId = Number(args[1]);
        let key = args[2];
        let listSize = args[3];
        let page = args[4];
        let threshold = args[5];
        if (args[1] === null) {
	        analysis.getSequences(dataSetId, clusterId, key, listSize, page, threshold, (result) => {
                window.webContents.send('allSequenceListChanged', result);
	        });
        } else {
	        analysis.getSequences(dataSetId, clusterId, key, listSize, page, threshold, (result) => {
                window.webContents.send('sequenceListChanged', result);
	        });
        }
    });
    ipcMain.on('load-compare-one',(event,args) => {
        let dataSetId = args["dataset_id"];
        let clusterId = args["cluster_id"];
        let selected_sequence = args["selected_sequence"];
        let key = args["key"];
        let listSize = 1;
        let threshold = 0.0;
        let numberOfCompare = 1;
        let page = 1;
        let compareTarget = args["target"];
        if(args["cluster_id"] && key){//clusterId が指定されている時は、Key は空であるはず。Cluster representative の配列を基準にするため
            window.webContents.send('send-to-console',"?????");
        }
        //compare one からの呼び出しであることを示すフラグを filter settings に入れているがよくないかも
        //次に何か加えることがあれば変更
        if(args["cluster_id"]){
            //Clusters パネルからの呼び出し
            analysis.getSequences(dataSetId, clusterId, key, listSize, page, threshold, (result) => {
                let filterSettings = {'conditions':{'key':result['sequences'][0]['sequence'][1], primary_only:compareTarget == "cluster_representative"}
                ,'threshold':{ratio: 0, A: 100, C: 100, G: 100, T: 100, lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0}
                ,'compare_one':true};
                analysis.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, null, function(dataSets, data) {
                    //window.webContents.send('send-to-console',data);
                    window.webContents.send('update-compare-one-view', { selected_sequence:selected_sequence, dataSets: dataSets, data: data, total: 100, page: 1, size: 1});
                });
            });
        }else{
            //Sequences パネルからの呼び出し
            let filterSettings = {'conditions':{'key':key, 'primary_only':compareTarget == "cluster_representative"}
            ,'threshold':{ratio: 0, A: 100, C: 100, G: 100, T: 100, lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0}
            ,'compare_one':true};
            analysis.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, null, function(dataSets, data) {
                //window.webContents.send('send-to-console',data);
                window.webContents.send('update-compare-one-view', { selected_sequence:selected_sequence, dataSets: dataSets, data: data, total: 100, page: 1, size: 1});
            });
        }
    });
    ipcMain.on('load-all-sequences', (event, args) => {
        let dataSetId = args[0];
        let listSize = args[1];
        let page = args[2];
        let threshold = args[3];
        analysis.getSequences(dataSetId, null, null, listSize, page, threshold, (result) => {
            window.webContents.send('allSequenceListChanged', result);
        });
    });
    ipcMain.on('load-dataset-info', (event, args) => {
        let dataSetId = args[0];
        analysis.getMergerInfo(dataSetId, (mergerresults) => {
            analysis.getDataSetInfo(dataSetId, (result) => {
                result["merger_results"] = mergerresults;
                window.webContents.send('dataSetInfoChanged', result);
            });
        });
    });

    ipcMain.on('estimate-finish-time',(event,args)=>{
        if(fastqList.length == 0){
            return;
        }
        let config = args[0];
        let kfunc = function(){ analysis.contFastqReads(
            fastqList[0]['file1']
            ,function(){
                let ssdata = statisticData.get();
                if(ssdata['estim_total_beta']){
                    let ctime = 0;
                    for(let fii=0;fii < fastqList.length;fii++){
                        if(fastqList[fii]["file1"].length > 0){
                            if(analysis.numEntries[fastqList[fii]['file1']]){
                                let v = [
                                    1.0,
                                    analysis.numEntries[fastqList[fii]['file1']],
                                    config['clustering_criteria'],
                                    config['max_variable_length']
                                ];
                                ctime += analysis.estimateProcessingTime(v,ssdata['estim_total_beta']);
                            }
                        }
                    }
                    if(ctime){
                        let dd = new Date();
                        dd.setTime(Date.now()+ctime);//単位はミリ秒
                        //window.webContents.send("set-etf","Estimated Finish Time: "+dd.toString());
                        let d = (ctime/1000/60/60/24).toFixed(0);
                        let h = (ctime/1000/60/60).toFixed(0);
                        let m = (ctime/1000/60).toFixed(0);
                        let s = (ctime/1000).toFixed(0);
                        s -= m*60 - 0.0001;
                        m -= h*60 - 0.0001;
                        h -= d*24 - 0.0001;
                        s = s.toFixed(0);
                        m = m.toFixed(0);
                        h = h.toFixed(0);

                        window.webContents.send("set-etf",d+" days, "+h+" hours, "+m+" mins, "+s+" secs");
                    }else{
                        window.webContents.send("set-etf","N/A");
                    }
                }
            });
            window.webContents.send("setLoading",false);
        };
        

        //全 FASTQ (forward のみ)に含まれる配列数をカウントする
        window.webContents.send("setLoading",true);
        let flist=[kfunc];
        for(let kk = 1;kk < fastqList.length;kk++){
            if(fastqList[kk]["file1"].length > 0){
                let lfunc =  function(){
                    analysis.contFastqReads(fastqList[kk]['file1'],flist.pop());
                };
                flist.push(lfunc);
            }
        }
        flist.pop().call();

    });


    ipcMain.on('analyze', (event, args) => {
        let flag = false;
        for(let ii = 0;ii < fastqList.length;ii++){
                if(fastqList[0]['file1'].length != 0){
                    flag = true;
                    break;
                }
        }
        if(!flag){
            return;
        }

        let config = args[0];
        //上の関数のコピペなので何か変更がある場合どちらか消すこと
        let kfunc = function(){ analysis.contFastqReads(
            fastqList[0]['file1']
            ,function(){
                let ssdata = statisticData.get();
                if(ssdata['estim_total_beta']){
                    let ctime = 0;
                    for(let fii=0;fii < fastqList.length;fii++){
                        if(fastqList[fii]["file1"].length > 0){
                            if(analysis.numEntries[fastqList[fii]['file1']]){
                                let v = [
                                    1.0,
                                    analysis.numEntries[fastqList[fii]['file1']],
                                    config['clustering_criteria'],
                                    config['max_variable_length']
                                ];
                                ctime += analysis.estimateProcessingTime(v,ssdata['estim_total_beta']);
                            }
                        }
                    }
                    if(ctime){
                        let dd = new Date();
                        dd.setTime(Date.now()+ctime);
                        window.setTitle("Estimated Finish Time: "+dd.toString());
                    }else{
                        window.setTitle("Estimated Finish Time: N/A");
                    }
                }
                window.webContents.send('start-analysis');
                let preferences = appPreferences.get();
                if(appPreferences.hasLicense){
                    if(preferences['notification']){
                        if(preferences['notification']['mailgun_api_key']){
                            if(preferences['notification']['mailgun_api_key'].length > 0){
                                analysis.setNotificationSettings(preferences['notification']['mailgun_api_key'], preferences['notification']['mailgun_domain']);
                            }
                        }
                    }
                }
                analysis.analyze(config,fastqList,function() {
                    sendDataSetList();
                    window.webContents.send('finish-analysis');
                    retrieveWindowTitle();
                });
            });
        };
        //全 FASTQ (forward のみ)に含まれる配列数をカウントする
        let flist=[kfunc];
        for(let kk = 1;kk < fastqList.length;kk++){
            if(fastqList[kk]["file1"].length > 0){
                let lfunc =  function(){
                    analysis.contFastqReads(fastqList[kk]['file1'],flist.pop());
                };
                flist.push(lfunc);
            }
        }
        flist.pop().call();
    });

    ipcMain.on('show-add-dataset-dialog',(event,args)=>{
        showAddDatasetDialog(args["start_pos"],args["file_label"],args["allow_multi"],args["overwrite"]);
    });

    ipcMain.on('set-fastq',(event,args)=>{
        fastqList = args[0];
    });

    

    ipcMain.on('onSorted', (event, args) => {
        analysis.updateOrders(args, function() {
            sendDataSetList();
        });
    });

    ipcMain.on('load-compare-data', (event, args) => {
        let dataSetId = args["dataset_id"];
        let numberOfCompare = args["number_of_compare"];
        let page = args["page"];
        let compareTarget = args["compare_target"];
        let filterSettings = args["filter_settings"];
        let scoring_function =  args["scoring_function"];
        if(scoring_function in scoringFunctionDic){
            if(scoringFunctionDic[scoring_function]){
                analysis.getDataSetClusterCount(dataSetId, filterSettings["conditions"],filterSettings["threshold"] , function(count) {
                    analysis.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, scoringFunctionDic[scoring_function], function(dataSets, data) {
                        window.webContents.send('set-compare-data', { dataSets: dataSets, data: data, total: count, page: page, size: numberOfCompare });
                    });
                })
            }else{
                analysis.getDataSetClusterCount(dataSetId, filterSettings["conditions"],filterSettings["threshold"] , function(count) {
                    analysis.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, null, function(dataSets, data) {
                        window.webContents.send('set-compare-data', { dataSets: dataSets, data: data, total: count, page: page, size: numberOfCompare });
                    });
                })
            }
        }else{
            throw scoring_function+"is not found in dictionary!";
        }
    });
    ipcMain.on('export-compare-data', (event, args) => {
        let dataSetId = args["dataset_id"];
        let numberOfCompare = args["number_of_compare"];
        let page = args["page"];
        let compareTarget = args["compare_target"];
        let filterSettings = args["filter_settings"];
        let scoring_function = args["scoring_function"];
        let defpath = ".";
        if(defaultFilePath_debug){
            defpath = defaultFilePath_debug;
        }
        dialog.showSaveDialog(window, {
            properties: ['promptToCreate'],
            title: 'Specify an output file',
            defaultPath: defpath,
            filters: [
                {name: 'CSV File', extensions: ['csv']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('send-to-console',"Save as "+filename+".");
                analysis.exportCompareData(dataSetId, numberOfCompare, page, filename, compareTarget, filterSettings, scoringFunctionDic[scoring_function], function () {
                    window.webContents.send('finish-export');
                });
            }
        })
    });
    ipcMain.on('get-venn-data', (event, args) => {
        analysis.getVennData(args["target_type"],function(data) {
            window.webContents.send('set-venn-data', data);
        });
    });
    ipcMain.on('write_to_file', (event, args) => {
        let defpath = ".";
        if(defaultFilePath_debug){
            defpath = defaultFilePath_debug;
        }
        dialog.showSaveDialog(window, {
            properties: ['promptToCreate'],
            title: 'Specify an output file',
            defaultPath: defpath,
            filters: [
                {name: 'Text File', extensions: ['txt']},
            ]
        }).then(
            function(result) {
                let filename = result.filePath;
                if (filename) {
                    window.webContents.send('send-to-console',"Save as "+filename+".");
                    writeToFile(filename,args["lines"]);
                }
            }
        );
    });
    ipcMain.on('export-cluster-data', (event, args) => {
        let defpath = ".";
        if(defaultFilePath_debug){
            defpath = defaultFilePath_debug;
        }
        dialog.showSaveDialog(window, {
            properties: ['promptToCreate'],
            title: 'Specify an output file',
            defaultPath: defpath,
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File for Sequence Logo', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('send-to-console',"Save as "+filename+".");
                let conditions = args[1];
                let threshold = args[2];
                window.webContents.send('start-export');
                analysis.exportClusters(args[0], filename, conditions, threshold, function () {
                    window.webContents.send('finish-export');
                });
            }
        })
    });
    ipcMain.on('export-sequence-data', (event, args) => {
        let defpath = ".";
        if(defaultFilePath_debug){
            defpath = defaultFilePath_debug;
        }
        dialog.showSaveDialog(window, {
            properties: ['promptToCreate'],
            title: 'Specify an output file',
            defaultPath: defpath,
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File for Sequence Logo', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('send-to-console',"Save as "+filename+".");
                window.webContents.send('start-export');
                analysis.exportSequences(args[0], args[1], filename, args[2], args[3],function () {
                    window.webContents.send('finish-export');
                });
            }
        });
    });
    ipcMain.on('export-intersection-sequence-data', (event, args) => {
        let defpath = ".";
        if(defaultFilePath_debug){
            defpath = defaultFilePath_debug;
        }
        dialog.showSaveDialog(window, {
            properties: ['promptToCreate'],
            title: 'Specify an output file',
            defaultPath: defpath,
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('send-to-console',"Save as "+filename+".");
                window.webContents.send('start-export');
                analysis.exportCommonSequences(args["settings"], args["target_type"], filename, function() {
                    window.webContents.send('finish-export');
                });
            }
        })
    });
    ipcMain.on('export-overlapped-sequences', (event, args) => {
        let defpath = ".";
        if(defaultFilePath_debug){
            defpath = defaultFilePath_debug;
        }
        window.webContents.send('send-to-console','export-overlapped-sequences');
        dialog.showSaveDialog(window, {
            properties: ['promptToCreate'],
            title: 'Specify an output file',
            defaultPath: defpath,
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('send-to-console',"Save as "+filename+".");
                window.webContents.send('start-export');
                analysis.exportOverlappedSequences(args["settings"], args["target_type"], filename, function() {
                    window.webContents.send('finish-export');
                });
            }
        });
    });
    ipcMain.on('export-overlapped-sequences-fastq', (event, args) => {
        showFastqSaveDialog(args["settings"],0,args["target_type"]);
    });
    ipcMain.on('start-new-analysis', (event, args) => {
        showNewAnalysisDialog();
    });
    ipcMain.on('open-analysis', (event, args) => {
        showOpenAnalysisDialog();
    });
});

function showFastqSaveDialog(args,counter,target_type){
    let defpath = ".";
    if(defaultFilePath_debug){
        defpath = defaultFilePath_debug;
    }
    dialog.showOpenDialog(window, {
        //properties: ['openDirectory',"openFile","promptToCreate","createDirectory"],
        properties: ['openDirectory'],
        title: 'Select an output directory',
        defaultPath: defpath,
    }).then(function(result) {
        let filename = result.filePaths[0];
        if (filename) {
            //https://github.com/electron/electron/issues/9411
            //今のところ存在しないディレクトリの指定はできないようだ
            /*。
            try {
                fs.statSync(filename);
            } catch(e) {
                if(e.code === 'ENOENT') {
                    window.webContents.send('send-to-console',filename);
                    fs.mkdirSync(filename);
                }
            }
            */
           
            analysis.getDataSets(function(dataSets) {
                let fileflag = [];
                for(let dd = 0;dd < dataSets.length;dd++){
                    let fname = analysis.getOutputFastqName(filename,dataSets[dd]);
                    try {
                        fs.statSync(fname);
                        fileflag.push(fname);
                    } catch(e) {
                    }
                }
                if(fileflag.length == 0){
                    window.webContents.send('start-export');
                    analysis.exportOverlappedSequencesFastq(args, target_type, filename, function() {
                        window.webContents.send('finish-export');
                    });
                }else{
                    dialog.showMessageBox(
                        null,
                        {
                          message: fileflag.join(",")+" already exist.\n Do you want to overwrite files?",
                          buttons: ["Yes","No", "Cancel"],
                        }) .then(dresult => {
                            if (dresult.response === 0) {
                                window.webContents.send('start-export');
                                analysis.exportOverlappedSequencesFastq(args, target_type, filename, function() {
                                    window.webContents.send('finish-export');
                                });
                            } else if (dresult.response === 1) {
                                if(counter > 10){
                                    dialog.showErrorBox("Limit exceeded","You have pressed too much No button.");
                                }else{
                                    showFastqSaveDialog(args, counter+1, target_type);
                                }
                            }else{
                                //Cancel
                            }
                        }
                    );
                }
            });
        }
    });
}
function showNewAnalysisDialog(){
    let defpath = ".";
    if(defaultFilePath_debug){
        defpath = defaultFilePath_debug;
    }
    dialog.showSaveDialog(window, {
        properties: ['promptToCreate'],
        title: 'Select an analysis file',
        defaultPath: defpath,
        filters: [
            {name: 'Analysis File', extensions: ['db']}
        ]
    }).then(function(result) {
        let filename = result.filePath;
        if (filename) {
            window.webContents.send('send-to-console',"Save as "+filename+".");
            let ext = path.extname(filename);
            if(ext.length == 0 || ext.length > 15){
                filename += ".db";
            }
            if(analysis.getPath() == filename){
                dialog.showErrorBox("Error", "Can not use the same file name with the current db.");
            }else{
                analysis.create(filename, (analysisConfig) => {
                    //fastqList = [];
                    analysisChanged(analysisConfig);
                });
            }
        }
    });
}

//startpos: 複数ファイルが選択されたときに最初に挿入される行。
//filelabel: file1 もしくは file2。
//allowmulti: multi selection を許すか。既にファイルのあるエリアがクリックされた場合は許さない。
function showAddDatasetDialog(startpos,filelabel,allowmulti,overwrite){
    let proparray = ['openFile'];
    if(allowmulti){
        proparray.push('multiSelections');
    }
    dialog.showOpenDialog(null, {
        properties: proparray,
        title: 'Select a dataset file',
        defaultPath: '.',
        filters: [
            {name: 'Dataset File', extensions: ['fastq','fq','fq.gz','fastq.gz']}
        ]
    }).then(function(result) {
        let filenames = result.filePaths;
        if (filenames.length > 0) {
            window.webContents.send('addFastqFiles', {"fastq_list":filenames,"start_pos":startpos,"file_label":filelabel,"overwrite":overwrite});
        }
    });
}
function writeToFile(filename,lines){
    fs.open(filename, 'w', function(error, fd) {
        if (error) {
            throw error;
        }
        for(let ii = 0;ii < lines.length;ii++){
            fs.writeSync(fd, lines[ii] + "\r\n");
        }
        fs.close(fd, (err) => {
            if (err){throw err;}
        });
    });
}
function showOpenAnalysisDialog(){
    let defpath = ".";
    if(defaultFilePath_debug){
        defpath = defaultFilePath_debug;
    }
    dialog.showOpenDialog(null, {
        properties: ['openFile'],
        title: 'Select an analysis file',
        defaultPath: defpath,
        filters: [
            {name: 'Analysis File', extensions: ['db']},
            {name: "All Files",extensions: ["*"]}
        ]
    }).then(function(result) {
        let filenames = result.filePaths;
        if (filenames.length > 0) {
            checkOldFileFormat(filenames[0],function(){
                analysis.setPath(filenames[0], (analysisConfig) => {
                    analysisChanged(analysisConfig);
                });
            },null);
        }
    });
}
function createMenu() {
    let template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Analysis', click: () => {
                        showNewAnalysisDialog();
                    }
                },
                {
                    label: 'Open Analysis', click: () => {
                        showOpenAnalysisDialog();
                    }
                },
                {
                    label: 'Close Analysis', click: () => {
                        analysis.setPath(null, () => {
                            analysisChanged(null);
                        });
                    }
                },
                { type: 'separator' },
                {
                    label: 'Add DataSet', click: () => {
                        showAddDatasetDialog(0,"file1",true,false);
                    }
                },
            ]
        },
        /*
        {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
            ]
        },
        */
    ]
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.name,
            submenu: [
                {role: 'about'},
                {type: 'separator'},
                {role: 'services'},
                {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {
                    label: 'Settings',
                    accelerator: "CmdOrCtrl+,",
                    click(item, focusedWindow) {
                        showSettingsDialog();
                    }
                },
                {type: 'separator'},
                {role: 'quit'}
            ]
        })
    } else {
      template.unshift({
          label: app.name,
          submenu: [
            {
                label: 'Settings',
                accelerator: "CmdOrCtrl+,",
                click(item, focusedWindow) {
                    showSettingsDialog();
                }
            },
            {type: 'separator'},
            {
                label: 'DevTools',
                accelerator: "CmdOrCtrl+Shift+K",
                click(item, focusedWindow) {
                    if(window.webContents.isDevToolsOpened()){
                        window.webContents.closeDevTools();
                    }else{
                        // Open the DevTools.
                        window.webContents.openDevTools();
                    }
                }
            },
              {type: 'separator'},
              {role: 'quit'}
          ]
      })
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
//ipcMain.on('convert-old-file', (event, args) => {
function checkOldFileFormat(filepath,default_function,cancel_function){
    
    let chkdb = new sqlite3.Database(filepath);
    chkdb.get("SELECT * FROM sqlite_master WHERE name='ratio_tables'", function(error, row) {
        chkdb.close();
        if(row && row.length != 0){
            default_function();
        }else{
            var options = {
                type: 'info',
                buttons: ['OK','Cancel'],
                title: 'Old file format',
                message: 'The format of this file is old. Please specify new db file path for the converted file.'
            };
            dialog.showMessageBox(window, options).then(function(result){
                if(result.response === 1){
                    if(cancel_function){
                        cancel_function();
                    }
                    return;
                }
                dialog.showSaveDialog(window, {
                    properties: ['promptToCreate'],
                    title: 'Enter New DB File name',
                    defaultPath: ".",
                    filters: [
                        {name: 'Analysis File', extensions: ['db']},
                    ]
                }).then(function(result) {
                    let newfilename = result.filePath;
                    if (newfilename) {
                        if(newfilename != filepath){
                            fs.copyFileSync(filepath,newfilename);
                        }
                        analysis.setPath(newfilename, (analysisConfig) => {
                            let letters_track = ["A","C","G","T"];
                            analysis.db.serialize(() => {
                            analysis.db.run("CREATE TABLE ratio_tables (letter TEXT,sequence_table_name TEXT,cluster_table_name TEXT)", (error) => {
                                if (error) {
                                    analysis.notifier.send(error);
                                    throw error;
                                }
                            });
                
                            for(let ii = 0;ii < letters_track.length;ii++){
                                console.log("pushing "+ii);
                                analysis.createRatioTable(letters_track[ii]);
                            }
                            analysis.createRatioRecords(letters_track,"sequences",function(){
                                    analysis.createRatioRecords(letters_track,"clusters",function(){analysisChanged(analysisConfig);})
                                });
                            }); 
                            
                        });
                    }
                });
            });
        }
    }); 
}