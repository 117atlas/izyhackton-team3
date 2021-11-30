let EmailValidator = require("email-validator");

const Variable = require('../../models/variable');
const StableCoin = require('../../models/stablecoin');

const ErrorCodes = require('../../configs/errorcodes').CODES;
const Constants = require('../../configs/constants');

let STRATEGY_VARIABLES = null;
let AUTO_PROCESSES_VARIABLES = null;

const VarData = require('./vardata');

const DEFAULT_AUTO_RESET_PERIOD = VarData.AUTO_RESET_PERIOD_VALUES[7], DEFAULT_MD_AUTO_UPDATE = 5;

const isStrategyVariable = function (variableName) {
    return ["default_trade_fee", "use_default_trade_fee", "initial_amount", "stable_coins"].includes(variableName);
}

const isAutoProcessVariable = function (variableName) {
    return ["auto_reset_period", "md_update_period", "eod_emails"].includes(variableName);
}

const __getVariable = async function (name, variable = null) {
    if (variable == null) {
        variable = await Variable.findOne({name: name}).exec();
    }
    if (variable != null) {
        let val = variable["value"], type = variable["type"];
        if (type === "number") {
            return parseFloat(val.toString());
        } else if (type === "string") {
            return val.toString();
        } else if (type === "boolean") {
            return val.toString() === "true";
        }
    }
    return null;
}

const __formatVarName = function (name) {
    let i = 0;
    while (i < name.length) {
        let character = name.substring(i, i+1);
        if (character.toUpperCase() === character) {
            let left = name.substring(0, i);
            let right = "";
            if (i + 1 < name.length) right = name.substring(i+1);
            name = left + "_" + character.toLowerCase() + right;
            i += 2;
        }
        else {
            i++;
        }
    }
    return name;
}

const getVariable = async function (params) {
    let _name = params["name"];
    try {
        let name = __formatVarName(_name);
        let value = await __getVariable(name);
        if (value == null) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_NAME);
        }
        if (["stable_coins", "eod_emails"].includes(name)) {
            value = value.split("|");
            if (name === "stable_coins")
                value = value.filter(x => x!=="").filter(x => VarData.ALL_STABLE_COINS.includes(x));
            else if (name === "eod_emails")
                value = value.filter(x => x!=="").filter(x => EmailValidator.validate(x));
            value = value.join("|");
        }
        let data = {}; data[_name] = value;
        return Constants.done(null, data, 0);
    } catch (e) {
        console.log(e);
        return Constants.done(e, null, -1);
    }
}

