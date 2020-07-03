const { app } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');


class AnalysisPresets {

    constructor(basename) {
        if(basename){
            this.path = path.resolve(app.getPath('userData'), basename+'.json');
            console.log('loading ' + this.path);
            this.load();
        }else{
            return null;
        }
    }

    isPresetsExist() {
        try {
            fs.statSync(this.path);
            return true;
        } catch(e) {
            if(e.code === 'ENOENT') {
                return false;
            }
        }
    }

    loadDefault() {
        this.presets = {
            '': {
            },
        };
    }

    checkOldData(){//次バージョンでは削除の予定
        this.loadDefault();
        let pathnames = [];
        /*
        if(RegExp('presets\.json$').test(this.path)){
            pathnames = ["Sequence Analyzer","Sequence Family Tracer","aptamCORE"];
        }else{
            pathnames = ["aptamCORE"];
        }
        */
        pathnames = ["aptamCORE"];
        for(let ii = 0;ii < pathnames.length;ii++){
            let ffpath = this.path.replace(/aptamCORE/,pathnames[ii]);
            if(fs.existsSync(ffpath)){
                try{
                    let jsonStr = fs.readFileSync(ffpath, 'utf8');
                    if (jsonStr) {
                        try {
                            let pp = JSON.parse(jsonStr);
                            for(let kk in pp){
                                this.presets[kk] = pp[kk];
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }catch(e){
                    console.log(e);
                }
            }
        }
    }

    load() {
        return this.checkOldData();
        /*
        if (!this.isPresetsExist()) {
            this.loadDefault();
        } else {
            let jsonStr = fs.readFileSync(this.path, 'utf8');
            if (jsonStr) {
                try {
                    this.presets = JSON.parse(jsonStr);
                } catch (e) {
                    console.log(jsonStr);
                    console.log(e);
                    this.loadDefault();
                }
            } else {
                this.loadDefault();
            }
        }
        */
    }

    save(name, preset) {
        this.presets[name] = preset;
        let jsonStr = JSON.stringify(this.presets, null, '  ');
        fs.writeFileSync(this.path, jsonStr);
    }

    remove(name){
        if(name in this.presets){
            delete this.presets[name];
            let jsonStr = JSON.stringify(this.presets, null, '  ');
            fs.writeFileSync(this.path, jsonStr);
        }else{
            console.log(name+" was not found in presets.");
        }
    }

    get() {
        return this.presets;
    }
}

module.exports = AnalysisPresets;