// ==UserScript==
// @name         FastAlert
// @namespace    aman
// @version      1.0
// @description  Fix Bad UI of Investing.com
// @author       Amanpreet Singh
// @match       https://in.tradingview.com/chart*
// @match       https://kite.zerodha.com/*
// @match       https://in.investing.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @require      lib/library.js
// @require      lib/constants.js
// @require      lib/ui.js
// @require      lib/client/kite.js
// @require      lib/client/investing.js
// @require      lib/sites/tv.js
// @require      lib/sites/investing.js
// @require      lib/sites/kite.js
// @require      lib/sites/hotkeys.js
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @run-at document-end
// ==/UserScript==
//UI Coordinates

//-- Are we on the "interactive" page/site/domain or the "monitoring" one?
if (location.pathname.includes("alert-center")) {
    alertCenter();
} else if (location.pathname.includes("equities")) {
    equities();
} else if (location.host.includes("tradingview.com")) {
    tradingView();
} else if (location.pathname.includes("alerts-feed")) {
    alertFeed();
} else if (location.host.includes("kite.zerodha.com")) {
    kite();
}

//*************** KITE *********************
function kite() {
    //Listen for GTT Orders
    GM_addValueChangeListener(
        gttRequest, (keyName, oldValue, newValue) => {
            //console.log (`Received new GTT Order: ${newValue}`);
            if (newValue.qty > 0) {
                createOrder(newValue.symb, newValue.ltp, newValue.sl, newValue.ent, newValue.tp, newValue.qty)
            } else if (newValue.id) {
                //Qty: Request has Id Signal for Delete GTT
                deleteGtt(newValue.id);
            }
        });

    //Load GttMap && Add Listner on GTT Tab Refresh
    waitJEE('.router-link-exact-active', ($e) => {
        //Timeout required for Table To Render after Tab Click
        $e.click(() => setTimeout(buildGttMap, 1000));
    })
}

//************** Investing *********************
function alertCenter() {
    //To PreventDouble Load in Iframes
    if (this.tab_id) { //Listen for Request to Get Alert Details
        GM_addValueChangeListener(alertRequestKey, (keyName, oldValue, newValue) => {
            // console.log('Alert request', newValue);
            getAlerts(newValue.id, GM_getValue(tokenChangedEvent), (alrts) => {
                // console.log('Alert Fetched', alrts);
                GM_setValue(alertResponseKey, {data: getTriggers(alrts), date: new Date()});
            })
        });

        //Add Auto Delete Confirmation Handler on all Delete Buttons
        $('.js-delete-btn').click(function () {
            waitClick('.js-delete');
        });

        console.log("AlertCenter Listners Added")
    }
}

function equities() {
    //Wait For Alert Bell
    waitEE('.add-alert-bell-button', () => {
        captureToken();

        // getAlerts(17984, GM_getValue(tokenKey), (alrts) => {
        //     console.log(getTriggers(alrts));
        // })
    });
}

//***************TRADING VIEW ********************

function tradingView() {
    setupFastAlertUI();
    loadTradingViewVars();

    document.addEventListener('keydown', doc_keyDown, false);

    //Register Ticker Change Listener
    //Using Seprate Selector as nameSelector has attribute changes in paint Name.
    waitEE(".dl-header-symbol-desc", function (e) {
        nodeObserver(e, onTickerChange);
    });

    //Register Alert Response Listener (After Alert Details Fetched)
    GM_addValueChangeListener(
        alertResponseKey, (keyName, oldValue, newValue) => {
            alertSummary(newValue.data);
        });

    //Listen for Alert Clicks in AlertFeed
    GM_addValueChangeListener(
        alertClickedEvent, (keyName, oldValue, newValue,) => {
            //Required for proper alert Opening
            openTicker('DHFL'); // DO NOT REMOVE DHFL Line
            let m = buildNameMap();
            let ticker = m[newValue];
            if (ticker) {
                openTicker(ticker);
            } else {
                //Open Using Name if Ticker Unavailable
                openTicker(newValue);
            }
        });

    //Listen for Gtt Order Changes
    GM_addValueChangeListener(
        gttMapStore, (keyName, oldValue, newValue,) => {
            gttSummary(newValue);
        });

    //Wait for Title to Load and Fix to Signal Auto Hotkey
    waitEE("title", (el) => {
        //console.log('Observing Title: ' + el.innerHTML);
        nodeObserver(el, fixTitle);
    });

    //Onload TV WatchList Paint
    waitEE(`${watchListSelector} > div`, (el) => {
        //Ensure Repaint on scroll, add/remove to WatchList
        nodeObserver(el, onWatchListChange);

        //Ensure Repaint on Screener Changes
        message("Trying Screener Hook".fontcolor("yellow"));
        waitJEE(screenerSelector, (el) => {
            nodeObserver(el.get(0), onWatchListChange);

            message("Screener Hooked".fontcolor("green"));
        }, 10);

        //Paint WatchList, Screener etc
        onWatchListChange();

        // Load Alerts
        sendAlertRequest();

        //Missing FNO's Logging
        logMissingFno();
    }, 10);

    //Run AutoSave Cron
    setInterval(autoSave, 2* 60 * 1000);
}

