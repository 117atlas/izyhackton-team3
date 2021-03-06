const { getYearStart, getMonthStart } = require('@wojtekmaj/date-utils');

const VarData = require('./variables/vardata');

const TIMEZONE_OFFSET = -8;

const EndOfDayTime = function (autoResetPeriod, thisDateTime, delay) {
    let nextTime = 0;
    if (autoResetPeriod.toString().endsWith("mn")) {
        let n = autoResetPeriod.toString().substring(0, autoResetPeriod.toString().indexOf("mn"));
        n = parseInt(n, 10);
        let p = 60 / n;
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let m = thisDate.getUTCMinutes();
        let i = 0, M = null;
        while (i < p && M == null) {
            if (i*n <= m && m < (i+1)*n) M = (i+1)*n;
            else i++;
        }
        if(M == null) M = p*n;
        let nextTimeDate = new Date(thisDate.getTime());
        if (M === 60) {
            nextTimeDate.setUTCHours(nextTimeDate.getUTCHours()+1, 0, 0, 0);
        } else {
            nextTimeDate.setUTCMinutes(M, 0, 0);
        }
        nextTime = nextTimeDate.getTime();
    }
    else if (autoResetPeriod.toString().endsWith("h")) {
        let n = autoResetPeriod.toString().substring(0, autoResetPeriod.toString().indexOf("h"));
        n = parseInt(n, 10);
        let p = 24 / n;
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let h = thisDate.getUTCHours();
        let hours = [];
        for (let i = 0; i <= p; i++) {
            let hi = ((i * n) + TIMEZONE_OFFSET) % 24;
            if (hi < 0) hi = 24 + hi;
            hours.push(hi);
        }
        let H = null, nextDay = false;
        for (let i = 0; i < hours.length - 1; i++) {
            let left = hours[i], right = hours[i+1];
            if (left < right) {
                if (left <= h && h < right) {
                    H = right;
                    break;
                }
            }
            else {
                if (h >= left || h < right) {
                    nextDay = left <= h;
                    H = right;
                    break;
                }
            }
        }
        if (H == null) {
            H = hours[hours.length - 1];
            nextDay = h >= H;
        }
        let nextTimeDate = new Date(thisDate.getTime());
        nextTimeDate.setUTCHours(H, 0, 0, 0);
        if (nextDay)
            nextTimeDate.setUTCDate(nextTimeDate.getUTCDate()+1);
        nextTime = nextTimeDate.getTime();
    }
    else if (autoResetPeriod.toString() === "1d") {
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let nextDayDate = new Date(thisDate.getTime());
        if (thisDate.getUTCHours() >= 24 + TIMEZONE_OFFSET) {
            nextDayDate.setUTCDate(thisDate.getUTCDate()+1);
        }
        nextDayDate.setUTCHours(24 + TIMEZONE_OFFSET, 0, 0, 0);
        //nextDayDate.setUTCMinutes(nextDayDate.getUTCMinutes() - 1);
        nextTime = nextDayDate.getTime();
    }
    else if (autoResetPeriod.toString().endsWith("mo")) {
        let nmo = parseInt(autoResetPeriod.toString().substring(0, autoResetPeriod.toString().indexOf("mo")), 10);
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let nextTimeDate = new Date(thisDate.getTime());
        let nextDayDate = new Date(thisDate.getTime());
        nextDayDate.setUTCDate(nextDayDate.getDate()+1);
        let thisDateMonth = Math.ceil((thisDate.getUTCMonth()+1)/nmo);
        let nextDayMonth = Math.ceil((nextDayDate.getUTCMonth()+1)/nmo);
        let isLastDay = thisDateMonth !== nextDayMonth;
        let lastDayDate = new Date(thisDate.getTime());
        let months = [];
        for (let i=0; i<12; i++) months.push(Math.ceil((i+1)/nmo)*nmo);
        let lastDayMonth = months[lastDayDate.getUTCMonth()];
        if (lastDayMonth === 12) {
            lastDayDate.setUTCFullYear(lastDayDate.getUTCFullYear()+1, months[0]-1, 0);
        } else {
            lastDayDate.setUTCMonth(lastDayMonth, 0);
        }
        lastDayDate.setUTCHours(0, 0, 0, 0);
        nextTimeDate.setUTCFullYear(lastDayDate.getUTCFullYear(), lastDayDate.getUTCMonth(), lastDayDate.getUTCDate());
        if (isLastDay && thisDate.getUTCHours() >= 24 + TIMEZONE_OFFSET) {
            nextTimeDate.setUTCMonth(nextTimeDate.getUTCMonth()+nmo);
        }
        nextTimeDate.setUTCHours(24 + TIMEZONE_OFFSET, 0, 0, 0);
        //nextTimeDate.setUTCMinutes(nextDayDate.getUTCMinutes() - 1);
        nextTime = nextTimeDate.getTime();
    }
    if (nextTime !== 0 && delay != null) {
        if (thisDateTime < nextTime && (nextTime - thisDateTime) < delay) {
            nextTime = EndOfDayTime(autoResetPeriod, nextTime, null);
        }
    }
    return nextTime;
}

