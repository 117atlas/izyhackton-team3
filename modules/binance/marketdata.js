const ccxt = require('ccxt');

let MARKET_DATA = null;
let MARKET_DATA_IDS = null;
let MARKET_DATA_PAIRS = null;

const __getMarketData = async function () {
    return await new ccxt.binance().loadMarkets();
}

const __getTickerData = async function () {
    //new ccxt.binance().fetchTradingFees()
    return await new ccxt.binance().fetchTickers();
}

const getMarketData = async function () {
    let marketData = null, tickerData = null;
    try {
        marketData = await __getMarketData();
        tickerData = await __getTickerData();
    } catch (e) {
        marketData = null;
        tickerData = null
    }
    if (marketData != null && Object.keys(marketData).length > 0) {
        let mdsKeys = Object.keys(marketData);
        let pairs = {}, pairsIds = {}, rvPairs = {};
        mdsKeys.forEach((key) => {
            if (marketData[key]["active"] && marketData[key]["spot"]) {
                let cur1 = key.split("/")[0], cur2 = key.split("/")[1];
                let pair = {
                    exchange: "binance",
                    pair_id: marketData[key]["id"],
                    name: marketData[key]["symbol"],
                    precision: marketData[key]["precision"],
                    fee_side: marketData[key]["feeSide"],
                    base: marketData[key]["base"],
                    quote: marketData[key]["quote"]
                };
                if (tickerData != null && Object.keys(tickerData).includes(key)) {
                    pair.default_values = {
                        last_update: tickerData[key]["timestamp"],
                        bid_price: tickerData[key]["bid"],
                        bid_qty: tickerData[key]["bidVolume"],
                        ask_price: tickerData[key]["ask"],
                        ask_qty: tickerData[key]["askVolume"]
                    };
                }
                pairsIds[key] = marketData[key]["id"];
                pairs[key] = pair;
                rvPairs[`${cur1}/${cur2}`] = key;
                rvPairs[`${cur2}/${cur1}`] = key;
            }
        });
        MARKET_DATA = pairs;
        MARKET_DATA_IDS = pairsIds;
        MARKET_DATA_PAIRS = rvPairs;
        return {mdPairsData: pairs, mdPairsToMdpIds: pairsIds, mdCurPairsToMdPairs: rvPairs};
    }
    return null;
}

module.exports = {
    getMarketData,
}
