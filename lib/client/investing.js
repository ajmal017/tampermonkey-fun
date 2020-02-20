/* Constants */
const pairMapKey = "pairMapKey";

/* Public Methods */
function createAlert(pair_ID, price) {
    //Auto Decide over under with ltp
    var ltp = readLtp();
    var threshold = price > ltp ? 'over' : 'under';

    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: "https://in.investing.com/useralerts/service/create",
        data: "alertType=instrument&alertParams%5Balert_trigger%5D=price&alertParams%5Bpair_ID%5D=" + pair_ID + "&alertParams%5Bthreshold%5D=" + threshold + "&alertParams%5Bfrequency%5D=Once&alertParams%5Bvalue%5D=" + price + "&alertParams%5Bplatform%5D=desktopAlertsCenter&alertParams%5Bemail_alert%5D=Yes",
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message(threshold + '->' + price);
                console.log('Alert Created: ' + pair_ID + ',' + price + ',' + threshold);
            } else {
                alert('Error Creating Alert: ' + pair_ID + ' (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Creating Alert: ' + pair_ID + ' : ' + response.statusText);
        }
    });
}

function deleteAlert(alert) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest"
        },
        url: "https://in.investing.com/useralerts/service/delete",
        data: `alertType=instrument&alertParams%5Balert_ID%5D=${alert.id}&alertParams%5Bplatform%5D=desktop`,
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message('Delete ->' + alert.price);
                //console.log('Alert Deleted: ' + alert.id);
            } else {
                alert('Error Deleting Alert: ' + alert.id);
            }
        },
        onerror: function (response) {
            alert('Error Deleting Alert: ' + alert.id);
        }
    });
}

function searchSymbol(symb, callback) {
    var m = GM_getValue(pairMapKey);
    //Init m If not preset
    m = m ? m : {};

    //Try for a Cache Hit
    if (m[symb]) {
        var top = m[symb];
        //console.log(`Cache Hit ${symb}-> ${top.name} ${top.pair_ID}`);
        callback(top);
    } else {
        //Call and fill cache

        GM.xmlHttpRequest({
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "Accept-Language": "en-US,en;q=0.5",
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest"
            },
            url: "https://in.investing.com/search/service/search?searchType=alertCenterInstruments",
            data: "search_text=" + symb + "&term=" + symb + "&country_id=0&tab_id=All",
            method: "POST",
            onload: function (response) {
                if (response.status >= 200 && response.status < 400) {
                    var r = JSON.parse(response.responseText);
                    //If Found
                    if (r.All.length > 0) {
                        //Select Top Result
                        var top = r.All[0]
                        //console.log(top);

                        //Cache Top
                        var cacheTop = {name: top.name, pair_ID: top.pair_ID};
                        m[symb] = cacheTop;
                        GM_setValue(pairMapKey, m);
                        callback(cacheTop);
                    } else {
                        symbol.value = symb;
                        alert("No Results Found: " + symb);
                    }
                } else {
                    alert('Error doing Symbol Search: ' + symb + ' (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
                }
            },
            onerror: function (response) {
                alert('Error doing Symbol Search: ' + symb + ' : ' + response.statusText);
            }
        });
    }
}