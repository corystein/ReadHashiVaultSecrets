"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const util = require("util");
const request = require("request");
require("babel-polyfill");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            ////////////////////////////////////////
            // Get Vault inputs
            ////////////////////////////////////////
            var input_uri = tl.getInput("uri") || "";
            var input_token = tl.getInput("token") || "";
            var input_tfe_info_vault_path = tl.getInput("tfepath") || "";
            var input_add_prefix = tl.getBoolInput("addPrefix", true);
            var input_variable_prefix = tl.getInput("variablePrefix") || "";
            console.log("URI: ", input_uri);
            console.log("Token: ", input_token);
            console.log("Path: ", input_tfe_info_vault_path);
            console.log("Add Prefix: ", input_add_prefix);
            console.log("Variable Prefix: ", input_variable_prefix);
            ////////////////////////////////////////
            // Initialization items
            ////////////////////////////////////////
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            tl.setResourcePath(path.join(__dirname, "task.json"));
            ////////////////////////////////////////
            // Get Vault Data
            ////////////////////////////////////////
            var uri = util.format("%s/v1/%s", input_uri, input_tfe_info_vault_path);
            console.log("Uri (Get): ", uri);
            var isSecret = false;
            request.get({
                headers: {
                    "content-type": "application/json",
                    "X-Vault-Token": input_token
                },
                url: uri,
                agentOptions: {
                    secureProtocol: "TLSv1_2_method"
                }
            }, (error, response, body) => {
                if (error) {
                    throw error;
                }
                var content = JSON.parse(body);
                for (let [key, value] of Object.entries(content.data)) {
                    console.log("Key: ", key);
                    console.log("Value: ", value);
                    if (!input_add_prefix) {
                        tl.setVariable(key.toUpperCase(), value.toString(), isSecret);
                    }
                    else {
                        var key_with_prefix = util.format("%s_%s", input_variable_prefix, key);
                        tl.setVariable(key_with_prefix.toUpperCase(), value.toString(), isSecret);
                    }
                }
            });
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err || "run() failed");
        }
    });
}
run();
