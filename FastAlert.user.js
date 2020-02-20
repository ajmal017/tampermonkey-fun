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
// @require      lib/library.js
// @require      lib/client/kite.js
// @require      lib/client/investing.js
// @require      lib/sites/tv.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==
//UI Coordinates

const x = 100;
const y = 460;
const w = 20;
const xmssionKey = "fastAlert-event";
const triggerMapKey = "triggerMapKey";
const tickerMapKey = "tickerMapKey";
const gttKey = "gtt-event";
const style = "background-color: black; color: white;font-size: 15px"

//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("alert-center")) {
    alertCenter();
} else if (location.host.includes("tradingview.com")) {
    tradingView();
} else if (location.host.includes("kite.zerodha.com")) {
    kite();
}

//*************** KITE *********************
function kite() {
    //Listen for GTT Orders
    GM_addValueChangeListener(
        gttKey, (keyName, oldValue, newValue) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            if (newValue.qty > 0) {
                createOrder(newValue.symb, newValue.ltp, newValue.sl, newValue.ent, newValue.tp, newValue.qty)
            } else {
                //Qty: -1 Signal for Delete GTT
                deleteGTT(newValue.symb);
            }
        });
}

// FAST GTT
const margin = 0.005;

function createOrder(pair, ltp, sl, ent, tp, qty) {
    let d = new Date();
    let year = d.getFullYear() + 1;
    let month = d.getMonth();
    let day = d.getDate();
    let exp = `${year}-${month}-${day} 00:00:00`;
    createBuy(pair, ent, qty, ltp, exp);
    createOco(pair, sl, tp, qty, ltp, exp);

}

// Order Types
function createBuy(pair, price, qty, ltp, exp) {
    let buy_trg = generateTick(price + margin * price);
    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${buy_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"BUY","quantity":${qty},"price":${price},"order_type":"LIMIT","product":"CNC"}]&type=single&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function createOco(pair, sl_trg, tp, qty, ltp, exp) {
    let sl = generateTick(sl_trg - margin * sl_trg);

    let tp_trg = generateTick(tp - margin * tp);
    let ltp_trg = generateTick(ltp + 0.03 * ltp);

    // Choose LTP Trigger If Price to close to TP.
    if (tp_trg < ltp_trg) {
        tp_trg = ltp_trg;
    }

    let body = `condition={"exchange":"NSE","tradingsymbol":"${pair}","trigger_values":[${sl_trg},${tp_trg}],"last_price":${ltp}}&orders=[{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${sl},"order_type":"LIMIT","product":"CNC"},{"exchange":"NSE","tradingsymbol":"${pair}","transaction_type":"SELL","quantity":${qty},"price":${tp},"order_type":"LIMIT","product":"CNC"}]&type=two-leg&expires_at=${exp}`;
    //console.log(body);
    createGTT(body);
}

function generateTick(n) {
    return (Math.ceil(n * 20) / 20).toFixed(2)
}

//************** ALERT CENTER*********************
function alertCenter() {
    //Listen for Alert Page Reloads
    GM_addValueChangeListener(
        xmssionKey, () => {
            reloadPage();
        });

    //Add Auto Delete Confirmation Handler on all Delete Buttons
    $('.js-delete-btn').click(function () {
        waitClick('.js-delete');
    });

    //Map Symbol(PairId) to Trigger(Alerts) Map
    waitEE('#earningsAlerts', function () {
        loadTriggerMap();
    }, 6);

    //console.log("Reload Listner Added")
}

function loadTriggerMap() {
    let m = {};
    $(".js-alert-item[data-frequency=Once]").each(function () {
        let id = $(this).attr('data-alert-id');
        let pair = $(this).attr('data-pair-id');
        let price = $(this).attr('data-value');
        if (!m[pair]) {
            m[pair] = [];
        }
        m[pair].push({"id": id, "price": price});
        //console.log(pair,id);
    });

    let size = Object.keys(m).length;
    console.log(`Trigger Map Loaded: ${size}`);

    /* Send Event once alert Map is loaded */
    if (size > 0) {
        GM_setValue(triggerMapKey, m);
    }
}

//***************TRADING VIEW ********************
function tradingView() {
    setupFastAlertUI();

    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Listener
    waitEE(symbolSelector, function (e) {
        attributeObserver(e, onTickerChange);
    });

    //Register Trigger Change Listener
    GM_addValueChangeListener(
        triggerMapKey, (keyName, oldValue, newValue) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            onTriggersChange(newValue);
        });
}

function setupFastAlertUI() {
    //UI Elements
    var symbol = document.createElement("input");
    symbol.type = "text";
    //symbol.value="PNB";
    symbol.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 0)) + "px;right:" + y + "px;");

    var prices = document.createElement("input");
    prices.type = "text";
    //prices.value="3-875.45 907.1 989.9";
    prices.setAttribute("style", style + ";position:absolute;top:" + (x + (w * 1)) + "px;right:" + y + "px;");
    prices.onkeypress = function (e) {
        if (e.keyCode === 13) {
            setAlert();
        }
    };

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
}

