const { app } = require('electron');
const path = require('path');
const os = require('os');
const ElectronPreferences = require('electron-preferences');

let defaultPreferences = {
    "view": {
        "items": [
            "copy_button",
            "id",
            "ngs_id",
            "head",
            "variable",
            "tail",
            "variable_length",
            "variable_distance",
            "total_length",
            "count",
            "ratio",
            "a_ratio",
            "c_ratio",
            "g_ratio",
            "t_ratio",
        ],
        "list_size": 100,
    },
    "color": {
        "primers": ['on'],
        "a": "#5050ff",
        "c": "#e00000",
        "g": "#00c000",
        "t": "#e6e600",
    },
    "compare": {
        "value": "count",
        "count": 5,
        "width": 450,
        "height": 400
    },
};

let preferences_hs_ = {

    /**
     * Where should preferences be saved?
     */
    'dataStore': path.resolve(app.getPath('userData'), 'preferences.json'),

    /**
     * Default values.
     */
    'defaults': defaultPreferences,

    /**
     * The preferences window is divided into sections. Each section has a label, an icon, and one or
     * more fields associated with it. Each section should also be given a unique ID.
     */
    'sections': [
        {
            'id': 'view',
            'label': 'View',
            'icon': 'eye-19',
            'form': {
                'groups': [
                    {
                        'label': 'View',
                        'fields': [
                            {
                                'label': 'Visible Items',
                                'key': 'items',
                                'type': 'checkbox',
                                'options': [
                                    {'label': 'Copy Sequence Button', 'value': 'copy_button'},
                                    {'label': 'Copy and Go Button', 'value': 'copy_and_go_button'},
                                    {'label': 'ID', 'value': 'id'},
                                    {'label': 'NGS ID', 'value': 'ngs_id'},
                                    {'label': 'Head', 'value': 'head'},
                                    {'label': 'Variable', 'value': 'variable'},
                                    {'label': 'Tail', 'value': 'tail'},
                                    {'label': 'Variable Length', 'value': 'variable_length'},
                                    {'label': 'Total Length', 'value': 'total_length'},
                                    {'label': 'Count', 'value': 'count'},
                                    {'label': 'Ratio', 'value': 'ratio'},
                                    {'label': 'A Ratio', 'value': 'a_ratio'},
                                    {'label': 'C Ratio', 'value': 'c_ratio'},
                                    {'label': 'G Ratio', 'value': 'g_ratio'},
                                    {'label': 'T Ratio', 'value': 't_ratio'},
                                    {'label': 'Levenshtein Distance from Representative', 'value': 'variable_distance'},
                                ],
                            },
                        ],
                    },
                    {
                        'label': 'List Settings',
                        'fields': [
                            {
                                'label': 'Number of List Sequences',
                                'key': 'list_size',
                                'type': 'text',
                            },
                        ],
                    },
                ]
            },
        },
        {
            'id': 'compare',
            'label': 'Compare',
            'icon': 'zoom-2',
            'form': {
                'groups': [
                    {
                        'label': 'Graph Value',
                        'fields': [
                            {
                                'label': 'Width of Compare Graph',
                                'key': 'value',
                                'type': 'radio',
                                'options': [
                                    {'label': 'Count', 'value': 'count'},
                                    {'label': 'Ratio', 'value': 'ratio'},
                                ],
                            },
                        ],
                    },
                    {
                        'label': 'Number of Graphs per Page',
                        'fields': [
                            {
                                'label': 'Number of Graphs per Page',
                                'key': 'count',
                                'type': 'text',
                            },
                        ],
                    },
                    {
                        'label': 'Graph Width',
                        'fields': [
                            {
                                'label': 'Width of Compare Graph',
                                'key': 'width',
                                'type': 'text',
                            },
                        ],
                    },
                    {
                        'label': 'Graph Height',
                        'fields': [
                            {
                                'label': 'Height of Compare Graph',
                                'key': 'height',
                                'type': 'text',
                            },
                        ],
                    }
                ],
            },
        },
        {
            'id': 'color',
            'label': 'Color',
            'icon': 'pencil',
            'form': {
                'groups': [
                    {
                        'label': 'Color',
                        'fields': [
                            {
                                'label': 'Primers',
                                'key': 'primers',
                                'type': 'checkbox',
                                'options': [
                                    {'label': 'Color Primer', 'value': 'on'}
                                ],
                            },
                            {
                                'label': 'Color of A',
                                'key': 'a',
                                'type': 'color',
                                'format': 'hex',
                            },
                            {
                                'label': 'Color of C',
                                'key': 'c',
                                'type': 'color',
                                'format': 'hex',
                            },
                            {
                                'label': 'Color of G',
                                'key': 'g',
                                'type': 'color',
                                'format': 'hex',
                            },
                            {
                                'label': 'Color of T',
                                'key': 't',
                                'type': 'color',
                                'format': 'hex',
                            }
                        ]
                    }
                ],
            },
        },
        {
            'id': 'copy_and_go',
            'label': 'Copy and Go',
            'icon': 'spaceship',
            'form': {
                'groups': [
                    {
                        'label': 'Target URL',
                        'fields': [
                            {
                                'label': 'URL 1',
                                'key': 'copy_and_go_url_1',
                                'type': 'text',
                            },
                            {
                                'label': 'URL 2',
                                'key': 'copy_and_go_url_2',
                                'type': 'text',
                            },
                            {
                                'label': 'URL 3',
                                'key': 'copy_and_go_url_3',
                                'type': 'text',
                            },
                            {
                                'label': 'URL 4',
                                'key': 'copy_and_go_url_4',
                                'type': 'text',
                            },
                            {
                                'label': 'URL 5',
                                'key': 'copy_and_go_url_5',
                                'type': 'text',
                            },
                        ]
                    }
                ],
            },
        },
        
    ],
};

class AppPreferences {
    constructor(has_license) {
        let preferences_hs = JSON.parse(JSON.stringify(preferences_hs_));
        
        Object.keys(defaultPreferences).forEach(function(section) {
            if (!preferences_hs[section]) {
                preferences_hs[section] = defaultPreferences[section];
            } else {
                Object.keys(defaultPreferences[section]).forEach(function(item) {
                    if (!preferences_hs[section][item]) {
                        preferences_hs[section][item] = defaultPreferences[section][item];
                    }
                });
            }
        });
        if(has_license){
            defaultPreferences["notification"] = {
                "mailgun_api_key": "<You need a license for this function.>",
                "mailgun_domain": ""
            };
            preferences_hs["sections"].push(
                {
                    'id': 'notification',
                    'label': 'Notification',
                    'icon': 'send-2',
                    'form': {
                        'groups': [
                            {
                                'label': 'Mailgun Settings',
                                'fields': [
                                    {
                                        'label': 'API Key',
                                        'key': 'mailgun_api_key',
                                        'type': 'text',
                                    },
                                    {
                                        'label': 'Domain',
                                        'key': 'mailgun_domain',
                                        'type': 'text',
                                    },
                                ],
                            },
                        ]
                    },
                },
            );    
        }
        this.hasLicense = has_license;
        this.preferences = new ElectronPreferences(preferences_hs);
        
    }
    show() {
        this.preferences.show();
    }

    //テストでの使用以外は想定していない。
    changePreferencesDebug(new_preferences){
        this.preferences.preferences = new_preferences;
    }

    get() {
        return this.preferences.preferences;
    }
    setListener(callback) {
        this.preferences.on('save', (data) => {
            callback(data);
        });
    }
}

module.exports = AppPreferences;