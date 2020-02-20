// ==UserScript==
// @name         FastAlert
// @namespace    aman
// @version      1.0
// @description  Fix Bad UI of Investing.com
// @author       Amanpreet Singh
// @include      https://in.tradingview.com/chart/*
// @include      https://kite.zerodha.com/*
// @include      https://in.investing.com/members-admin/alert-center*
// @include      http://www.example.net/
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==
//UI Coordinates

var x = 100;
var y = 460;
var w = 20;
const xmssionKey = "fastAlert-event";
const triggerMapKey = "triggerMapKey";
const pairMapKey = "pairMapKey";
const tickerMapKey = "tickerMapKey";
const gttKey = "gtt-event";
const style = "background-color: black; color: white;font-size: 15px"

//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("alert-center")) {
    //Listen for Alert Page Reloads
    GM_addValueChangeListener(
        xmssionKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`Received new event: ${newValue}`);
            //-- User feedback, esp useful with time delay:
            document.title = "Reloading...";
            /*-- Important:
                May need to wait 1 to 300 seconds to allow for
                alerts to get created and ]reflect.
                1222 == 1.2 seconds
            */
            window.scrollTo(0, 0);
            setTimeout(() => {
                location.reload();
            }, 3000);
        });

    //Add Auto Delete Confirmation Handler on all Delete Buttons
    $('.js-delete-btn').click(confirmDelete);

    //Map Symbol(PairId) to Trigger(Alerts) Map
    waitEE('#earningsAlerts', function (e) {
        loadTriggerMap();
    }, -3);

    //console.log("Reload Listner Added")
} else if (location.host.includes("tradingview.com")) {
    //UI Elements
    var symbol = document.createElement("input");
    symbol.type = "text";
    //symbol.value="PNB";
    symbol.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 0)) + "px;right:" + y + "px;");

    var prices = document.createElement("input");
    prices.type = "text";
    //prices.value="3-875.45 907.1 989.9";
    prices.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + y + "px;");
    prices.onkeypress = enterAlert;

    var fastGtt = document.createElement("input");
    fastGtt.type = "button";
    fastGtt.value = "GTT";
    fastGtt.onclick = setGtt;
    fastGtt.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 0)) + "px;right:" + (y + 200) + "px;");

    var fastAlert = document.createElement("input");
    fastAlert.type = "button";
    fastAlert.value = "ALT";
    fastAlert.onclick = setAlert;
    fastAlert.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + (y + 200) + "px;");

    var useTicker = document.createElement("input");
    useTicker.checked = true;
    useTicker.setAttribute('type', 'checkbox');
    useTicker.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + (y + 250) + "px;");

    var altz = document.createElement("p");
    altz.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 3)) + "px;right:" + y + "px;");

    document.body.appendChild(symbol);
    document.body.appendChild(prices);
    document.body.appendChild(fastAlert);
    document.body.appendChild(fastGtt);
    document.body.appendChild(useTicker);
    document.body.appendChild(altz);
    //document.body.appendChild(msg);
    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Lisner
    waitEE('div.title-bcHj6pEn', function (e) {
        attributeObserver(e, onTickerChange);
    });

    //Register Trigger Change Listner
    GM_addValueChangeListener(
        triggerMapKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            onTriggersChange(newValue);
        });

} else if (location.host.includes("kite.zerodha.com")) {
    //Listen for GTT Orders
    GM_addValueChangeListener(
        gttKey, (keyName, oldValue, newValue, bRmtTrggrd) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            if (newValue.qty > 0) {
                setOrder(newValue.symb, newValue.ltp, newValue.sl, newValue.ent, newValue.tp, newValue.qty)
            } else {
                //Qty: -1 Signal for Delete GTT
                deleteGTT(newValue.symb);
            }

            //Reload Orders
            //window.scrollTo(0, 0);
            //setTimeout ( () => {location.reload(); }, 3000);
        });
}

// ******************************** Alert Hotkeys ******************************************
function doc_keyDown(e) {
    //console.log(e);
    //alert(`S Pressed: ${e.altKey} | ${e.ctrlKey} | ${e.shiftKey}`);

    if (isModifierKey(e.ctrlKey, 'm', e)) {
        // Auto Alert
        autoAlert();
    }
    if (isModifierKey(e.ctrlKey, ';', e)) {
        // Alert Reset
        resetAlerts();
    }
    if (isModifierKey(e.shiftKey, ';', e)) {
        // GTT Reset

    }
}