// Alert Hotkeys
// TODO: Move to Hotkey Library
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
        // TODO: GTT Reset

    }
}

//Fast Alert: Set
function setAlert() {
    'use strict';

    let symb;

    //Read Symbol from Textbox or TradingView.
    if (symbol.value === "") {
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

    let input = prices.value;
    if (input) {
        //Split Alert Prices
        let split = input.trim().split(" ");

        //Search Symbol
        searchSymbol(symb, function (top) {
            message(top.name + ': ');

            //Set Alerts
            for (let p of split) {
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
}

function autoAlert() {
    //Click Settings
    $('.tv-floating-toolbar__content:nth(1) > div:nth-child(5) > div').click()

    //Select Mapped Ticker
    let symb = getMappedTicker();

    //Wait for Alert Dialogue
    waitEE('.intent-primary-1-IOYcbg-', function (e) {
        //Open Co-ordinates Tab
        waitClick('.tab-1l4dFt6c:nth-of-type(2)');

        //Read ALert value (Line Co-ordinate)
        waitEE('.innerInput-29Ku0bwF', function (i) {
            let altPrice = parseFloat(i.value);
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

function altRefresh() {
    waitOn(xmssionKey, 10000, () => {
        //-- Send message to reload AlertList
        GM_setValue(xmssionKey, Date());
    });
}

//Fast Alert: Delete
function resetAlerts() {
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        //Delete All Alerts
        deleteAllAlerts(top.pair_ID);

        altRefresh();
    });
}

function deleteAllAlerts(pairId) {
    deleteAlertLines();

    let triggers = _getTriggers(pairId);
    if (triggers) {
        //console.log(`Deleting all Alerts: ${pairId} -> ${triggers}`);
        for (let trg of triggers) {
            deleteAlert(trg);
        }
    }

    //Close Object Tree
    $('.tv-dialog__close').click();
}

function _getTriggers(pairId) {
    let m = GM_getValue(triggerMapKey);
    return m[pairId];
}

//Fast Alert: Summary
function onTriggersChange(m) {
    updateAlertSummary(m);
}

function onTickerChange() {
    //console.log('Ticker Changed');
    updateAlertSummary(GM_getValue(triggerMapKey));

}

function updateAlertSummary(m) {
    let ltp = readLtp();
    //Search Symbol
    searchSymbol(getMappedTicker(), function (top) {
        let ids = m[top.pair_ID];
        let msg = "No Alertz";
        if (ids) {
            //Alert Below Price -> Green, Above -> Red
            msg = ids.map(alt => alt.price).sort().map(p => p < ltp ? p.toString().fontcolor('green') : p.toString().fontcolor('red')).join('|');
        }
        altz.innerHTML = msg;
    });
}

//Fast Alert: GTT
function setGtt() {
    let symb;

    //Read Symbol from Textbox or TradingView.
    if (symbol.value === "") {
        symb = getTicker();
    } else {
        symb = symbol.value
    }

    let ltp = readLtp();

    //Delete GTT on ".."
    if (prices.value === "..") {
        message(`GTT Delete: ${symb}`);

        //Send Signal to Kite to place Order with Qty: -1
        GM_setValue(gttKey, {symb: symb, qty: -1});

        return;
    }

    let qty, sl, ent, tp;

    if (prices.value === "") {
        //Read from Order Panel
        order = readOrderPanel();
        qty = order.qty
        sl = order.sl
        ent = order.ent
        tp = order.tp
        closeOrderPanel();

        //console.log(`GTT ${qty}- ${sl} - ${ent} - ${tp}`);
    } else {
        //Order Format: QTY:3-SL:875.45 ENT:907.1 TP:989.9
        let qtyPrices = prices.value.trim().split("-");
        qty = parseFloat(qtyPrices[0]);
        let nextSplit = qtyPrices[1].split(" ");
        if (nextSplit.length === 3) {
            sl = parseFloat(nextSplit[0]);
            ent = parseFloat(nextSplit[1]);
            tp = parseFloat(nextSplit[2]);
        }
    }

    //Build Order and Display
    let order = {
        symb: symb,
        ltp: ltp,
        qty: qty,
        sl: sl,
        ent: ent,
        tp: tp,
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

//Fast Alert: Helpers
function getMappedTicker() {
    let symb = getTicker();
    // Use Investing Ticker if available
    let investingTicker = resolveInvestingTicker(symb);
    if (investingTicker) {
        symb = investingTicker;
    }

    //console.log(symb,investingTicker);
    return symb;
}

function mapTicker(tvTicker, investingTicker) {
    let tickerMap = GM_getValue(tickerMapKey, {});
    tickerMap[tvTicker] = investingTicker;
    GM_setValue(tickerMapKey, tickerMap);

    console.log(`Mapped Ticker: ${tvTicker} to ${investingTicker}`);
}

function resolveInvestingTicker(tvTicker) {
    let tickerMap = GM_getValue(tickerMapKey, {});
    return tickerMap[tvTicker];
}