const StartOfDayTime = function (thisDateTime) {
    let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
    let thisDayDate = new Date(thisDate.getTime());
    if (thisDate.getUTCHours() < 24 + TIMEZONE_OFFSET) {
        thisDayDate.setUTCDate(thisDate.getUTCDate()-1);
    }
    thisDayDate.setUTCHours(24 + TIMEZONE_OFFSET, 0, 0, 0);
    return thisDayDate.getTime();
}

const StartOfDayTimeA = function (autoResetPeriod = "1d", thisDateTime = null) {
    if (autoResetPeriod.toString().endsWith("mn")) {
        let n = autoResetPeriod.toString().substring(0, autoResetPeriod.toString().indexOf("mn"));
        n = parseInt(n, 10);
        let p = 60 / n;
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let m = thisDate.getUTCMinutes();
        let i = 0, M = null;
        while (i < p && M == null) {
            if (i*n <= m && m < (i+1)*n) M = i*n;
            else i++;
        }
        if(M == null) M = 0;
        let previousTimeDate = new Date(this.getTime());
        previousTimeDate.setUTCMinutes(M, 0, 0);
        return previousTimeDate.getTime();
    }
    else if (autoResetPeriod.toString().endsWith("h")) {
        let n = autoResetPeriod.toString().substring(0, autoResetPeriod.toString().indexOf("h"));
        n = parseInt(n, 10);
        let p = 24 / n;
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let h = thisDate.getUTCHours();
        let hours = [];
        for (let i = 0; i <= p; i++) {
            let hi = ((i * n) + TIMEZONE_OFFSET) % 24;
            if (hi < 0) hi = 24 + hi;
            hours.push(hi);
        }
        let H = null, previousDay = false;
        for (let i = 0; i < hours.length - 1; i++) {
            let left = hours[i], right = hours[i+1];
            if (left < right) {
                if (left <= h && h < right) {
                    H = left;
                    break;
                }
            }
            else {
                if (!(h < left || h >= right)) {
                    previousDay = h < right;
                    H = left;
                    break;
                }
            }
        }
        if (H == null) {
            H = hours[0];
            previousDay = h < H;
        }
        let previousTimeDate = new Date(this.getTime());
        previousTimeDate.setUTCHours(H, 0, 0, 0);
        if (previousDay)
            previousTimeDate.setUTCDate(previousTimeDate.getUTCDate()-1);
        return previousTimeDate.getTime();
    }
    else if (autoResetPeriod.toString() === "1d"){
        let thisDate = new Date(thisDateTime == null ? Date.now() : thisDateTime);
        let thisDayDate = new Date(thisDate.getTime());
        if (thisDate.getUTCHours() < 24 + TIMEZONE_OFFSET) {
            thisDayDate.setUTCDate(thisDate.getUTCDate()-1);
        }
        thisDayDate.setUTCHours(24 + TIMEZONE_OFFSET, 0, 0, 0);
        return thisDayDate.getTime();
    }
    else if (autoResetPeriod.toString().endsWith("mo")) {
        /*let nmo = parseInt(autoResetPeriod.toString().substring(0, autoResetPeriod.toString().indexOf("mo")), 10);
        let thisDate = new Date();
        let nextTimeDate = new Date(thisDate.getTime());
        let nextDayDate = new Date(thisDate.getTime());
        nextDayDate.setUTCDate(nextDayDate.getDate()+1);
        let thisDateMonth = Math.ceil((thisDate.getUTCMonth()+1)/nmo);
        let nextDayMonth = Math.ceil((nextDayDate.getUTCMonth()+1)/nmo);
        let isLastDay = thisDateMonth !== nextDayMonth;
        let lastDayDate = new Date(thisDate.getTime());
        let months = [];
        for (let i=0; i<12; i++) months.push(Math.ceil((i+1)/3)*nmo);
        let lastDayMonth = months[lastDayDate.getUTCMonth()];
        if (lastDayMonth === 12) {
            lastDayDate.setUTCFullYear(lastDayDate.getUTCFullYear()+1, 0, 1);
        } else {
            lastDayDate.setUTCMonth(lastDayMonth, 0);
        }
        lastDayDate.setUTCHours(0, 0, 0, 0);
        nextTimeDate.setUTCFullYear(lastDayDate.getUTCFullYear(), lastDayDate.getUTCMonth(), lastDayDate.getUTCDate());
        if (isLastDay && thisDate.getUTCHours() >= 24 + TIMEZONE_OFFSET) {
            nextTimeDate.setUTCMonth(nextTimeDate.getUTCMonth()+1);
        }
        nextTimeDate.setUTCHours(24 + TIMEZONE_OFFSET, 0, 0, 0);
        let previousTimeDate = new Date(nextTimeDate.getTime());*/

    }
    return 0;
}

