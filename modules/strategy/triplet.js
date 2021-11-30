const {getMarketData} = require('../binance/marketdata');

const REFRESH_PERIOD = 5;

let TRIPLET_DATA = null;

const generateCombinations = async function () {
    let marketData = await getMarketData(),
        mdPairsData = marketData.mdPairsData, mdCurPairsToMdPairs = marketData.mdCurPairsToMdPairs;
    let currenciesToMdp = {};
    Object.keys(mdPairsData)
        .map(key => {return key.split("/")})
        // List of market data pairs separated as array
        .flat()
        // All currencies
        .filter((value, index, arr)=> {
            return arr.indexOf(value) === index;
        })
        // All currencies are listed in no doublons
        .forEach((currency) => {
            const curRelatedMarketData = Object.keys(mdPairsData)
                .filter((mdKey) => mdPairsData[mdKey].base === currency || mdPairsData[mdKey].quote === currency);
            if (curRelatedMarketData.length > 0) {
                currenciesToMdp[currency] = curRelatedMarketData;
            }
        });
    let triplets = [];
    let currenciesToTriplets = {};
    let mdpToTriplets = {};
    Object.keys(currenciesToMdp).forEach((x)=>{
        currenciesToMdp[x]
            .map((mdp) => {
                let y = mdp.split("/")[0] === x ? mdp.split("/")[1] : mdp.split("/")[0];
                return !currenciesToMdp[y] || currenciesToMdp[y].length === 0 ? null : y;
            })
            .filter((y) => y != null)
            .forEach((y) => {
                currenciesToMdp[y]
                    .filter((mdp) => {
                        return (mdp !== `${x}/${y}`) && (mdp !== `${y}/${x}`);
                    })
                    .map((mdp) => {
                        let z = mdp.split("/")[0] === y ? mdp.split("/")[1] : mdp.split("/")[0];
                        return !currenciesToMdp[z] || currenciesToMdp[z].length === 0 ? null : z;
                    })
                    .filter((z) => {
                        //return z != null && currenciesToMdp[z].filter(mdp => (mdp === `${z}/${x}`) && (mdp !== `${x}/${z}`)).length > 0;
                        return z != null && currenciesToMdp[z].filter(mdp => (mdp === `${z}/${x}`) || (mdp === `${x}/${z}`)).length > 0;
                    })
                    .forEach((z) => {
                        triplets.push([x, y, z, x]);
                        const id = triplets.length - 1;
                        [x, y, z].forEach((c) => {
                            currenciesToTriplets[c] = currenciesToTriplets[c] || [];
                            currenciesToTriplets[c].push(id);
                        })
                        let mdp = mdCurPairsToMdPairs[`${x}/${y}`];
                        mdpToTriplets[mdp] = mdpToTriplets[mdp] || [];
                        mdpToTriplets[mdp].push(id);
                        mdp = mdCurPairsToMdPairs[`${y}/${z}`];
                        mdpToTriplets[mdp] = mdpToTriplets[mdp] || [];
                        mdpToTriplets[mdp].push(id);
                        mdp = mdCurPairsToMdPairs[`${z}/${x}`];
                        mdpToTriplets[mdp] = mdpToTriplets[mdp] || [];
                        mdpToTriplets[mdp].push(id);
                    });
            });
    });
    TRIPLET_DATA = {
        marketData,
        currenciesToMdp,
        triplets,
        currenciesToTriplets,
        mdpToTriplets
    }
}

const getTotalCombinations = async function () {
    if (TRIPLET_DATA == null) {
        await generateCombinations();
    }
    if (TRIPLET_DATA != null) {
        return JSON.parse(JSON.stringify(TRIPLET_DATA));
    }
    return null;
}

function intersect(...arrs) {
    if (arrs.length > 2) {
        return intersect(arrs[0], intersect(...arrs.slice(1)));
    }
    return arrs[0].filter((value) => arrs[1].includes(value));
}

function kCombinations(set, k) {
    let i; let j; let combs; let head; let tailcombs;

    // There is no way to take e.g. sets of 5 elements from
    // a set of 4.
    if (k > set.length || k <= 0) {
        return [];
    }

    // K-sized set has only one K-sized subset.
    if (k === set.length) {
        return [set];
    }

    // There is N 1-sized subsets in a N-sized set.
    if (k === 1) {
        combs = [];
        for (i = 0; i < set.length; i += 1) {
            combs.push([set[i]]);
        }
        return combs;
    }

    combs = [];
    for (i = 0; i < set.length - k + 1; i += 1) {
        // head is a list that includes only our current element.
        head = set.slice(i, i + 1);
        // We take smaller combinations from the subsequent elements
        tailcombs = kCombinations(set.slice(i + 1), k - 1);
        // For each (k-1)-combination we join it with the current
        // and store it to the set of k-combinations.
        for (j = 0; j < tailcombs.length; j += 1) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
}

module.exports = {
    generateCombinations: generateCombinations,
    getTotalCombinations: getTotalCombinations,
    intersect: intersect,
    kCombinations: kCombinations
}
