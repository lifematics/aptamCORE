const {app, Menu, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const url = require('url')
const process = require('process')
const Analysis = require('./src/libs/analysis')
const AppPreferences = require('./src/libs/preferences')
const fs = require('fs')
//ToDo 名前の変更
const AnalysisPresets = require('./src/libs/presets')

var window = null;
var analysis = null;
var appPreferences = null;
var analysisPresets = null;
var statisticData = null;
var windowTitle = '';
var fastqList = [];//{file1:Fastq へのパス, file2:Fastq へのパス}のリスト。


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

    appPreferences.setListener(function(preferences) {
        window.webContents.send('preferencesChanged', preferences);
    });

    analysisPresets = new AnalysisPresets('presets');
    statisticData = new AnalysisPresets('statistics');

    window.setTitle(windowTitle);

    // Open the DevTools.
    window.webContents.openDevTools()

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
    analysis.setStatisticDataRecorder(statisticData);
    analysis.setPreferences(appPreferences);
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

                let numberOfCompare = 5;
                let page = 1;
                let compareTarget = "cluster_representative";
                console.log(result['sequences'][0]['sequence'][1]);
                let filterSettings = {'conditions':{'key':result['sequences'][0]['sequence'][1], primary_only:false}
                ,'threshold':{ratio: 0, A: 100, C: 100, G: 100, T: 100, lb_A: 0, lb_C: 0, lb_G: 0, lb_T: 0}};
                //window.webContents.send("set-search-cluster-threshold",filterSettings);
                //Compare と Cluster で値を共有しているので、こちらで filter するとテーブルの方も Filter されてしまう。
                analysis.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, function(dataSets, data) {
                    //window.webContents.send('update-compare-one-view', { dataSets: dataSets, data: data, total: 100, page: page, size: numberOfCompare });
                    window.webContents.send('set-compare-data', { dataSets: dataSets, data: data, total: 100, page: 1, size: 1});
                    window.webContents.send('update-compare-one-view');
                });
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
    ipcMain.on('analyze', (event, args) => {
        if(fastqList.length == 0){
            return;
        }

        let config = args[0];
        let kfunc = function(){ analysis.contFastqReads(
            fastqList[0]['file1']
            ,function(){
                let ssdata = statisticData.get();
                if(ssdata['estim_total_beta']){//ToDo: fastq 全部見る
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
                if(preferences['notification']){
                    if(preferences['notification']['mailgun_api_key']){
                        if(preferences['notification']['mailgun_api_key'].length > 0){
                            analysis.setNotificationSettings(preferences['notification']['mailgun_api_key'], preferences['notification']['mailgun_domain']);
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
        analysis.getDataSetClusterCount(dataSetId, filterSettings["conditions"],filterSettings["threshold"] , function(count) {
            analysis.getCompareData(dataSetId, numberOfCompare, page, compareTarget, filterSettings, function(dataSets, data) {
                window.webContents.send('set-compare-data', { dataSets: dataSets, data: data, total: count, page: page, size: numberOfCompare });
            });
        })
    });
    ipcMain.on('export-compare-data', (event, args) => {
        let dataSetId = args["dataset_id"];
        let numberOfCompare = args["number_of_compare"];
        let page = args["page"];
        let compareTarget = args["compare_target"];
        let filterSettings = args["filter_settings"];
        dialog.showSaveDialog(null, {
            properties: ['promptToCreate'],
            title: 'Specify a output file',
            defaultPath: '.',
            filters: [
                {name: 'CSV File', extensions: ['csv']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                analysis.exportCompareData(dataSetId, numberOfCompare, page, filename, compareTarget,filterSettings, function () {
                    window.webContents.send('finish-export');
                });
            }
        })
    });
    ipcMain.on('get-venn-data', (event, args) => {
        analysis.getVennData(function(data) {
            window.webContents.send('set-venn-data', data);
        });
    });
    ipcMain.on('export-cluster-data', (event, args) => {
        dialog.showSaveDialog(null, {
            properties: ['promptToCreate'],
            title: 'Specify a output file',
            defaultPath: '.',
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
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
        dialog.showSaveDialog(null, {
            properties: ['promptToCreate'],
            title: 'Specify a output file',
            defaultPath: '.',
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('start-export');
                analysis.exportSequences(args[0], args[1], filename, args[2], args[3],function () {
                    window.webContents.send('finish-export');
                });
            }
        });
    });
    ipcMain.on('export-intersection-sequence-data', (event, args) => {
        dialog.showSaveDialog(null, {
            properties: ['promptToCreate'],
            title: 'Specify a output file',
            defaultPath: '.',
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('start-export');
                analysis.exportCommonSequences(args, filename, function() {
                    window.webContents.send('finish-export');
                });
            }
        })
    });
    ipcMain.on('export-overlapped-sequences', (event, args) => {
        console.log('export-overlapped-sequences');
        dialog.showSaveDialog(null, {
            properties: ['promptToCreate'],
            title: 'Specify a output file',
            defaultPath: '.',
            filters: [
                {name: 'CSV File', extensions: ['csv']},
                {name: 'Fasta File', extensions: ['fasta']},
            ]
        }).then(function(result) {
            let filename = result.filePath;
            if (filename) {
                window.webContents.send('start-export');
                analysis.exportOverlappedSequences(args, filename, function() {
                    window.webContents.send('finish-export');
                });
            }
        });
    });
    ipcMain.on('start-new-analysis', (event, args) => {
        showNewAnalysisDialog();
    });
    ipcMain.on('open-analysis', (event, args) => {
        showOpenAnalysisDialog();
    });
});

function showNewAnalysisDialog(){
    dialog.showSaveDialog(null, {
        properties: ['promptToCreate'],
        title: 'Select a analysis file',
        defaultPath: '.',
        filters: [
            {name: 'Analysis File', extensions: ['db']}
        ]
    }).then(function(result) {
        let filename = result.filePath;
        if (filename) {
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

function showOpenAnalysisDialog(){
    dialog.showOpenDialog(null, {
        properties: ['openFile'],
        title: 'Select a analysis file',
        defaultPath: '.',
        filters: [
            {name: 'Analysis File', extensions: ['db']}
        ]
    }).then(function(result) {
        let filenames = result.filePaths;
        if (filenames.length > 0) {
            analysis.setPath(filenames[0], (analysisConfig) => {
                analysisChanged(analysisConfig);
            });
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
              {role: 'quit'}
          ]
      })
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