const changeVariable = async function (params) {
    let _name = params["name"], newValue = params["new_value"];
    try {
        let name = __formatVarName(_name);
        let variable = await Variable.findOne({name: name}).exec();
        if (variable == null) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_NAME);
        }

        if (typeof newValue !== variable["type"]) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_TYPE);
        }
        if (variable.type === "number" && isNaN(parseFloat(newValue.toString()))) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }

        if (name === "use_default_trade_fee" && !["true", "false"].includes(newValue.toString())){
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "default_trade_fee" && parseFloat(newValue.toString())<0){
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "initial_amount" && parseFloat(newValue.toString())<=0) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "stable_coins" && newValue.toString().split("|").filter(x => x!=="").length === 0) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "stable_coins" && newValue.toString().split("|").filter(x => x!=="").filter(x => !VarData.ALL_STABLE_COINS.includes(x)).length > 0) {
            return Constants.done(null, null, ErrorCodes.INVALID_STABLE_COIN_SYMBOLS);
        }

        if (name === "auto_reset_period" && !VarData.AUTO_RESET_PERIOD_VALUES.includes(newValue)) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "md_update_period" && parseFloat(newValue.toString())<5) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "eod_emails" && newValue.toString().split("|").filter(x => x!=="").length === 0) {
            return Constants.done(null, null, ErrorCodes.INVALID_VARIABLE_VALUE);
        }
        if (name === "eod_emails" && newValue.toString().split("|").filter(x => x!=="").filter(x => !EmailValidator.validate(x)).length > 0) {
            return Constants.done(null, null, ErrorCodes.INVALID_EOD_EMAILS);
        }

        variable["value"] = newValue.toString();
        await variable.save();
        let val = await __getVariable(name, variable);
        if (isStrategyVariable(name)) {
            updateStrategyVariables(true, name, val).then();
        }
        else if (isAutoProcessVariable(name)){
            updateAutoProcessesVariables(true, name, val).then();
        }

        let data = {}; data[_name] = val;
        return Constants.done(null, data, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const updateStrategyVariables = async function (afterUpdateVar = false, updatedVarName = "", updatedVarNewValue = null) {
    let defaultTradeFee = null, useDefaultTradeFee = null, initialAmount = null, stableCoins = null;
    if (afterUpdateVar) {
        if (updatedVarName === "default_trade_fee")
            defaultTradeFee = updatedVarNewValue;
        else if (updatedVarName === "use_default_trade_fee")
            useDefaultTradeFee = updatedVarNewValue;
        else if (updatedVarName === "initial_amount")
            initialAmount = updatedVarNewValue;
        else if (updatedVarName === "stable_coins")
            stableCoins = updatedVarNewValue;
    }
    if (defaultTradeFee == null) {
        defaultTradeFee = await __getVariable("default_trade_fee");
    }
    if (useDefaultTradeFee == null) {
        useDefaultTradeFee = await __getVariable("use_default_trade_fee");
    }
    if (initialAmount == null) {
        initialAmount = await __getVariable("initial_amount");
    }
    if (stableCoins == null) {
        stableCoins = await __getVariable("stable_coins");
    }
    if (stableCoins != null) {
        stableCoins = stableCoins.split("|");
        stableCoins = stableCoins.filter(x => x!=="").filter(x => VarData.ALL_STABLE_COINS.includes(x));
    }
    STRATEGY_VARIABLES = {
        defaultTradeFee: defaultTradeFee,
        useDefaultTradeFee: useDefaultTradeFee,
        initialAmount: initialAmount,
        stableCoins: stableCoins
    }
}

const getStrategyVariables = async function () {
    if (STRATEGY_VARIABLES == null) {
        await updateStrategyVariables(false);
    }
    return JSON.parse(JSON.stringify(STRATEGY_VARIABLES));
}

const validateStrategyVars = function (strategyVars = null) {
    if (strategyVars == null) {
        strategyVars = STRATEGY_VARIABLES;
    }
    let error = false, errorMessage = null;
    if (strategyVars == null) {
        error = true;
        errorMessage = "Variables pour le traitement de la strategie non definies.";
    }
    else if (!strategyVars.hasOwnProperty("useDefaultTradeFee")){
        error = true;
        errorMessage = "Variable d'utilisation des frais par defaut non definie.";
    }
    else if (strategyVars["useDefaultTradeFee"] && !strategyVars.hasOwnProperty("defaultTradeFee")){
        error = true;
        errorMessage = "Variable Frais par defaut non definie.";
    }
    else if (isNaN(parseFloat(strategyVars["defaultTradeFee"])) || parseFloat(strategyVars["defaultTradeFee"])<0){
        error = true;
        errorMessage = "Valeur de la variable frais par default invalide. La valeur de frais par default doit etre superieure ou egale a 0.";
    }
    else if (!strategyVars.hasOwnProperty("initialAmount")){
        error = true;
        errorMessage = "Variable montant initial non definie";
    }
    else if (isNaN(parseFloat(strategyVars["initialAmount"])) || parseFloat(strategyVars["initialAmount"])<=0){
        error = true;
        errorMessage = "Valeur de la variable montant initial invalide. La valeur du montant initial doit  etre superieure ou egale a 0.";
    }
    else if (!strategyVars.hasOwnProperty("stableCoins") || strategyVars["stableCoins"].length <= 0){
        error = true;
        errorMessage = "Aucun stable coin defini.";
    }
    else if (!strategyVars.hasOwnProperty("initialAmount")){
        error = true;
        errorMessage = "Variable montant initial non definie";
    }
    else if (isNaN(parseFloat(strategyVars["initialAmount"])) || parseFloat(strategyVars["initialAmount"])<=0){
        error = true;
        errorMessage = "Valeur de la variable montant initial invalide. La valeur du montant initial doit  etre superieure ou egale a 0.";
    }
    return {error, errorMessage};
}

const updateAutoProcessesVariables = async function (afterUpdateVar = false, updatedVarName = "", updatedVarNewValue = null) {
    let autoResetPeriod = null, mdUpdatePeriod = null, eodEmails = null;
    if (afterUpdateVar) {
        if (updatedVarName === "auto_reset_period")
            autoResetPeriod = updatedVarNewValue;
        else if (updatedVarName === "md_update_period")
            mdUpdatePeriod = updatedVarNewValue;
        else if (updatedVarName === "eod_emails")
            eodEmails = updatedVarNewValue;
    }
    if (autoResetPeriod == null) {
        autoResetPeriod = await __getVariable("auto_reset_period");
    }
    if (mdUpdatePeriod == null) {
        mdUpdatePeriod = await __getVariable("md_update_period");
    }
    if (eodEmails == null) {
        eodEmails = await __getVariable("eod_emails");
    }
    if (eodEmails != null) {
        eodEmails = eodEmails.split("|");
        eodEmails = eodEmails.filter(x => x!=="").filter(x => EmailValidator.validate(x));
    }
    AUTO_PROCESSES_VARIABLES = {
        autoResetPeriod: autoResetPeriod == null ? DEFAULT_AUTO_RESET_PERIOD : autoResetPeriod,
        mdUpdatePeriod: mdUpdatePeriod == null ? DEFAULT_MD_AUTO_UPDATE : mdUpdatePeriod,
        eodEmails: eodEmails == null ? [] : eodEmails
    }
}

const getAutoProcessesVariables = async function () {
    if (AUTO_PROCESSES_VARIABLES == null) {
        await updateAutoProcessesVariables(false);
    }
    return JSON.parse(JSON.stringify(AUTO_PROCESSES_VARIABLES));
}

const getAllVariables = async function () {
    try {
        let sv = await getStrategyVariables();
        let apv = await getAutoProcessesVariables();
        let vars = {};
        for (const k of Object.keys(sv)) vars[k] = sv[k];
        for (const k of Object.keys(apv)) vars[k] = apv[k];
        if (vars["stableCoins"]) vars["stableCoins"] = vars["stableCoins"].join("|");
        if (vars["eodEmails"]) vars["eodEmails"] = vars["eodEmails"].join("|");
        return Constants.done(null, {variables: vars}, 0);
    } catch (e) {
        console.log(e);
        return Constants.done(e, null, -1);
    }
}




//------------------------------------------------------
const __getStableCoins = async function () {
    return await StableCoin.find({}).exec();
}

const getStableCoins = async function () {
    try {
        return Constants.done(null, (await __getStableCoins()), 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const updateStableCoin = async function (params) {
    let symbols = params["symbols"], logo = params["logo"];
    try {
        if (symbols == null) {
            return Constants.done(null, null, ErrorCodes.INVALID_STABLE_COIN_SYMBOLS);
        }
        let sc = await StableCoin.findOne({symbols: symbols}).exec();
        if (sc == null) {
            sc = new StableCoin();
            sc.symbols = symbols;
        }
        sc.logo = logo;
        await sc.save();
        let scs = await __getStableCoins();
        updateStrategyVariables(true, "stable_coins", scs).then();
        return Constants.done(null, scs, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}

const deleteStableCoin = async function (params) {
    let symbols = params["symbols"];
    try {
        await StableCoin.deleteOne({symbols: symbols}).exec();
        let scs = await __getStableCoins()
        updateStrategyVariables(true, "stable_coins", scs).then();
        return Constants.done(null, scs, 0);
    } catch (e) {
        return Constants.done(e, null, -1);
    }
}
//------------------------------------------------------

module.exports = {
    getVariable : getVariable,
    changeVariable : changeVariable,
    getAllVariables : getAllVariables,
    //getStableCoins, updateStableCoin, deleteStableCoin,
    updateStrategyVariables,
    getStrategyVariables : getStrategyVariables,
    validateStrategyVars,
    updateAutoProcessesVariables,
    getAutoProcessesVariables : getAutoProcessesVariables,
}
