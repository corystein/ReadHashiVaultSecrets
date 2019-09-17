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
            // Set Vault Path Constants and variables
            ////////////////////////////////////////
            const subscription_info_vault_prefix_path = "devops-core/subscription-info/";
            console.log("Subscription Info Vault Prefix Path: ", subscription_info_vault_prefix_path);
            var windows_domain_path = "devops-core/devops-tools/domain/";
            var sig_path = "devops-core/sig-info/";
            ////////////////////////////////////////
            // Get Vault inputs
            ////////////////////////////////////////
            var input_uri = tl.getInput("uri") || "";
            var input_token = tl.getInput("token") || "";
            var input_tfe_info_vault_path = tl.getInput("tfepath") || "";
            var input_domain = tl.getInput("domain") || "";
            // Display input values
            console.log("Vault URI: .................. [%s]", input_uri);
            console.log("Vault Token: ................ [%s]", input_token);
            console.log("TFE Info Vault Path: ........ [%s]", input_tfe_info_vault_path);
            console.log("Domain: ..................... [%s]", input_domain);
            ////////////////////////////////////////
            ////////////////////////////////////////
            // Set Variables
            ////////////////////////////////////////
            let vars = [];
            var isSecret = false;
            var spn_path_from_vault;
            // get environment for subscription vault path
            var stage_name = tl.getVariable("Release.EnvironmentName");
            //sub012-ude -  w  e
            //0123456789 10 11 12
            var subscription = stage_name.substr(0, 6);
            var environment = stage_name.substr(7, 3);
            var region = stage_name.substr(11, 2);
            var subscription_info_vault_path = "";
            ////////////////////////////////////////
            ////////////////////////////////////////
            // Get subscription path by environment
            ////////////////////////////////////////
            console.log("subscription info: ", subscription);
            console.log("environment info: ", environment);
            console.log("region info: ", region);
            if (environment.toUpperCase() == "PRD") {
                subscription_info_vault_path = subscription_info_vault_prefix_path.concat(subscription, "-p-", region);
            }
            else {
                subscription_info_vault_path = subscription_info_vault_prefix_path.concat(subscription, "-n-", region);
            }
            console.log("Subscription Info Vault Full Path: ", subscription_info_vault_path);
            ////////////////////////////////////////
            ////////////////////////////////////////
            // Create domain path
            ////////////////////////////////////////
            windows_domain_path = windows_domain_path.concat(windows_domain_path, input_domain.toLowerCase());
            ////////////////////////////////////////
            ////////////////////////////////////////
            // Get location for SIG
            ////////////////////////////////////////
            switch (region.toLowerCase()) {
                case "us": {
                    sig_path = sig_path.concat(sig_path, "west");
                }
                case "we": {
                    sig_path = sig_path.concat(sig_path, "central");
                }
                case "se": {
                    sig_path = sig_path.concat(sig_path, "east");
                }
            }
            ////////////////////////////////////////
            ////////////////////////////////////////
            // Initialization items
            ////////////////////////////////////////
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            tl.setResourcePath(path.join(__dirname, "task.json"));
            ////////////////////////////////////////
            ////////////////////////////////////////
            // Get Vault Data for SPN TFE Call
            ////////////////////////////////////////
            var uri = util.format("%s/v1/%s", input_uri, subscription_info_vault_path);
            console.log("Subscrition Info Uri (Get): ", uri);
            // initial request to get SUBSCRIPTION info and vault path for spn
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
                //console.info(JSON.parse(body));
                var content = JSON.parse(body);
                for (let [key, value] of Object.entries(content.data)) {
                    console.log("Key: ", key);
                    console.log("Value: ", value);
                    tl.setVariable(key.toUpperCase(), value.toString(), isSecret);
                    if (key.toUpperCase() == "SPN_PATH") {
                        console.log("Found and setting SPN Path Key Value");
                        //store local varialbe
                        spn_path_from_vault = value.toString();
                    }
                    // Add to variables array
                    vars.push({ key: key, value: value });
                }
                //////////////////////////////////////////////////
                //   CODE SECTION TO GET VAULT SPN VARIABLES
                //////////////////////////////////////////////////
                console.log("SPN Vault Path from Vault variable: ", spn_path_from_vault);
                // call vault again with the fetched spn path.
                uri = util.format("%s/v1/%s", input_uri, spn_path_from_vault);
                console.log("Vault SPN Uri (Get): ", uri);
                // initial request to get SPN info and vault path for spn
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
                    var content2 = JSON.parse(body);
                    for (let [key, value] of Object.entries(content2.data)) {
                        if (key.toUpperCase() == "ARM_CLIENT_SECRET") {
                            isSecret = true;
                        }
                        else {
                            isSecret = false;
                        }
                        tl.setVariable(key.toUpperCase(), value.toString(), isSecret);
                        // Add to variables array
                        if (!isSecret) {
                            vars.push({ key: key, value: value });
                        }
                        else {
                            vars.push({ key: key, value: "***" });
                        }
                    }
                }); // End of get SPN
                //////////////////////////////////////////////////
                //////////////////////////////////////////////////
                //   CODE SECTION TO GET TFE TOKEN AND URI VARIABLES
                //////////////////////////////////////////////////
                console.log("SPN TFE Path: ", input_tfe_info_vault_path);
                // call vault again with the fetched tfe info.
                uri = util.format("%s/v1/%s", input_uri, input_tfe_info_vault_path);
                console.log("Vault TFE Uri (Get): ", uri);
                // initial request to get TFE info and vault path for spn
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
                    var content2 = JSON.parse(body);
                    for (let [key, value] of Object.entries(content2.data)) {
                        if (key.toUpperCase() == "TFE_TOKEN") {
                            isSecret = true;
                        }
                        else {
                            isSecret = false;
                        }
                        tl.setVariable(key.toUpperCase(), value.toString(), isSecret);
                        // Add to variables array
                        if (!isSecret) {
                            vars.push({ key: key, value: value });
                        }
                        else {
                            vars.push({ key: key, value: "***" });
                        }
                    }
                }); // End of get TFE token
                //////////////////////////////////////////////////
            }); // End of subscription info
            // Display summary of variables
            console.log("****************************************");
            console.log("Summary of Variables");
            console.log("****************************************");
            vars.forEach(element => {
                console.log("$(%s)", element.key);
            });
            //console.table(vars);
            console.log("****************************************");
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err || "run() failed");
        }
    });
}
run();
