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

function untestednodeObserver(target, callback) {
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
