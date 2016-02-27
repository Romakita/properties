import path = require("path");
import Fs = require('fs');
import {parse} from "./parse";

var _ = require('lodash');

export class Properties{

    private static _instance:Properties;
    private _properties:any;

    /**
     *
     * @param file
     */
    constructor(file:string){
        this._properties = {};
        this.read(this._properties, file);
    }

    /**
     *
     * @param node
     * @param file
     */
    private read(node:any, file:string){

        file = path.resolve(file);

        if(!Fs.existsSync(file)){
            throw new Error("Cannot find file properties '"+ file +"'");
        }

        var properties = require(file);

        for(var key in properties){

            if(key == "propertiesFiles"){
                var propertiesFiles = properties[key];

                try{
                    var cwd = path.dirname(file);

                    if(propertiesFiles.cwd){
                        if(propertiesFiles.cwd.match(/^\./)) {
                            cwd = path.dirname(file) + '/' + propertiesFiles.cwd;
                        }else{
                            cwd = propertiesFiles.cwd;
                        }
                    }

                    this.mount(node, cwd, propertiesFiles.files);

                }catch(er){

                    var message = er.message + '. \nCheck "propertiesFiles" value in your configuration (' + path.resolve(file) + ').';

                    throw new Error(message);

                }

            }else{
                node[key] = properties[key];
            }
        }

    }

    /**
     *
     * @param node
     * @param propertiesFilesList
     */
    private mount(node:any, cwd:string, propertiesFilesList:any){
        cwd = path.resolve(cwd);

        for(var mountName in propertiesFilesList){

            var file = propertiesFilesList[mountName];
            var keys:string[] = mountName.split('.'); //eval expression
            var subNode = node;

            for(var key in keys){
                subNode[keys[key]] = {};
                subNode = subNode[keys[key]];
            }

            this.read(subNode, cwd + '/' + file);
        }
    }

    /**
     *
     * @param expression
     * @returns {any}
     */
    public get(expression){
        return parse(expression, this._properties);
    }

    public static getValue(expression){
        return Properties.initialize().get(expression);
    }

    /**
     * Load file properties from file location or autoload file (set just filename)
     * @param file
     * @param autoload
     * @returns {Properties}
     */
    static initialize(file?:string, autoload?:boolean){

        if(!Properties._instance){
            if(file && !autoload){
                Properties._instance = new Properties(file);
            }else{
                var propFile = this.findPropertiesFile(file);

                if(propFile){
                    Properties._instance = new Properties(<string>propFile);
                }
            }
        }

        return Properties._instance;
    }

    static clean(){
        Properties._instance = undefined;
    }

    /**
     * Find properties.json in the folder, parent folder, etc...
     * @returns {any}
     */
    static findPropertiesFile(file:string = 'properties.json'):boolean|string{
        var folder:string = path.resolve(__dirname);
        var current;

        while(!Fs.existsSync(folder + '/' + file) && current != folder){
            current = folder;
            folder = path.resolve(folder + '/..');
        }

        if(current == folder){
            return false;
        }

        return folder +  '/' + file;
    }
}