const StartOfPeriodTime = function (now, period = "daily") {
    if (period === "hourly") {
        let sop = new Date(now);
        sop.setUTCMinutes(0, 0, 0);
        return sop.getTime();
    }
    else if (period === "daily") {
        return StartOfDayTime(now);
    }
    else if (period === "monthly") {
        let sop = new Date(now - TIMEZONE_OFFSET*60*60*1000);
        sop = new Date(sop.getTime() + new Date().getTimezoneOffset()*60*1000);
        sop = getMonthStart(sop);
        sop = new Date(sop.getTime() - new Date().getTimezoneOffset()*60*1000);
        return sop.getTime() + TIMEZONE_OFFSET*60*60*1000;
    }
    else if (period === "yearly") {
        let sop = new Date(now - TIMEZONE_OFFSET*60*60*1000);
        sop = new Date(sop.getTime() + new Date().getTimezoneOffset()*60*1000);
        sop = getYearStart(sop);
        sop = new Date(sop.getTime() - new Date().getTimezoneOffset()*60*1000);
        return sop.getTime() + TIMEZONE_OFFSET*60*60*1000;
    }
}

const SamePeriod = function (reference, now, period = "daily") {
    return StartOfPeriodTime(reference, period) === StartOfPeriodTime(now, period);
}

const RemainingTime = function (milliseconds) {
    let seconds = Math.round(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    return hours + " hours, " + minutes + " minutes and " + seconds + " seconds";
}

const PrintDate = function (time, timezone = false) {
    let date = new Date(time - TIMEZONE_OFFSET*60*60*1000);
    let day = date.getUTCDate(), month = date.getUTCMonth()+1, year = date.getUTCFullYear();
    if (day.toString(10).length === 1) day = "0"+day;
    if (month.toString(10).length === 1) month = "0"+month;
    let printTimeZone = "";
    if (timezone) {
        printTimeZone = (-TIMEZONE_OFFSET) > 0 ? ("+" + TIMEZONE_OFFSET) : ("-" + Math.abs(TIMEZONE_OFFSET));
        printTimeZone = " - GMT " + printTimeZone;
    }
    return day + "/" + month + "/" + year + printTimeZone;
}

const PrintTime = function (time) {
    let date = new Date(time - TIMEZONE_OFFSET*60*60*1000);
    let hours = date.getUTCHours(), minutes = date.getUTCMinutes()+1, seconds = date.getUTCSeconds(), millis = date.getUTCMilliseconds();
    if (hours.toString(10).length === 1) hours = "0"+hours;
    if (minutes.toString(10).length === 1) minutes = "0"+minutes;
    if (seconds.toString(10).length === 1) seconds = "0"+seconds;
    if (millis.toString(10).length === 1) millis = "00"+millis;
    else if (millis.toString(10).length === 2) millis = "0"+millis;
    return hours + ":" + minutes + ":" + seconds + ":" + millis;
}

const PrintDateTime = function (time, timezone = false) {
    let date = new Date(time - TIMEZONE_OFFSET*60*60*1000);
    let day = date.getUTCDate(), month = date.getUTCMonth()+1, year = date.getUTCFullYear();
    let hours = date.getUTCHours(), minutes = date.getUTCMinutes()+1, seconds = date.getUTCSeconds(), millis = date.getUTCMilliseconds();
    if (day.toString(10).length === 1) day = "0"+day;
    if (month.toString(10).length === 1) month = "0"+month;
    if (hours.toString(10).length === 1) hours = "0"+hours;
    if (minutes.toString(10).length === 1) minutes = "0"+minutes;
    if (seconds.toString(10).length === 1) seconds = "0"+seconds;
    if (millis.toString(10).length === 1) millis = "00"+millis;
    else if (millis.toString(10).length === 2) millis = "0"+millis;
    let printTimeZone = "";
    if (timezone) {
        printTimeZone = (-TIMEZONE_OFFSET) > 0 ? ("+" + TIMEZONE_OFFSET) : ("-" + Math.abs(TIMEZONE_OFFSET));
        printTimeZone = " - GMT " + printTimeZone;
    }
    return day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds + ":" + millis + printTimeZone;
}

module.exports = {
    now: function () { return Date.now(); },
    // 5mn, 10mn, 15mn, 30mn, 1h, 6h, 12h, 1d, 1mo, 3mo, 6mo
    endOfDayTime: EndOfDayTime,
    startOfDayTime: StartOfDayTime,
    RemainingTime: RemainingTime,
    PrintDate: PrintDate,
    PrintTime: PrintTime,
    PrintDateTime: PrintDateTime,
    StartOfPeriodTime: StartOfPeriodTime,
    SamePeriod: SamePeriod
}