function isModifierKey(modifier, key, e) {
    if (e.key.toLowerCase() == key && modifier) {
        e.preventDefault();
        return true;
    } else {
        return false;
    }
}


//********************************* Fast Alert ************************************************

function enterAlert(e) {
    if (e.keyCode === 13) {
        //alert('enter pressed');
        setAlert();
    }
    //console.log(e.key);
}

function setAlert() {
    'use strict';

    var symb;

    //Read Symbol from Textbox or TradingView.
    if (symbol.value == "") {
        if (useTicker.checked) {
            //Use Ticker Symbol Original or Mapped
            symb = getMappedTicker();
        } else {
            //Use Stock Name
            symb = getName();
        }
    } else {
        //Use Input Box
        symb = symbol.value
        mapTicker(getTicker(), symb);
    }

    var input = prices.value;
    if (input) {
        //Split Alert Prices
        var split = input.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (var p of split) {
                createAlert(top.pair_ID, p);
            }

            waitOn(xmssionKey, 10000, () => {
                //-- Send message to reload AlertList
                GM_setValue(xmssionKey, Date());

                symbol.value = "";
                prices.value = "";
            });
        });
    }
};

function resetAlerts() {
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        //Delete All Alerts
        deleteAllAlerts(top.pair_ID);

        altRefresh();
    });
}

function altRefresh() {
    waitOn(xmssionKey, 10000, () => {
        //-- Send message to reload AlertList
        GM_setValue(xmssionKey, Date());
    });
}

function onTriggersChange(m) {
    updateAlertSummary(m);
}

function onTickerChange() {
    //console.log('Ticker Changed');
    updateAlertSummary(GM_getValue(triggerMapKey));

}

function updateAlertSummary(m) {
    var ltp = readLtp();
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        var ids = m[top.pair_ID];
        var msg = "No Alertz";
        if (ids) {
            //Alert Below Price -> Green, Above -> Red
            msg = ids.map(alt => alt.price).sort().map(p => p < ltp ? p.toString().fontcolor('green') : p.toString().fontcolor('red')).join('|');
        }
        altz.innerHTML = msg;
    });
}

function getTicker() {
    return $('.input-3lfOzLDc').val();
}

function getMappedTicker() {
    var symb = getTicker();
    // Use Investing Ticker if available
    var investingTicker = resolveInvestingTicker(symb);
    if (investingTicker) {
        symb = investingTicker;
    }

    //console.log(symb,investingTicker);
    return symb;
}

function getName() {
    return $(".dl-header-symbol-desc")[0].innerHTML;
}

function mapTicker(tvTicker, investingTicker) {
    var tickerMap = GM_getValue(tickerMapKey, {});
    tickerMap[tvTicker] = investingTicker;
    GM_setValue(tickerMapKey, tickerMap);

    console.log(`Mapped Ticker: ${tvTicker} to ${investingTicker}`);
}

function resolveInvestingTicker(tvTicker) {
    var tickerMap = GM_getValue(tickerMapKey, {});
    return tickerMap[tvTicker];
}

function autoAlert() {
    //Click Settings
    $('.tv-floating-toolbar__content:nth(1) > div:nth-child(5) > div').click()

    //Select Mapped Ticker
    var symb = getMappedTicker();
    var ltp = readLtp();


    waitEE('.intent-primary-1-IOYcbg-', function (e) {
        //Open Co-ordinates
        waitClick('.tab-1l4dFt6c:nth-of-type(2)');

        //Read ALert value (Line Co-ordinate)
        waitEE('.innerInput-29Ku0bwF', function (i) {
            var altPrice = parseFloat(i.value);
            //console.log(symb,altPrice,ltp);

            //Close Alert Dialogue
            $(e).click();
            //TODO: Remove if many errors
            waitClick('.close-3NTwKnT_');

            //Search Symbol
            searchSymbol(symb, function (top) {
                createAlert(top.pair_ID, altPrice);
                altRefresh();
            });
        });
    });
}


function readLtp() {
    return parseFloat($('.dl-header-price').text());
}


