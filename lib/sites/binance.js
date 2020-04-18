function SetupBinanceUI() {
    buildArea(areaId, '65%', '8%').appendTo('body');

    buildWrapper('aman-top').appendTo(`#${areaId}`)
        .append(buildButton("aman-order", 'Order', PlaceBinanceOrder))
}

function PlaceBinanceOrder() {
    let ticker = $("div.sc-AxjAm:nth(5)").text()

    var sl = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(1)').val());
    let entry = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(2)').val());
    var tp = parseFloat($("iframe").contents().find('input.tv-text-input:visible:nth(4)').val());
    let rr=(sl-entry)/(entry-tp);

    //Inverse Swap to handle Long/Short based on RR.
    if (rr > 1.1){
        let tmp=sl;
        sl=tp;
        tp=tmp;
    }

    // let uuid = localStorage.getItem("__bnc_uuid");
    // let csrf = localStorage.getItem("__bnc_csrf");
    //console.log(uuid, csrf, ticker, sl, entry, tp,rr);

    new BinanceOrder(ticker, sl, entry, tp).execute();
}