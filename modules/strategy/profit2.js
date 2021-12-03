let shortId = require('shortid');

const {Decimal} = require('decimal.js');

const DateUtils = require('../dateutils');

const MAX_PART_NB_TX = parseInt(process.env.STRATEGY_MAX_PART_NB_TX.toString(), 10);

const convertInitialAmount = function (strategyVars, amount, coin, bookTicker, tripletsData) {
    let stables = strategyVars["stableCoins"];
    if (stables.includes(coin)) {
        return new Decimal(amount);
    }
    let stablesInBookTicker = stables
        .map((stable) => {
            let stablePair = `${stable}/${coin}`;
            let stableMDPair = tripletsData["marketData"]["mdCurPairsToMdPairs"][stablePair];
            if (stableMDPair == null) {
                return null;
            }
            let stableMPPairId = tripletsData["marketData"]["mdPairsToMdpIds"][stableMDPair];
            return {stable: stable, stableMDPair: stableMDPair, stableMPPairId: stableMPPairId,
                inBookTicker: bookTicker[stableMPPairId] != null}
        })
        .filter(o => {
            return o != null && (o["inBookTicker"] || tripletsData["marketData"]["mdPairsData"][o["stableMDPair"]]["default_values"]!=null);
        })
        .sort((o1, o2) => {
            if (o1["inBookTicker"]) return -1;
            else if (o2["inBookTicker"]) return 1;
            else return 0;
        });
    if (stablesInBookTicker.length > 0) {
        let stable = stablesInBookTicker[0].stable;
        let stablePair = `${stable}/${coin}`;
        let stableMDPair = stablesInBookTicker[0].stableMDPair;
        let stableMPPairId = stablesInBookTicker[0].stableMPPairId;
        let inBookTicker = stablesInBookTicker[0].inBookTicker;
        let position = stablePair === stableMDPair ? 1 : 2;
        if (inBookTicker) {
            if (position === 1) {
                return (new Decimal(amount))
                    .mul(bookTicker[stableMPPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (new Decimal(amount))
                    .div(bookTicker[stableMPPairId]["askPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.base, Decimal.ROUND_DOWN);
            }
        }
        else {
            if (position === 1) {
                return (new Decimal(amount))
                    .mul(tripletsData["marketData"]["mdPairsData"][stableMDPair]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (new Decimal(amount))
                    .div(tripletsData["marketData"]["mdPairsData"][stableMDPair]["default_values"]["ask_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.base, Decimal.ROUND_DOWN);
            }
        }
    }
    return null;
}

const convertFinalAmount = function (strategyVars, amount, coin, bookTicker, tripletsData) {
    let stables = strategyVars["stableCoins"];
    if (typeof amount === "number")
        amount = new Decimal(amount);
    if (stables.includes(coin)) {
        return amount;
    }
    let stablesInBookTicker = stables
        .map((stable) => {
            let stablePair = `${coin}/${stable}`;
            let stableMDPair = tripletsData["marketData"]["mdCurPairsToMdPairs"][stablePair];
            if (stableMDPair == null) {
                return null;
            }
            let stableMPPairId = tripletsData["marketData"]["mdPairsToMdpIds"][stableMDPair];
            return {stable: stable, stableMDPair: stableMDPair, stableMPPairId: stableMPPairId,
                inBookTicker: bookTicker[stableMPPairId] != null}
        })
        .filter(o => {
            return o != null && (o["inBookTicker"] || tripletsData["marketData"]["mdPairsData"][o["stableMDPair"]]["default_values"]!=null);
        })
        .sort((o1, o2) => {
            if (o1["inBookTicker"]) return -1;
            else if (o2["inBookTicker"]) return 1;
            else return 0;
        });
    if (stablesInBookTicker.length > 0) {
        let stable = stablesInBookTicker[0].stable;
        let stablePair = `${coin}/${stable}`;
        let stableMDPair = stablesInBookTicker[0].stableMDPair;
        let stableMPPairId = stablesInBookTicker[0].stableMPPairId;
        let inBookTicker = stablesInBookTicker[0].inBookTicker;
        let position = stablePair === stableMDPair ? 1 : 2;
        if (inBookTicker) {
            if (position === 1) {
                return (amount)
                    .mul(bookTicker[stableMPPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (amount)
                    .div(bookTicker[stableMPPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.base, Decimal.ROUND_DOWN);
            }
        }
        else {
            if (position === 1) {
                return (amount)
                    .mul(tripletsData["marketData"]["mdPairsData"][stableMDPair]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (amount)
                    .div(tripletsData["marketData"]["mdPairsData"][stableMDPair]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.base, Decimal.ROUND_DOWN);
            }
        }
    }
    return null;
}

const convertAmount = function (amount, coin1, coin2, bookTicker, tripletsData) {
    if (coin1 === coin2) {
        return amount;
    }
    let c12Pair = `${coin1}/${coin2}`;
    let c12MDP = tripletsData["marketData"]["mdCurPairsToMdPairs"][c12Pair];
    if (c12MDP == null) {
        let intCurrencies = Object.keys(tripletsData["marketData"]["mdPairsData"])
            .map((key) => {return key.split("/")})
            .flat()
            .filter((currency, index, array) => {return array.indexOf(currency) === index;})
            .filter((currency) => {return currency !== coin1 && currency !== coin2})
            .filter((currency) => {
                let p1Pair = `${coin1}/${currency}`, p2Pair = `${currency}/${coin2}`;
                let p1MDP = tripletsData["marketData"]["mdCurPairsToMdPairs"][p1Pair],
                    p2MDP = tripletsData["marketData"]["mdCurPairsToMdPairs"][p2Pair];
                return p1MDP != null && p2MDP != null;
            })
            .map((currency) => {
                let p1Pair = `${coin1}/${currency}`, p2Pair = `${currency}/${coin2}`;
                let p1MDP = tripletsData["marketData"]["mdCurPairsToMdPairs"][p1Pair],
                    p2MDP = tripletsData["marketData"]["mdCurPairsToMdPairs"][p2Pair];
                let p1MDPairId = tripletsData["marketData"]["mdPairsToMdpIds"][p1MDP],
                    p2MDPairId = tripletsData["marketData"]["mdPairsToMdpIds"][p2MDP];
                return {currency: currency, ibt1: bookTicker[p1MDPairId]!=null, ibt2: bookTicker[p2MDPairId]!=null};
            })
            .sort((a, b)=>{
                if (a["ibt1"] && a["ibt2"]) return -1;
                else if (b["ibt1"] && b["ibt2"]) return 1;
                else if (a["ibt1"] || a["ibt2"]) return -1;
                else if (b["ibt1"] || b["ibt2"]) return 1;
                else return 0;
            })
            .map((o) => {return o["currency"]});
        if (intCurrencies.length === 0)
            return null;
        else {
            let currency = intCurrencies[0];
            let a1 = convertAmount(amount, coin1, currency, bookTicker, tripletsData);
            return convertAmount(a1, currency, coin2, bookTicker, tripletsData);
        }
    }
    else {
        let c12MDPairId = tripletsData["marketData"]["mdPairsToMdpIds"][c12MDP];
        let inBookTicker = bookTicker[c12MDPairId] != null;
        let position = c12Pair === c12MDP ? 1 : 2;
        if (inBookTicker) {
            if (position === 1) {
                return (amount)
                    .mul(bookTicker[c12MDPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][c12MDP].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (amount)
                    .div(bookTicker[c12MDPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][c12MDP].precision.base, Decimal.ROUND_DOWN);
            }
        }
        else {
            if (position === 1) {
                return (amount)
                    .mul(tripletsData["marketData"]["mdPairsData"][c12MDP]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][c12MDP].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (amount)
                    .div(tripletsData["marketData"]["mdPairsData"][c12MDP]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][c12MDP].precision.base, Decimal.ROUND_DOWN);
            }
        }
    }
}

const convertToBNB = async function (amount, coin, bookTicker, tripletsData) {
    if ("BNB" === coin) {
        return amount;
    }
    let bnbPair = `${coin}/BNB`;
    let bnbMDP = tripletsData["marketData"]["mdCurPairsToMdPairs"][bnbPair];
    if (bnbMDP == null) {
        let stables = strategyVars["stableCoins"];
    }
    else {
        let bnbMDPairId = tripletsData["marketData"]["mdPairsToMdpIds"][bnbMDP];
        let inBookTicker = bookTicker[bnbMDPairId] != null;
        let position = bnbPair === bnbMDP ? 1 : 2;
        if (inBookTicker) {
            if (position === 1) {
                return (new Decimal(amount).toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.amount, Decimal.ROUND_DOWN))
                    .mul(bookTicker[bnbMDPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (new Decimal(amount).toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.amount, Decimal.ROUND_DOWN))
                    .div(bookTicker[bnbMDPairId]["askPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.base, Decimal.ROUND_DOWN);
            }
        }
        else {
            if (position === 1) {
                return (new Decimal(amount).toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.amount, Decimal.ROUND_DOWN))
                    .mul(tripletsData["marketData"]["mdPairsData"][bnbMDP]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (new Decimal(amount).toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.amount, Decimal.ROUND_DOWN))
                    .div(tripletsData["marketData"]["mdPairsData"][bnbMDP]["default_values"]["ask_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][bnbMDP].precision.base, Decimal.ROUND_DOWN);
            }
        }
    }
    let stablesInBookTicker = stables
        .map((stable) => {
            let stablePair = `${stable}/${coin}`;
            let stableMDPair = tripletsData["marketData"]["mdCurPairsToMdPairs"][stablePair];
            if (stableMDPair == null) {
                return null;
            }
            let stableMPPairId = tripletsData["marketData"]["mdPairsToMdpIds"][stableMDPair];
            return {stable: stable, stableMDPair: stableMDPair, stableMPPairId: stableMPPairId,
                inBookTicker: bookTicker[stableMPPairId] != null}
        })
        .filter(o => {
            return o != null && (o["inBookTicker"] || tripletsData["marketData"]["mdPairsData"][o["stableMDPair"]]["default_values"]!=null);
        })
        .sort((o1, o2) => {
            if (o1["inBookTicker"]) return -1;
            else if (o2["inBookTicker"]) return 1;
            else return 0;
        });
    if (stablesInBookTicker.length > 0) {
        let stable = stablesInBookTicker[0].stable;
        let stablePair = `${stable}/${coin}`;
        let stableMDPair = stablesInBookTicker[0].stableMDPair;
        let stableMPPairId = stablesInBookTicker[0].stableMPPairId;
        let inBookTicker = stablesInBookTicker[0].inBookTicker;
        let position = stablePair === stableMDPair ? 1 : 2;
        if (inBookTicker) {
            if (position === 1) {
                return (new Decimal(initialAmount))
                    .mul(bookTicker[stableMPPairId]["bidPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (new Decimal(initialAmount))
                    .div(bookTicker[stableMPPairId]["askPrice"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.base, Decimal.ROUND_DOWN);
            }
        }
        else {
            if (position === 1) {
                return (new Decimal(initialAmount))
                    .mul(tripletsData["marketData"]["mdPairsData"][stableMDPair]["default_values"]["bid_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.quote, Decimal.ROUND_DOWN);
            } else {
                return (new Decimal(initialAmount))
                    .div(tripletsData["marketData"]["mdPairsData"][stableMDPair]["default_values"]["ask_price"])
                    .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][stableMDPair].precision.base, Decimal.ROUND_DOWN);
            }
        }
    }
    return null;
}

const calculateProfit = function (strategyVars, tripletsData, bookTicker, updatedMdpIds, varInitAmt) {
    console.log({strategyVars, tripletsData, bookTicker, updatedMdpIds, varInitAmt})
    try {

        let triplets = tripletsData["triplets"];

        let defaultFees = strategyVars["defaultTradeFee"];
        let useDefaultFees = strategyVars["useDefaultTradeFee"];

        if (updatedMdpIds.length === 0) {
            process.send({
                message: 'done',
                result: null
            });
            process.exit(0);
        }

        let filteredTriplets = updatedMdpIds
            .map(x => tripletsData["marketData"]["mdpIdsToMdPairs"][x])
            .filter(mdp => tripletsData["mdpToTriplets"][mdp] != null)
            .map(mdp => tripletsData["mdpToTriplets"][mdp])
            .flat()
            .filter((value, index, arr)=> arr.indexOf(value) === index)
            .filter(tripletId => {
                let a = tripletsData["tripletsToMdp"][tripletId]
                    .map(mdp => tripletsData["marketData"]["mdPairsToMdpIds"][mdp])
                    .filter(mdpId => bookTicker[mdpId] != null);
                return a.length === 3;
            })
            .map(tripletId => {return {triplet: triplets[tripletId], index: tripletId}});

        if (filteredTriplets.length === 0) {
            process.send({
                message: 'done',
                result: null
            });
            process.exit(0);
        }

        let nBTripletsToCheck = filteredTriplets.length;

        let initialUsdAmount = varInitAmt;

        let partitions = [];
        let nbPartitions = Math.ceil(nBTripletsToCheck / MAX_PART_NB_TX);
        if (nbPartitions > 1) {
            let lastDiff = nbPartitions - ((nbPartitions - 1) * MAX_PART_NB_TX);
            if (lastDiff < Math.round(MAX_PART_NB_TX/2)) {
                nbPartitions = nbPartitions - 1;
            }
        }
        for (let i=0; i<nbPartitions; i++) {
            let start = i*MAX_PART_NB_TX;
            if (i === nbPartitions-1){
                partitions.push(filteredTriplets.slice(start, filteredTriplets.length));
            }
            else {
                let end = (i+1)*MAX_PART_NB_TX;
                partitions.push(filteredTriplets.slice(start, end));
            }
        }

        for (let j=0; j<partitions.length; j++) {

            let start = Date.now();

            let trades = [];
            filteredTriplets = partitions[j];
            for (let i=0; i<filteredTriplets.length; i++) {
                let start = Date.now();

                let triplet = filteredTriplets[i]["triplet"];
                let tripletId = filteredTriplets[i]["index"];
                //let crypto = triplet[0];
                let crypto = triplet[0];

                let initialAmount = convertInitialAmount(strategyVars, initialUsdAmount, crypto, bookTicker, tripletsData);
                if (initialAmount == null){
                    continue;
                }
                let amount = initialAmount;
                const orders = [];

                let fail = false;
                let reversedPrices = [], tripletBaseAmountPrecision = null;
                for (let j=0; j<3; j++) {
                    const pair = `${triplet[j]}/${triplet[j+1]}`;
                    const mdp = tripletsData["marketData"]["mdCurPairsToMdPairs"][pair];
                    const mdpId = tripletsData["marketData"]["mdPairsToMdpIds"][mdp];
                    let position = pair === mdp ? 1 : 2;
                    if (position === 1) {
                        let bidPrice = null;
                        if (bookTicker[mdpId]) {
                            bidPrice = new Decimal(bookTicker[mdpId]["bidPrice"])
                                .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.price, Decimal.ROUND_DOWN);
                        }
                        /*else if (tripletsData["marketData"]["mdPairsData"][mdp].default_values != null) {
                            bidPrice = new Decimal(tripletsData["marketData"]["mdPairsData"][mdp]["default_values"].bid_price)
                                .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.price, Decimal.ROUND_DOWN);
                        }*/
                        if (bidPrice == null){
                            fail = true;
                            break;
                        }
                        amount = amount.toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.amount, Decimal.ROUND_DOWN);

                        let feesPercentage = defaultFees;
                        if (!useDefaultFees) {
                            feesPercentage = tripletsData["marketData"]["mdPairsData"][mdp].taker_fee;
                        }
                        let feesPairBase = amount.mul(new Decimal(feesPercentage));
                        let feesTripletBase = new Decimal(0);
                        if (j === 0) {
                            tripletBaseAmountPrecision = tripletsData["marketData"]["mdPairsData"][mdp].precision.base;
                            feesTripletBase = feesPairBase;
                            reversedPrices.push(new Decimal(1).div(bidPrice));
                        }
                        else {
                            let tripletBasePrice = reversedPrices.reduce((a, b)=> a.mul(b), new Decimal(1));
                            feesTripletBase = feesPairBase.mul(tripletBasePrice);
                            if (j === 1) reversedPrices.push(new Decimal(1).div(bidPrice));
                        }
                        feesPairBase = feesPairBase.toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.base, Decimal.ROUND_DOWN);
                        feesTripletBase = feesTripletBase.toDecimalPlaces(tripletBaseAmountPrecision, Decimal.ROUND_DOWN);

                        orders.push({
                            order_id: shortId.generate(),
                            pair: mdp,
                            side: 'sell',
                            amount: amount.toNumber(),
                            price: bidPrice.toNumber(),
                            fees_percentage: feesPercentage,
                            fees_pair_base: feesPairBase.toNumber(),
                            fees_triplet_base: feesTripletBase.toNumber(),
                            link: `https://www.binance.com/en/trade/${mdp.replace('/', '_')}?ref=OJN3QQMJ`,
                            total: amount.mul(bidPrice).toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.quote, Decimal.ROUND_DOWN).toNumber(),
                            order_date: DateUtils.now()
                        });
                        amount = amount.mul(bidPrice);
                    }
                    else {
                        let askPrice = null;
                        if (bookTicker[mdpId]) {
                            askPrice = new Decimal(bookTicker[mdpId]["askPrice"])
                                .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.price, Decimal.ROUND_DOWN);
                        }
                        /*else if (tripletsData["marketData"]["mdPairsData"][mdp].default_values != null) {
                            askPrice = new Decimal(tripletsData["marketData"]["mdPairsData"][mdp]["default_values"].ask_price)
                                .toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.price, Decimal.ROUND_DOWN);
                        }*/
                        if (askPrice == null){
                            fail = true;
                            break;
                        }
                        const previousAmount = amount;
                        amount = amount.div(askPrice).toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.amount, Decimal.ROUND_DOWN);

                        let feesPercentage = defaultFees;
                        if (!useDefaultFees) {
                            feesPercentage = tripletsData["marketData"]["mdPairsData"][mdp].taker_fee;
                        }
                        let feesPairBase = previousAmount.mul(new Decimal(feesPercentage));
                        let feesTripletBase = new Decimal(0);
                        if (j === 0) {
                            tripletBaseAmountPrecision = tripletsData["marketData"]["mdPairsData"][mdp].precision.quote;
                            feesTripletBase = feesPairBase;
                            reversedPrices.push(askPrice);
                        }
                        else {
                            let tripletBasePrice = reversedPrices.reduce((a, b)=> a.mul(b), new Decimal(1));
                            feesTripletBase = feesPairBase.mul(tripletBasePrice);
                            if (j === 1) reversedPrices.push(askPrice);
                        }
                        feesPairBase = feesPairBase.toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.quote, Decimal.ROUND_DOWN);
                        feesTripletBase = feesTripletBase.toDecimalPlaces(tripletBaseAmountPrecision, Decimal.ROUND_DOWN);

                        orders.push({
                            order_id: shortId.generate(),
                            pair: mdp,
                            side: 'buy',
                            amount: amount.toNumber(),
                            price: askPrice.toNumber(),
                            fees_percentage: feesPercentage,
                            fees_pair_base: feesPairBase.toNumber(),
                            fees_triplet_base: feesTripletBase.toNumber(),
                            link: `https://www.binance.com/en/trade/${mdp.replace('/', '_')}`,
                            total: previousAmount.toDecimalPlaces(tripletsData["marketData"]["mdPairsData"][mdp].precision.quote, Decimal.ROUND_DOWN).toNumber(),
                            order_date: DateUtils.now()
                        });
                    }
                }

                if(!fail){
                    //const fee = new Decimal(defaultFees).mul(3);
                    //const profit = amount.div(initialAmount).sub(fee);
                    const fees = orders
                        .map((o)=> new Decimal(o["fees_triplet_base"]))
                        .reduce((a, b)=> a.add(b), new Decimal(0));
                    const bnbFees = convertAmount(fees, triplet[0], "BNB", bookTicker, tripletsData);
                    const profit = (amount.sub(fees)).div(initialAmount);
                    const finalUsdAmount = convertFinalAmount(strategyVars, amount, triplet[0], bookTicker, tripletsData);
                    let usdProfit = new Decimal(0);
                    if (profit.gt(1)) {
                        usdProfit = convertFinalAmount(strategyVars, amount.sub(fees).sub(initialAmount), triplet[0], bookTicker, tripletsData);
                    }
                    trades.push({
                        trade_id: shortId.generate(),
                        exchange: "BNB",
                        trade_date: DateUtils.now(),
                        trade_num: i,
                        triplet: triplet.join("-"),
                        tripletId,
                        initial_amount: initialAmount.toNumber(),
                        final_amount: amount.toNumber(),
                        initial_usd_amount: initialUsdAmount,
                        final_usd_amount: finalUsdAmount.toNumber(),
                        fees : fees.toNumber(),
                        bnb_fees: bnbFees.toNumber(),
                        profit: profit.toNumber(),
                        usd_profit: usdProfit.toNumber(),
                        orders,
                        time: Date.now() - start,
                    });
                    if (profit.gt(1)) {
                        initialUsdAmount = finalUsdAmount.toNumber();
                    }

                }

            }

            let mdPairsTimes = [];
            if (trades.length > 0) {
                Object.keys(tripletsData["marketData"]["mdPairsData"])
                    .forEach((mdp) => {
                        let mdpTime = trades.filter((t) => {
                            return ((tripletsData["mdpToTriplets"][mdp] || []).includes(t["tripletId"]))
                        }).map((t) => {
                            return t["time"];
                        }).reduce((a, b) => a+b, 0);
                        mdPairsTimes.push({mdp: mdp, time: mdpTime});
                    });
                mdPairsTimes.sort((a, b) => {
                    if (a.time > b.time) return -1;
                    else if (a.time < b.time) return 1;
                    return 0;
                });
            }

            let stTime = Date.now() - start;

            process.send({
                message: 'result',
                result: {trades, mdPairsTimes, nBTripletsToCheck, initialUsdAmount, stTime, nbPartitions, partNum: (j+1)}
            });
        }

        process.send({
            message: 'done',
            result: true
        });
        process.exit(0);

    } catch (e) {
        process.send({
            message: 'error',
            error_message: e.message,
            error_stack: e.stack,
            result: null
        });
        process.exit(0);
    }

}

process.on('message', message => {
    if (message["message"] === 'start') {
        let params = message["params"];
        console.log('Child process for profit calculation started');
        calculateProfit(params["strategyVars"], params["tripletsData"], params["bookTicker"],
            params["updatedMdpIds"], params["varInitAmt"]);
    }
})

module.exports = calculateProfit;