function setGtt() {
    var symb;

    //Read Symbol from Textbox or TradingView.
    if (symbol.value == "") {
        symb = getTicker();
    } else {
        symb = symbol.value
    }

    var ltp = readLtp();

    //Delete GTT on ".."
    if (prices.value == "..") {
        message(`GTT Delete: ${symb}`);

        //Send Signal to Kite to place Order with Qty: -1
        GM_setValue(gttKey, {symb: symb, qty: -1});

        return;
    }

    var qty, sl, ent, tp;

    if (prices.value == "") {
        //Read from Order Panel
        qty = parseFloat($('.units-3uGpy-z- input').val());
        sl = parseFloat($('.group-2UNHLSVG input:nth(4)').val());
        ent = parseFloat($('.group-2UNHLSVG input:nth(0)').val());
        tp = parseFloat($('.group-2UNHLSVG input:nth(2)').val());

        //Close Order Panel
        $('.close-2XGlFxM0').click();

        //console.log(`GTT ${qty}- ${sl} - ${ent} - ${tp}`);
    } else {
        //Order Format: QTY:3-SL:875.45 ENT:907.1 TP:989.9
        var qtyPrices = prices.value.trim().split("-");
        qty = parseFloat(qtyPrices[0]);
        var nextSplit = qtyPrices[1].split(" ");
        if (nextSplit.length == 3) {
            sl = parseFloat(nextSplit[0]);
            ent = parseFloat(nextSplit[1]);
            tp = parseFloat(nextSplit[2]);
        }
    }

    //Build Order and Display
    var order = {
        symb: symb,
        ltp: ltp,
        qty: qty,
        sl: sl,
        ent: ent,
        tp: tp,
        qty: qty
    };
    message(`${symb} (${ltp}) Qty: ${qty}, ${sl} - ${ent} - ${tp}`);

    //If Valid Order Send else Alert
    if (qty > 0 && sl > 0 && ent > 0 && tp > 0) {
        //Send Signal to Kite to place Order.
        GM_setValue(gttKey, order);
    } else {
        alert("Invalid GTT Input");
    }
}

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


//********************* Alerts Fast Delete *************************

function confirmDelete() {
    waitClick('.js-delete');
}

function loadTriggerMap() {
    var m = {};
    $(".js-alert-item[data-frequency=Once]").each(function () {
        var id = $(this).attr('data-alert-id');
        var pair = $(this).attr('data-pair-id');
        var price = $(this).attr('data-value');
        if (!m[pair]) {
            m[pair] = [];
        }
        m[pair].push({"id": id, "price": price});
        //console.log(pair,id);
    });

    //console.log(m);
    var size = Object.keys(m).length;
    console.log(`Trigger Map Loaded: ${size}`);
    if (size > 0) {
        GM_setValue(triggerMapKey, m);
    }
}

function deleteAllAlerts(pairId) {
    //Delete Alert Lines
    $('#drawing-toolbar-object-tree').click();
    waitEE('.tv-objects-tree-item__title', function () {
        $('.tv-objects-tree-item__title:contains("Horizontal Line")').parent().find('.js-remove-btn').click();
    });

    var m = GM_getValue(triggerMapKey);
    var ids = m[pairId];
    if (ids) {
        //console.log(`Deleting all Alerts: ${pairId} -> ${ids}`);
        for (var id of ids) {
            deleteAlert(id);
        }
    }
    $('.tv-dialog__close').click();
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


//*************************** Fast GTT *********************************************
const margin = 0.005;

function setOrder(pair, ltp, sl, ent, tp, qty) {
    var d = new Date();
    var year = d.getFullYear() + 1;
    var month = d.getMonth();
    var day = d.getDate();
    var exp = `${year}-${month}-${day} 00:00:00`;
    createBuy(pair, ent, qty, ltp, exp);
    createOco(pair, sl, tp, qty, ltp, exp);

}

function createBuy(pair, price, qty, ltp, exp) {
    var buy_trg = generateTick(price + margin * price);
    var body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buy_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function createOco(pair, sl_trg, tp, qty, ltp, exp) {
    var sl = generateTick(sl_trg - margin * sl_trg);

    var tp_trg = generateTick(tp - margin * tp);
    var ltp_trg = generateTick(ltp + 0.03 * ltp);

    // Choose LTP Trigger If Price to close to TP.
    if (tp_trg < ltp_trg) {
        tp_trg = ltp_trg;
    }

    var body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${sl_trg},${tp_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function createGTT(body) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + JSON.parse(localStorage.getItem("__storejs_kite_enctoken"))
        },
        url: "https://kite.zerodha.com/oms/gtt/triggers",
        data: encodeURI(body),
        method: "POST",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                //console.log('GTT Created');
            } else {
                alert('Error Creating Alert: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            console.log('Error Making Request: ' + response.statusText);
        }
    });
}

