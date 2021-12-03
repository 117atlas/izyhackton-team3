const ExcelJS = require('exceljs');

const DateUtils = require('../../modules/dateutils');

module.exports = async (trades, _tickerData) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IzyHackton-Team3';
    workbook.lastModifiedBy = 'IzyHackton-Team3';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    let worksheet = workbook.addWorksheet('EOD', {views: [{showGridLines: false}]});

    let colWidth = 15;
    worksheet.columns = [
        { key: 'num', width: 5 },
        { key: 'date', width: colWidth },
        { key: 'time', width: colWidth },
        { key: 'pairs', width: colWidth },
        { key: 'way', width: colWidth },
        { key: 'price', width: colWidth },
        { key: 's_price', width: colWidth },
        { key: 'avg_price', width: colWidth },
        { key: 'amount', width: colWidth },
        { key: 'as_ccy', width: colWidth },
        { key: 'total', width: colWidth },
        { key: 'ts_ccy', width: colWidth },
        { key: 'gross_profit', width: colWidth },
        { key: 'net_profit', width: colWidth },
        { key: 'bnb_comm', width: colWidth },
        { key: 'open_price', width: colWidth },
        { key: 'close_price', width: colWidth },
        { key: 'high_price', width: colWidth },
        { key: 'low_price', width: colWidth },
        { key: 'volume_ccy1', width: colWidth },
        { key: 'volume_ccy2', width: colWidth },
        { key: 'change_percent', width: colWidth },
        { key: 'exchange', width: colWidth }
    ];
    worksheet.getColumn('num').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('date').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('time').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('pairs').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('way').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('gross_profit').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('net_profit').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('bnb_comm').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('exchange').alignment = {vertical: 'middle', horizontal: 'center'};
    worksheet.getColumn('as_ccy').alignment = {vertical: 'middle', horizontal: 'right'};
    worksheet.getColumn('ts_ccy').alignment = {vertical: 'middle', horizontal: 'right'};
    let colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];
    let colouredLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

    let headersRow = worksheet.getRow(3);
    headersRow.values = {
        num: {richText: [{font: {italic: true, bold: true}, text: '#'}]},
        date: {richText: [{font: {italic: true, bold: true}, text: 'Date'}]},
        time: {richText: [{font: {italic: true, bold: true}, text: 'TimeStamp'}]},
        pairs: {richText: [{font: {italic: true, bold: true}, text: 'Pairs'}]},
        way: {richText: [{font: {italic: true, bold: true}, text: 'Way'}]},
        price: {richText: [{font: {italic: true, bold: true}, text: 'Price'}]},
        s_price: {richText: [{font: {italic: true, bold: true}, text: 'S Price'}]},
        avg_price: {richText: [{font: {italic: true, bold: true}, text: 'Avg Price'}]},
        amount: {richText: [{font: {italic: true, bold: true}, text: 'Amount'}]},
        as_ccy: {richText: [{font: {italic: true, bold: true}, text: 'AS CCY'}]},
        total: {richText: [{font: {italic: true, bold: true}, text: 'Total'}]},
        ts_ccy: {richText: [{font: {italic: true, bold: true}, text: 'TS CCY'}]},
        gross_profit: {richText: [{font: {italic: true, bold: true}, text: 'Gross Profit'}]},
        net_profit: {richText: [{font: {italic: true, bold: true}, text: 'Net Profit'}]},
        bnb_comm: {richText: [{font: {italic: true, bold: true}, text: 'BNB Comm'}]},
        open_price: {richText: [{font: {italic: true, bold: true}, text: '24h Open Price'}]},
        close_price: {richText: [{font: {italic: true, bold: true}, text: '24h Close Price'}]},
        high_price: {richText: [{font: {italic: true, bold: true}, text: '24h High'}]},
        low_price: {richText: [{font: {italic: true, bold: true}, text: '24h Low'}]},
        volume_ccy1: {richText: [{font: {italic: true, bold: true}, text: '24h Volume CCY1'}]},
        volume_ccy2: {richText: [{font: {italic: true, bold: true}, text: '24h Volume CCY2'}]},
        change_percent: {richText: [{font: {italic: true, bold: true}, text: '24h Change %'}]},
        exchange: {richText: [{font: {italic: true, bold: true}, text: 'Exchange'}]},
    };
    headersRow.alignment = {vertical: 'middle', horizontal: 'center'};
    for (const letter of colouredLetters) {
        worksheet.getCell(`${letter}3`).fill = {type: 'pattern', pattern:'solid', fgColor: {argb:'FF70AD47'}};
    }
    worksheet.getCell(`W3`).border = {right: {style: 'thin', color: {argb: 'FF000000'}}};
    worksheet.getCell(`W4`).border = {right: {style: 'thin', color: {argb: 'FF000000'}}};

    let tradeRowGpIndex = 5;
    let tNum = 0;
    for (const trade of trades) {
        tNum++;

        let orderRowIndex = tradeRowGpIndex;

        for (const order of trade["orders"]) {
            let orderRow = worksheet.getRow(orderRowIndex);
            let tickerData = _tickerData[order["pair"]];
            orderRow.values = {
                date: DateUtils.PrintDate(order["order_date"]),
                time: DateUtils.PrintTime(order["order_date"]),
                pairs: order["pair"],
                way: order["side"].toString().substring(0, 1).toUpperCase()+order["side"].toString().substring(1),
                price: order["price"],
                s_price: 0,
                avg_price: tickerData == null ? undefined : tickerData["average"],
                amount: order["amount"],
                as_ccy: order["pair"].split("/")[0],
                total: parseFloat(order["total"].toString()),
                ts_ccy: order["pair"].split("/")[0],
                open_price: tickerData == null ? undefined : tickerData["open"],
                close_price: tickerData == null ? undefined : tickerData["close"],
                high_price: tickerData == null ? undefined : tickerData["high"],
                low_price: tickerData == null ? undefined : tickerData["low"],
                volume_ccy1: tickerData == null ? undefined : tickerData["baseVolume"],
                volume_ccy2: tickerData == null ? undefined : tickerData["quoteVolume"],
                change_percent: tickerData == null ? undefined : tickerData["percentage"],
            }
            orderRowIndex++;
        }

        let firstRowIndex = orderRowIndex - 3;
        let firstRow = worksheet.getRow(firstRowIndex);
        firstRow.getCell('num').value = tNum;
        firstRow.getCell('gross_profit').value = (trade["final_usd_amount"] - trade["initial_usd_amount"]);
        firstRow.getCell('net_profit').value = trade["usd_profit"];
        firstRow.getCell('bnb_comm').value = trade["bnb_fees"];
        firstRow.getCell('exchange').value = "BNB";

        worksheet.mergeCells(`A${(firstRowIndex)}:A${firstRowIndex+2}`);
        worksheet.mergeCells(`M${(firstRowIndex)}:M${firstRowIndex+2}`);
        worksheet.mergeCells(`N${(firstRowIndex)}:N${firstRowIndex+2}`);
        worksheet.mergeCells(`O${(firstRowIndex)}:O${firstRowIndex+2}`);
        worksheet.mergeCells(`W${(firstRowIndex)}:W${firstRowIndex+2}`);

        // STYLE
        let lastRowIndex = orderRowIndex - 1;
        for (const letter of colLetters) {
            worksheet.getCell(`${letter}${lastRowIndex}`).border = {bottom: {style:'thin', color: {argb:'FF000000'}}};
        }
        for (const letter of colouredLetters) {
            for (let i=lastRowIndex-3; i<=lastRowIndex; i++) {
                worksheet.getCell(`${letter}${i}`).fill = {type: 'pattern', pattern:'solid', fgColor: {argb:'FF70AD47'}};
            }
        }
        worksheet.getCell(`W${lastRowIndex}`).border = {right: {style: 'thin', color: {argb: 'FF000000'}}, bottom: {style: 'thin', color: {argb: 'FF000000'}}};

        tradeRowGpIndex = orderRowIndex + 1;
    }

    return workbook;
}