function deleteGTT(symbol) {
    var triggers = $(".gtt-list-section tr").filter(function () {
        var $this = $(this);
        var status = $this.find("td.status span span").text();
        var quantity = $this.find("td.quantity span").text();
        var sym = $this.find("span.tradingsymbol span").text();
        if (status == "ACTIVE" && sym == symbol) {
            //console.log(symbol,'->',quantity);
            return true;
        }
    }).map(function () {
        return $(this).attr('data-uid')
    });

    //console.log(`Delete GTT: ${symbol} -> ${triggers.length}`);

    if (triggers.length == 0) {
        message(`No Triggers Found for ${symbol}`);
    } else if (triggers.length > 2) {
        message(`Multiple Triggers<br/> found for ${symbol} can't delete: ${triggers.length}`);
    } else {
        for (var id of triggers) {
            deleteTrigger(id);
        }
    }
}

function deleteTrigger(id) {
    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "X-Kite-Version": "2.4.0",
            "Authorization": "enctoken " + JSON.parse(localStorage.getItem("__storejs_kite_enctoken")),
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
        },
        url: "https://kite.zerodha.com/oms/gtt/triggers/" + id,
        method: "DELETE",
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                message('Trigger Deleted ->' + id);
            } else {
                alert('Error Deleting Trigger: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
            }
        },
        onerror: function (response) {
            alert('Error Deleting Trigger: (' + this.status + ' ' + this.statusText + '): ' + this.responseText);
        }
    });
}


function generateTick(n) {
    return (Math.ceil(n * 20) / 20).toFixed(2)
}


//****************** LIBRARY ****************************
//WaitUntilElementExists
function waitClick(selector) {
    waitEE(selector, (e) => e.click());
}

function waitEE(selector, callback, count = 0) {
    const el = document.querySelector(selector);

    if (el) {
        return callback(el);
    }

    if (count < 3) {
        setTimeout(() => waitEE(selector, callback, count + 1), 2000);
    } else {
        console.log("Wait Element Failed, exiting Recursion: " + selector);
    }
}

function message(msg) {
    //Find
    var el = document.getElementById("el-msg");
    if (!el) {
        //Build
        el = document.createElement("div");
        el.id = "el-msg";
        el.setAttribute("style", "background-color: black; color: white;font-size: 15px; position:absolute;top:20%;left:76%");
        el.innerHTML = "";

        //Remove after timeout
        setTimeout(function () {
            el.parentNode.removeChild(el);
        }, 5000);

        document.body.appendChild(el);
    }

    el.innerHTML += '<br/>' + msg;

}

function waitOn(id, timeout, callback) {
    //Find
    var el = document.getElementById("el-msg-" + id);
    if (!el) {
        //Build
        el = document.createElement("div");
        el.id = id;

        //Remove after timeout
        setTimeout(function () {
            el.parentNode.removeChild(el);
            //console.log('WaitOn Finished: '+ id);
            callback();
        }, timeout);

        document.body.appendChild(el);
    }
}

function attributeObserver(target, callback) {
    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
        //console.log(mutations);
        if (mutations.length > 0) {
            callback();
        }
    });

    // Configuration of the observer:
    var config = {
        subtree: true,
        attributes: true,
        characterData: true
    };

    // Pass in the target node, as well as the observer options
    observer.observe(target, config);
}

function nodeObserver(target, callback) {
    // Create an observer instance
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            //console.log(mutation);

            var newNodes = mutation.addedNodes; // DOM NodeList
            if (newNodes !== null) { // If there are new nodes added
                $(newNodes).each(function () {
                    var $node = $(this);
                    console.log($node);
                });
            }
        });
    });

    // Configuration of the observer:
    var config = {
        subtree: true,
        childList: true,
    };

    // Pass in the target node, as well as the observer options
    observer.observe(target, config);

    // Later, you can stop observing
    //observer.disconnect();
}
